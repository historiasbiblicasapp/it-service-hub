import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-warning text-warning-foreground",
  em_andamento: "bg-primary text-primary-foreground",
  concluido: "bg-success text-success-foreground",
  cancelado: "bg-destructive text-destructive-foreground",
};

const OrdersPage = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", service_id: "", description: "", total_cost: "", status: "pendente" as string, order_date: new Date().toISOString().split("T")[0] });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, customers(name, phone), services(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (order: { customer_id: string; service_id: string; description: string; total_cost: number; status: string }) => {
      const { error } = await supabase.from("service_orders").insert({
        customer_id: order.customer_id,
        service_id: order.service_id,
        description: order.description,
        total_cost: order.total_cost,
        status: order.status as "pendente" | "em_andamento" | "concluido" | "cancelado",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
      setForm({ customer_id: "", service_id: "", description: "", total_cost: "", status: "pendente", order_date: new Date().toISOString().split("T")[0] });
      toast.success("Atendimento criado!");
    },
    onError: () => toast.error("Erro ao criar atendimento"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const typedStatus = status as "pendente" | "em_andamento" | "concluido" | "cancelado";
      const completed_at = status === "concluido" ? new Date().toISOString() : undefined;
      const { error } = await supabase.from("service_orders").update({ status: typedStatus, completed_at }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status atualizado!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedService = services.find((s) => s.id === form.service_id);
    createMutation.mutate({
      customer_id: form.customer_id,
      service_id: form.service_id,
      description: form.description,
      total_cost: parseFloat(form.total_cost) || selectedService?.cost || 0,
      status: form.status,
      order_date: form.order_date,
    });
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setForm({ ...form, service_id: serviceId, total_cost: String(service?.cost || 0) });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
          <p className="text-muted-foreground">Gerencie os atendimentos aos clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo Atendimento</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Atendimento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={form.service_id} onValueChange={handleServiceChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {Number(s.cost).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do atendimento..." />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data do Atendimento</Label>
                <Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.customer_id || !form.service_id}>Criar Atendimento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Nenhum atendimento registrado</CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="p-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{(order.customers as any)?.name}</p>
                    <p className="text-sm text-muted-foreground">{(order.services as any)?.name} - {format(new Date(order.order_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                    {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {expandedId === order.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p className="font-medium">R$ {Number(order.total_cost).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium">{statusLabels[order.status]}</p>
                      </div>
                    </div>
                    {order.description && (
                      <div>
                        <span className="text-muted-foreground">Descrição:</span>
                        <p className="text-sm mt-1">{order.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-sm">Status:</span>
                      <Select value={order.status} onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(order.order_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{(order.customers as any)?.name}</TableCell>
                    <TableCell>{(order.services as any)?.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.description}</TableCell>
                    <TableCell className="font-semibold">R$ {Number(order.total_cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}>
                        <SelectTrigger className="w-36">
                          <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrdersPage;
