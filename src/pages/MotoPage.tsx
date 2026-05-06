import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bike, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MotoKmRecord {
  id: string;
  km_atual: number;
  km_anterior: number;
  km_rodado: number;
  record_date: string;
  created_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const MotoPage = () => {
  const [records, setRecords] = useState<MotoKmRecord[]>([]);
  const [kmInput, setKmInput] = useState("");
  const [dateInput, setDateInput] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MotoKmRecord | null>(null);
  const [editKm, setEditKm] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const lastKm = records[0]?.km_atual ?? 0;

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from("moto_km")
      .select("*")
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar registros");
      return;
    }
    setRecords((data ?? []) as MotoKmRecord[]);
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
      record_date: dateInput || todayISO(),
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success(`Registrado! ${km_rodado} km rodados`);
    setKmInput("");
    setDateInput(todayISO());
    loadRecords();
  };

  const openEdit = (r: MotoKmRecord) => {
    setEditing(r);
    setEditKm(String(r.km_atual));
    setEditDate(r.record_date);
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const kmAtual = Number(editKm);
    if (isNaN(kmAtual) || kmAtual < 0) {
      toast.error("KM inválido");
      return;
    }
    const km_rodado = Math.max(0, kmAtual - Number(editing.km_anterior));
    const { error } = await supabase
      .from("moto_km")
      .update({
        km_atual: kmAtual,
        km_rodado,
        record_date: editDate || todayISO(),
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success("Registro atualizado");
    setEditing(null);
    loadRecords();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("moto_km").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Registro excluído");
    setDeleteId(null);
    loadRecords();
  };

  const kmAtualNum = Number(kmInput);
  const previewRodado =
    kmInput && !isNaN(kmAtualNum) && kmAtualNum >= lastKm
      ? kmAtualNum - lastKm
      : 0;

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Bike className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Controle de KM da Moto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo abastecimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data do abastecimento</Label>
                <Input
                  id="date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                />
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.record_date)}</TableCell>
                    <TableCell className="text-right">
                      {Number(r.km_anterior).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(r.km_atual).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {Number(r.km_rodado).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data do abastecimento</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>KM Atual</Label>
              <Input
                type="number"
                min={0}
                value={editKm}
                onChange={(e) => setEditKm(e.target.value)}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  KM Anterior deste registro:{" "}
                  {Number(editing.km_anterior).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MotoPage;
