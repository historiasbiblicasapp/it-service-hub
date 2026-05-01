import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Wallet, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type ExpenseCategory = Tables<"expense_categories">;

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#64748b"];

const FinancePage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category_id: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_categories(name, icon)")
        .gte("expense_date", `${selectedMonth}-01`)
        .lte("expense_date", `${selectedMonth}-31`)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (expense: { category_id: string; description: string; amount: number; expense_date: string; id?: string }) => {
      if (expense.id) {
        const { error } = await supabase
          .from("expenses")
          .update({ category_id: expense.category_id, description: expense.description, amount: expense.amount, expense_date: expense.expense_date })
          .eq("id", expense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert({ category_id: expense.category_id, description: expense.description, amount: expense.amount, expense_date: expense.expense_date });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setEditing(null);
      setForm({ category_id: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
      toast.success("Despesa salva!");
    },
    onError: () => toast.error("Erro ao salvar despesa"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa removida!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      category_id: form.category_id,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      expense_date: form.expense_date,
      id: editing?.id,
    });
  };

  const openEdit = (expense: Expense & { expense_categories: ExpenseCategory }) => {
    setEditing(expense);
    setForm({
      category_id: expense.category_id,
      description: expense.description || "",
      amount: String(expense.amount),
      expense_date: expense.expense_date,
    });
    setOpen(true);
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  const categoryData = expenses.reduce((acc: { name: string; value: number }[], e) => {
    const cat = (e.expense_categories as ExpenseCategory)?.name || "Sem categoria";
    const existing = acc.find((c) => c.name === cat);
    if (existing) existing.value += Number(e.amount);
    else acc.push({ name: cat, value: Number(e.amount) });
    return acc;
  }, []);

  const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Controle Financeiro</h1>
          <p className="text-muted-foreground">Registre e acompanhe suas despesas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes da despesa..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={upsertMutation.isPending || !form.category_id || !form.amount}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">R$ {totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Mês/Ano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </CardContent>
        </Card>
      </div>

      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria - {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Despesas - {monthLabel}</h2>
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Nenhuma despesa registrada neste mês</CardContent>
          </Card>
        ) : (
          expenses.map((expense) => {
            const cat = (expense.expense_categories as ExpenseCategory);
            return (
              <Card key={expense.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{cat?.name || "Sem categoria"}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(expense.expense_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                      {expense.description && <p className="text-sm text-muted-foreground mt-1 truncate">{expense.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-destructive whitespace-nowrap">R$ {Number(expense.amount).toFixed(2)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(expense as Expense & { expense_categories: ExpenseCategory })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(expense.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FinancePage;
