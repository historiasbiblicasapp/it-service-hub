import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, ArrowDownCircle, TrendingUp } from "lucide-react";

type Investment = {
  id: string;
  investment_date: string;
  description: string | null;
  amount: number;
  rate_percent: number;
  expected_return: number;
};

type Withdrawal = {
  id: string;
  investment_id: string;
  withdrawal_date: string;
  amount: number;
  notes: string | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

const InvestmentsPage = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // investment form
  const [invOpen, setInvOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [invDate, setInvDate] = useState(todayISO());
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invRate, setInvRate] = useState("");
  const [invReturn, setInvReturn] = useState("");

  // withdrawal form
  const [wOpen, setWOpen] = useState(false);
  const [editingW, setEditingW] = useState<Withdrawal | null>(null);
  const [wInvestmentId, setWInvestmentId] = useState("");
  const [wDate, setWDate] = useState(todayISO());
  const [wAmount, setWAmount] = useState("");
  const [wNotes, setWNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const [inv, wd] = await Promise.all([
      supabase.from("investments").select("*").order("investment_date", { ascending: false }),
      supabase.from("investment_withdrawals").select("*").order("withdrawal_date", { ascending: false }),
    ]);
    if (inv.error || wd.error) {
      toast({ title: "Erro ao carregar", description: (inv.error || wd.error)?.message, variant: "destructive" });
    } else {
      setInvestments((inv.data as Investment[]) || []);
      setWithdrawals((wd.data as Withdrawal[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // auto-calculate expected return from rate
  const onRateChange = (value: string) => {
    setInvRate(value);
    const base = parseFloat(invAmount);
    const rate = parseFloat(value);
    if (!isNaN(base) && !isNaN(rate)) setInvReturn(((base * rate) / 100).toFixed(2));
  };

  const onAmountChange = (value: string) => {
    setInvAmount(value);
    const base = parseFloat(value);
    const rate = parseFloat(invRate);
    if (!isNaN(base) && !isNaN(rate)) setInvReturn(((base * rate) / 100).toFixed(2));
  };

  const resetInv = () => {
    setEditingInv(null);
    setInvDate(todayISO());
    setInvDesc("");
    setInvAmount("");
    setInvRate("");
    setInvReturn("");
  };

  const openNewInv = () => {
    resetInv();
    setInvOpen(true);
  };

  const openEditInv = (i: Investment) => {
    setEditingInv(i);
    setInvDate(i.investment_date);
    setInvDesc(i.description || "");
    setInvAmount(String(i.amount));
    setInvRate(String(i.rate_percent));
    setInvReturn(String(i.expected_return));
    setInvOpen(true);
  };

  const saveInv = async () => {
    if (!invDate || !invAmount) {
      toast({ title: "Informe a data e o valor investido", variant: "destructive" });
      return;
    }
    const payload = {
      investment_date: invDate,
      description: invDesc.trim() || null,
      amount: parseFloat(invAmount),
      rate_percent: invRate ? parseFloat(invRate) : 0,
      expected_return: invReturn ? parseFloat(invReturn) : 0,
    };
    const { error } = editingInv
      ? await supabase.from("investments").update(payload).eq("id", editingInv.id)
      : await supabase.from("investments").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingInv ? "Investimento atualizado" : "Investimento salvo" });
    setInvOpen(false);
    resetInv();
    load();
  };

  const removeInv = async (id: string) => {
    if (!confirm("Excluir este investimento e suas retiradas?")) return;
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Investimento excluído" });
      load();
    }
  };

  const resetW = () => {
    setEditingW(null);
    setWInvestmentId(investments[0]?.id || "");
    setWDate(todayISO());
    setWAmount("");
    setWNotes("");
  };

  const openNewW = (investmentId?: string) => {
    resetW();
    if (investmentId) setWInvestmentId(investmentId);
    setWOpen(true);
  };

  const openEditW = (w: Withdrawal) => {
    setEditingW(w);
    setWInvestmentId(w.investment_id);
    setWDate(w.withdrawal_date);
    setWAmount(String(w.amount));
    setWNotes(w.notes || "");
    setWOpen(true);
  };

  const saveW = async () => {
    if (!wInvestmentId || !wDate || !wAmount) {
      toast({ title: "Informe o investimento, a data e o valor", variant: "destructive" });
      return;
    }
    const payload = {
      investment_id: wInvestmentId,
      withdrawal_date: wDate,
      amount: parseFloat(wAmount),
      notes: wNotes.trim() || null,
    };
    const { error } = editingW
      ? await supabase.from("investment_withdrawals").update(payload).eq("id", editingW.id)
      : await supabase.from("investment_withdrawals").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingW ? "Retirada atualizada" : "Retirada lançada" });
    setWOpen(false);
    resetW();
    load();
  };

  const removeW = async (id: string) => {
    if (!confirm("Excluir esta retirada?")) return;
    const { error } = await supabase.from("investment_withdrawals").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Retirada excluída" });
      load();
    }
  };

  const totals = useMemo(() => {
    const invested = investments.reduce((s, i) => s + Number(i.amount), 0);
    const expected = investments.reduce((s, i) => s + Number(i.expected_return), 0);
    const withdrawn = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
    return { invested, expected, withdrawn, balance: invested + expected - withdrawn };
  }, [investments, withdrawals]);

  const withdrawnByInvestment = useMemo(() => {
    const map: Record<string, number> = {};
    withdrawals.forEach((w) => {
      map[w.investment_id] = (map[w.investment_id] || 0) + Number(w.amount);
    });
    return map;
  }, [withdrawals]);

  const invLabel = (id: string) => {
    const i = investments.find((x) => x.id === id);
    return i ? `${fmtDate(i.investment_date)} — ${fmtMoney(Number(i.amount))}${i.description ? ` (${i.description})` : ""}` : "-";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Investimento</h1>
          <p className="text-muted-foreground text-sm">Registre seus investimentos, o rendimento previsto e as retiradas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNewW()} disabled={investments.length === 0}>
            <ArrowDownCircle className="w-4 h-4" /> Nova retirada
          </Button>
          <Button onClick={openNewInv}>
            <Plus className="w-4 h-4" /> Novo investimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total investido</CardTitle></CardHeader>
          <CardContent className="text-lg md:text-xl font-bold">{fmtMoney(totals.invested)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Rendimento previsto</CardTitle></CardHeader>
          <CardContent className="text-lg md:text-xl font-bold text-primary">{fmtMoney(totals.expected)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total retirado</CardTitle></CardHeader>
          <CardContent className="text-lg md:text-xl font-bold text-destructive">{fmtMoney(totals.withdrawn)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Saldo estimado</CardTitle></CardHeader>
          <CardContent className="text-lg md:text-xl font-bold">{fmtMoney(totals.balance)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Investimentos</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Investido</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Vai render</TableHead>
                <TableHead className="text-right">Retirado</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : investments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum investimento registrado.</TableCell></TableRow>
              ) : (
                investments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{fmtDate(i.investment_date)}</TableCell>
                    <TableCell>{i.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(i.amount))}</TableCell>
                    <TableCell className="text-right">{Number(i.rate_percent) ? `${Number(i.rate_percent)}%` : "-"}</TableCell>
                    <TableCell className="text-right text-primary">{fmtMoney(Number(i.expected_return))}</TableCell>
                    <TableCell className="text-right">{fmtMoney(withdrawnByInvestment[i.id] || 0)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Lançar retirada" onClick={() => openNewW(i.id)}>
                          <ArrowDownCircle className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditInv(i)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeInv(i.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {investments.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-medium">Total investido</TableCell>
                  <TableCell className="text-right font-bold">{fmtMoney(totals.invested)}</TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowDownCircle className="w-4 h-4" /> Retiradas</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Investimento</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : withdrawals.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma retirada lançada.</TableCell></TableRow>
              ) : (
                withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{fmtDate(w.withdrawal_date)}</TableCell>
                    <TableCell className="text-sm">{invLabel(w.investment_id)}</TableCell>
                    <TableCell>{w.notes || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(w.amount))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditW(w)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeW(w.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Investment dialog */}
      <Dialog open={invOpen} onOpenChange={(v) => { setInvOpen(v); if (!v) resetInv(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInv ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
              </div>
              <div>
                <Label>Valor investido (R$)</Label>
                <Input type="number" step="0.01" value={invAmount} onChange={(e) => onAmountChange(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Taxa de rendimento (%)</Label>
                <Input type="number" step="0.01" value={invRate} onChange={(e) => onRateChange(e.target.value)} placeholder="Ex.: 1,2" />
              </div>
              <div>
                <Label>Quanto vai render (R$)</Label>
                <Input type="number" step="0.01" value={invReturn} onChange={(e) => setInvReturn(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={invDesc} onChange={(e) => setInvDesc(e.target.value)} placeholder="Ex.: CDB Banco X" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvOpen(false)}>Cancelar</Button>
            <Button onClick={saveInv}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal dialog */}
      <Dialog open={wOpen} onOpenChange={(v) => { setWOpen(v); if (!v) resetW(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingW ? "Editar retirada" : "Nova retirada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Investimento</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={wInvestmentId}
                onChange={(e) => setWInvestmentId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {investments.map((i) => (
                  <option key={i.id} value={i.id}>{invLabel(i.id)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data da retirada</Label>
                <Input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={wAmount} onChange={(e) => setWAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea value={wNotes} onChange={(e) => setWNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWOpen(false)}>Cancelar</Button>
            <Button onClick={saveW}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestmentsPage;
