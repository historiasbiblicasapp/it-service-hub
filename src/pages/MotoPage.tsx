import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bike, Pencil, Trash2, Wrench } from "lucide-react";
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

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  service_date: string;
  km: number | null;
  notes: string | null;
  created_at: string;
}

const MAINTENANCE_TYPES = [
  "Troca de óleo",
  "Kit relação",
  "Pneus",
  "Câmara de ar",
  "Peças avulsas",
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const MotoPage = () => {
  const [records, setRecords] = useState<MotoKmRecord[]>([]);
  const [kmInput, setKmInput] = useState("");
  const [dateInput, setDateInput] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MotoKmRecord | null>(null);
  const [editKm, setEditKm] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Manutenção
  const [maint, setMaint] = useState<MaintenanceRecord[]>([]);
  const [mType, setMType] = useState<string>(MAINTENANCE_TYPES[0]);
  const [mDate, setMDate] = useState(todayISO());
  const [mKm, setMKm] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mLoading, setMLoading] = useState(false);
  const [mFilter, setMFilter] = useState<string>("all");
  const [editingM, setEditingM] = useState<MaintenanceRecord | null>(null);
  const [emType, setEmType] = useState("");
  const [emDate, setEmDate] = useState("");
  const [emKm, setEmKm] = useState("");
  const [emNotes, setEmNotes] = useState("");
  const [deleteMId, setDeleteMId] = useState<string | null>(null);

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

  const loadMaintenance = async () => {
    const { data, error } = await supabase
      .from("moto_maintenance")
      .select("*")
      .order("service_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar manutenções");
      return;
    }
    setMaint((data ?? []) as MaintenanceRecord[]);
  };

  useEffect(() => {
    loadRecords();
    loadMaintenance();
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

  // Manutenção handlers
  const handleMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mType) {
      toast.error("Selecione o tipo");
      return;
    }
    setMLoading(true);
    const { error } = await supabase.from("moto_maintenance").insert({
      maintenance_type: mType,
      service_date: mDate || todayISO(),
      km: mKm ? Number(mKm) : null,
      notes: mNotes || null,
    });
    setMLoading(false);
    if (error) {
      toast.error("Erro ao salvar manutenção");
      return;
    }
    toast.success("Manutenção registrada");
    setMDate(todayISO());
    setMKm("");
    setMNotes("");
    loadMaintenance();
  };

  const openEditM = (r: MaintenanceRecord) => {
    setEditingM(r);
    setEmType(r.maintenance_type);
    setEmDate(r.service_date);
    setEmKm(r.km ? String(r.km) : "");
    setEmNotes(r.notes ?? "");
  };

  const handleEditMSave = async () => {
    if (!editingM) return;
    const { error } = await supabase
      .from("moto_maintenance")
      .update({
        maintenance_type: emType,
        service_date: emDate || todayISO(),
        km: emKm ? Number(emKm) : null,
        notes: emNotes || null,
      })
      .eq("id", editingM.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success("Manutenção atualizada");
    setEditingM(null);
    loadMaintenance();
  };

  const handleDeleteM = async () => {
    if (!deleteMId) return;
    const { error } = await supabase
      .from("moto_maintenance")
      .delete()
      .eq("id", deleteMId);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Registro excluído");
    setDeleteMId(null);
    loadMaintenance();
  };

  const kmAtualNum = Number(kmInput);
  const previewRodado =
    kmInput && !isNaN(kmAtualNum) && kmAtualNum >= lastKm
      ? kmAtualNum - lastKm
      : 0;

  const filteredMaint =
    mFilter === "all" ? maint : maint.filter((m) => m.maintenance_type === mFilter);

  // Últimas por tipo (resumo)
  const lastByType: Record<string, MaintenanceRecord | undefined> = {};
  MAINTENANCE_TYPES.forEach((t) => {
    lastByType[t] = maint.find((m) => m.maintenance_type === t);
  });

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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
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

      {/* MANUTENÇÃO */}
      <div className="flex items-center gap-3 pt-4">
        <Wrench className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">Manutenção</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo das últimas manutenções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MAINTENANCE_TYPES.map((t) => {
              const last = lastByType[t];
              return (
                <div key={t} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">{t}</p>
                  {last ? (
                    <>
                      <p className="text-base font-semibold">
                        {formatDate(last.service_date)}
                      </p>
                      {last.km != null && (
                        <p className="text-xs text-muted-foreground">
                          {Number(last.km).toLocaleString("pt-BR")} km
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem registro</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={mType} onValueChange={setMType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>KM na manutenção (opcional)</Label>
              <Input
                type="number"
                min={0}
                value={mKm}
                onChange={(e) => setMKm(e.target.value)}
                placeholder={lastKm ? `Ex: ${lastKm}` : "Ex: 10500"}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={mNotes}
                onChange={(e) => setMNotes(e.target.value)}
                placeholder="Marca do óleo, peça trocada, valor, etc."
                rows={2}
              />
            </div>
            <Button type="submit" disabled={mLoading}>
              {mLoading ? "Salvando..." : "Registrar manutenção"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Histórico de manutenções</CardTitle>
            <div className="w-full sm:w-56">
              <Select value={mFilter} onValueChange={setMFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMaint.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma manutenção.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">KM</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaint.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.service_date)}</TableCell>
                    <TableCell>{r.maintenance_type}</TableCell>
                    <TableCell className="text-right">
                      {r.km != null ? Number(r.km).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditM(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteMId(r.id)}
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

      {/* Dialogs KM */}
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

      {/* Dialogs Manutenção */}
      <Dialog open={!!editingM} onOpenChange={(o) => !o && setEditingM(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={emType} onValueChange={setEmType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={emDate}
                onChange={(e) => setEmDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>KM</Label>
              <Input
                type="number"
                min={0}
                value={emKm}
                onChange={(e) => setEmKm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={emNotes}
                onChange={(e) => setEmNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingM(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteMId}
        onOpenChange={(o) => !o && setDeleteMId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteM}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MotoPage;
