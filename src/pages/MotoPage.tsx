import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bike } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MotoKmRecord {
  id: string;
  km_atual: number;
  km_anterior: number;
  km_rodado: number;
  record_date: string;
  created_at: string;
}

const MotoPage = () => {
  const [records, setRecords] = useState<MotoKmRecord[]>([]);
  const [kmInput, setKmInput] = useState("");
  const [loading, setLoading] = useState(false);

  const lastKm = records[0]?.km_atual ?? 0;

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from("moto_km")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar registros");
      return;
    }
    setRecords(data ?? []);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kmAtual = Number(kmInput);
    if (!kmInput || isNaN(kmAtual) || kmAtual < 0) {
      toast.error("Informe um KM válido");
      return;
    }
    if (kmAtual < lastKm) {
      toast.error(`KM Atual não pode ser menor que o KM Anterior (${lastKm})`);
      return;
    }
    setLoading(true);
    const km_rodado = kmAtual - lastKm;
    const { error } = await supabase.from("moto_km").insert({
      km_atual: kmAtual,
      km_anterior: lastKm,
      km_rodado,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success(`Registrado! ${km_rodado} km rodados`);
    setKmInput("");
    loadRecords();
  };

  const kmAtualNum = Number(kmInput);
  const previewRodado =
    kmInput && !isNaN(kmAtualNum) && kmAtualNum >= lastKm
      ? kmAtualNum - lastKm
      : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Bike className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Controle de KM da Moto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo registro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">KM Anterior</p>
                <p className="text-2xl font-bold">{lastKm.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">KM Rodado</p>
                <p className="text-2xl font-bold text-primary">
                  {previewRodado.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="km">KM Atual</Label>
                <Input
                  id="km"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={kmInput}
                  onChange={(e) => setKmInput(e.target.value)}
                  placeholder="Ex: 10150"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">KM Anterior</TableHead>
                  <TableHead className="text-right">KM Atual</TableHead>
                  <TableHead className="text-right">KM Rodado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(r.km_anterior).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(r.km_atual).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {Number(r.km_rodado).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MotoPage;
