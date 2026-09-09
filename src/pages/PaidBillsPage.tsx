import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, FileText, Plus, BellRing, Check } from "lucide-react";

type DeductFrom = "none" | "saldo" | "propria";

type PaidBill = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  payment_date: string | null;
  due_date: string | null;
  paid: boolean;
  deduct_from: DeductFrom;
  installment_group: string | null;
  installment_number: number;
  installment_total: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const addMonths = (iso: string, months: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(d, lastDay));
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${base.getFullYear()}-${mm}-${dd}`;
};

const deductLabel: Record<DeductFrom, string> = {
  none: "Não afeta saldo",
  saldo: "Saldo do financeiro",
  propria: "Conta própria",
};

const PaidBillsPage = () => {
  const [bills, setBills] = useState<PaidBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaidBill | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [deductFrom, setDeductFrom] = useState<DeductFrom>("none");
  const [installments, setInstallments] = useState("1");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("paid_bills")
      .select("*")
      .order("due_date", { ascending: false, nullsFirst: false })
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
    setPaid(true);
    setPaymentDate(todayISO());
    setDueDate(todayISO());
    setDeductFrom("none");
    setInstallments("1");
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
    setPaid(b.paid);
    setPaymentDate(b.payment_date || todayISO());
    setDueDate(b.due_date || b.payment_date || todayISO());
    setDeductFrom(b.deduct_from);
    setInstallments("1");
    setOpen(true);
  };

  const save = async () => {
    const value = parseFloat(amount);
    if (!description.trim() || !amount || Number.isNaN(value) || !dueDate) {
      toast({ title: "Preencha descrição, valor e vencimento", variant: "destructive" });
      return;
    }
    const n = Math.max(1, Math.min(60, parseInt(installments || "1", 10) || 1));

    if (editing) {
      const { error } = await supabase
        .from("paid_bills")
        .update({
          description: description.trim(),
          category: category.trim() || null,
          amount: value,
          paid,
          payment_date: paid ? paymentDate : null,
          due_date: dueDate,
          deduct_from: deductFrom,
        })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Conta atualizada" });
    } else {
      const groupId = n > 1 ? crypto.randomUUID() : null;
      const rows = Array.from({ length: n }, (_, i) => ({
        description: n > 1 ? `${description.trim()} (${i + 1}/${n})` : description.trim(),
        category: category.trim() || null,
        amount: value,
        paid: i === 0 ? paid : false,
        payment_date: i === 0 && paid ? paymentDate : null,
        due_date: addMonths(dueDate, i),
        deduct_from: deductFrom,
        installment_group: groupId,
        installment_number: i + 1,
        installment_total: n,
      }));
      const { error } = await supabase.from("paid_bills").insert(rows);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: n > 1 ? `${n} parcelas registradas` : "Conta registrada" });
    }
    setOpen(false);
    reset();
    load();
  };

  const markPaid = async (b: PaidBill) => {
    const { error } = await supabase
      .from("paid_bills")
      .update({ paid: true, payment_date: todayISO() })
      .eq("id", b.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Conta marcada como paga" });
      load();
    }
  };

  const remove = async (b: PaidBill) => {
    if (b.installment_group && confirm("Excluir TODAS as parcelas deste lançamento? Cancele para excluir só esta.")) {
      const { error } = await supabase.from("paid_bills").delete().eq("installment_group", b.installment_group);
      if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Parcelas excluídas" });
        load();
      }
      return;
    }
    if (!confirm("Excluir este registro?")) return;
    const { error } = await supabase.from("paid_bills").delete().eq("id", b.id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Excluído" });
      load();
    }
  };

  const refDate = (b: PaidBill) => b.due_date || b.payment_date || "";

  const filtered = bills.filter((b) => {
    const d = refDate(b);
    if (filterStart && d < filterStart) return false;
    if (filterEnd && d > filterEnd) return false;
    if (statusFilter === "paid" && !b.paid) return false;
    if (statusFilter === "pending" && b.paid) return false;
    return true;
  });

  const totalPaid = filtered.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const totalPending = filtered.filter((b) => !b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const totalFromBalance = filtered
    .filter((b) => b.paid && b.deduct_from !== "none")
    .reduce((s, b) => s + Number(b.amount), 0);

  const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-");

  const alerts = useMemo(() => {
    const limit = addMonths(todayISO(), 0);
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const soonISO = soon.toISOString().slice(0, 10);
    return bills
      .filter((b) => !b.paid && b.due_date && b.due_date <= soonISO)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .map((b) => ({ bill: b, overdue: b.due_date! < limit }));
  }, [bills]);

  const generateReport = () => {
    const header = ["Vencimento", "Pagamento", "Descrição", "Categoria", "Origem", "Situação", "Valor"];
    const rows = filtered.map((b) => [
      fmtDate(b.due_date),
      fmtDate(b.payment_date),
      `"${b.description.replace(/"/g, '""')}"`,
      `"${(b.category || "").replace(/"/g, '""')}"`,
      deductLabel[b.deduct_from],
      b.paid ? "Paga" : "Pendente",
      Number(b.amount).toFixed(2).replace(".", ","),
    ]);
    const csv = [
      header.join(";"),
      ...rows.map((r) => r.join(";")),
      "",
      `Total pago;;;;;;${totalPaid.toFixed(2).replace(".", ",")}`,
      `Total pendente;;;;;;${totalPending.toFixed(2).replace(".", ",")}`,
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contas-pagas-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Contas Pagas</h1>
          <p className="text-muted-foreground text-sm">
            Anotação à parte de boletos, impostos e parcelas. Só afeta o saldo se você escolher a origem do valor.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova conta</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
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
                  <Label>{editing ? "Valor (R$)" : "Valor da parcela (R$)"}</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              {!editing && (
                <div>
                  <Label>Número de parcelas (1 a 60)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada parcela é criada com vencimento mês a mês a partir da data acima.
                  </p>
                </div>
              )}
              <div>
                <Label>De onde sai o valor</Label>
                <Select value={deductFrom} onValueChange={(v) => setDeductFrom(v as DeductFrom)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não afeta saldo (apenas anotação)</SelectItem>
                    <SelectItem value="saldo">Tirar do saldo do financeiro</SelectItem>
                    <SelectItem value="propria">Conta própria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Situação</Label>
                  <Select value={paid ? "paid" : "pending"} onValueChange={(v) => setPaid(v === "paid")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paga</SelectItem>
                      <SelectItem value="pending">A pagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paid && (
                  <div>
                    <Label>Data do pagamento</Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BellRing className="w-4 h-4 text-destructive" /> Avisos de vencimento ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map(({ bill, overdue }) => (
              <div key={bill.id} className="flex items-center gap-3 flex-wrap text-sm border rounded-md p-2">
                <Badge variant={overdue ? "destructive" : "secondary"}>{overdue ? "Vencida" : "A vencer"}</Badge>
                <span className="font-medium">{bill.description}</span>
                <span className="text-muted-foreground">venc. {fmtDate(bill.due_date)}</span>
                <span className="font-semibold">{fmtMoney(Number(bill.amount))}</span>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => markPaid(bill)}>
                  <Check className="w-4 h-4" /> Marcar paga
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
          <div className="min-w-[150px]">
            <Label>Situação</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="pending">A pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setFilterStart(""); setFilterEnd(""); setStatusFilter("all"); }}>Limpar</Button>
          <Button onClick={generateReport}><FileText className="w-4 h-4" /> Gerar CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Total pago</div>
          <div className="text-xl font-bold">{fmtMoney(totalPaid)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Total a pagar</div>
          <div className="text-xl font-bold text-destructive">{fmtMoney(totalPending)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Pago com saldo / conta própria</div>
          <div className="text-xl font-bold">{fmtMoney(totalFromBalance)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{fmtDate(b.due_date)}</TableCell>
                    <TableCell>{b.description}</TableCell>
                    <TableCell>{b.category || "-"}</TableCell>
                    <TableCell className="text-xs">{deductLabel[b.deduct_from]}</TableCell>
                    <TableCell>
                      <Badge variant={b.paid ? "secondary" : "destructive"}>{b.paid ? "Paga" : "A pagar"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(b.amount))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!b.paid && (
                          <Button size="icon" variant="ghost" onClick={() => markPaid(b)}><Check className="w-4 h-4" /></Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(b)}><Trash2 className="w-4 h-4" /></Button>
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
