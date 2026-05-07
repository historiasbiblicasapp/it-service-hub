import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, FileText, Plus } from "lucide-react";

type PaidBill = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  payment_date: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const PaidBillsPage = () => {
  const [bills, setBills] = useState<PaidBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaidBill | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("paid_bills")
      .select("*")
      .order("payment_date", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    else setBills((data as PaidBill[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditing(null);
    setDescription("");
    setCategory("");
    setAmount("");
    setPaymentDate(todayISO());
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (b: PaidBill) => {
    setEditing(b);
    setDescription(b.description);
    setCategory(b.category || "");
    setAmount(String(b.amount));
    setPaymentDate(b.payment_date);
    setOpen(true);
  };

  const save = async () => {
    if (!description.trim() || !amount || !paymentDate) {
      toast({ title: "Preencha descrição, valor e data", variant: "destructive" });
      return;
    }
    const payload = {
      description: description.trim(),
      category: category.trim() || null,
      amount: parseFloat(amount),
      payment_date: paymentDate,
    };
    const { error } = editing
      ? await supabase.from("paid_bills").update(payload).eq("id", editing.id)
      : await supabase.from("paid_bills").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Conta atualizada" : "Conta registrada" });
    setOpen(false);
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await supabase.from("paid_bills").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Excluído" });
      load();
    }
  };

  const filtered = bills.filter((b) => {
    if (filterStart && b.payment_date < filterStart) return false;
    if (filterEnd && b.payment_date > filterEnd) return false;
    return true;
  });

  const total = filtered.reduce((s, b) => s + Number(b.amount), 0);
  const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

  const generateReport = () => {
    const header = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = filtered.map((b) => [
      fmtDate(b.payment_date),
      `"${b.description.replace(/"/g, '""')}"`,
      `"${(b.category || "").replace(/"/g, '""')}"`,
      Number(b.amount).toFixed(2).replace(".", ","),
    ]);
    const csv = [header.join(";"), ...rows.map((r) => r.join(";")), "", `Total;;;${total.toFixed(2).replace(".", ",")}`].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contas-pagas-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Contas Pagas</h1>
          <p className="text-muted-foreground text-sm">
            Anotação à parte de boletos e impostos pagos. Não afeta o financeiro.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar conta" : "Nova conta paga"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Boleto luz" />
              </div>
              <div>
                <Label>Categoria (opcional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Boleto, Imposto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Data do pagamento</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Relatório</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>De</Label>
            <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => { setFilterStart(""); setFilterEnd(""); }}>Limpar</Button>
          <Button onClick={generateReport}><FileText className="w-4 h-4" /> Gerar CSV</Button>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Total no período</div>
            <div className="text-xl font-bold">{fmtMoney(total)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{fmtDate(b.payment_date)}</TableCell>
                    <TableCell>{b.description}</TableCell>
                    <TableCell>{b.category || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(b.amount))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaidBillsPage;
