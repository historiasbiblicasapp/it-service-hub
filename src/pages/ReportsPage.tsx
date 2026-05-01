import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Search, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const ReportsPage = () => {
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtered, setFiltered] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["report-orders", startDate, endDate, filtered],
    queryFn: async () => {
      let query = supabase
        .from("service_orders")
        .select("*, customers(name, phone), services(name)")
        .order("created_at", { ascending: false });

      if (filtered && startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
      if (filtered && endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const handleFilter = () => {
    setFiltered(true);
    refetch();
  };

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_cost), 0);
  const completedOrders = orders.filter((o) => o.status === "concluido").length;

  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Atendimentos", 14, 22);

    if (startDate || endDate) {
      doc.setFontSize(10);
      doc.text(`Período: ${startDate ? format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy") : "Início"} até ${endDate ? format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy") : "Atual"}`, 14, 30);
    }

    doc.setFontSize(10);
    doc.text(`Total de atendimentos: ${orders.length} | Concluídos: ${completedOrders} | Receita total: R$ ${totalRevenue.toFixed(2)}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [["Data", "Cliente", "Serviço", "Descrição", "Valor", "Status"]],
      body: orders.map((o) => [
        format(new Date(o.created_at), "dd/MM/yyyy"),
        (o.customers as any)?.name || "",
        (o.services as any)?.name || "",
        o.description || "",
        `R$ ${Number(o.total_cost).toFixed(2)}`,
        statusLabels[o.status] || o.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`relatorio_${startDate || "todos"}_${endDate || "atual"}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Filtre atendimentos por data e exporte para PDF</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-2 flex-1">
                <Label>Data Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Data Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleFilter} className="w-full sm:w-auto"><Search className="w-4 h-4 mr-2" /> Filtrar</Button>
              <Button variant="outline" onClick={exportToPDF} disabled={orders.length === 0} className="w-full sm:w-auto">
                <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Atendimentos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{orders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Concluídos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-success">{completedOrders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">R$ {totalRevenue.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Nenhum atendimento encontrado</CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="p-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{(order.customers as any)?.name}</p>
                    <p className="text-sm text-muted-foreground">{(order.services as any)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{statusLabels[order.status]}</Badge>
                    {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {expandedId === order.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <p className="font-medium">{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p className="font-semibold">R$ {Number(order.total_cost).toFixed(2)}</p>
                      </div>
                    </div>
                    {order.description && (
                      <div>
                        <span className="text-muted-foreground">Descrição:</span>
                        <p className="text-sm mt-1">{order.description}</p>
                      </div>
                    )}
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
                    <TableCell>{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{(order.customers as any)?.name}</TableCell>
                    <TableCell>{(order.services as any)?.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.description}</TableCell>
                    <TableCell className="font-semibold">R$ {Number(order.total_cost).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabels[order.status]}</Badge></TableCell>
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

export default ReportsPage;
