import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const PROGRAM_STUDI = [
  "Teknik Perminyakan",
  "Teknik Pertambangan",
  "Teknik Metalurgi",
  "Perencanaan Wilayah dan Kota",
  "Sains Data",
  "Informatika",
  "Bisnis Digital",
  "Desain Produk",
  "Teknologi Pengolahan Sawit",
  "Teknologi Pengolahan Pulp dan Paper",
];

interface UserRow {
  id: string;
  nama: string;
  nim: string;
  program_studi: string | null;
  angkatan: string | null;
  foto_url: string | null;
  created_at: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, nama, nim, program_studi, angkatan, foto_url, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Gagal memuat data: " + error.message);
    else setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nama.toLowerCase().includes(q) ||
      u.nim.toLowerCase().includes(q) ||
      (u.program_studi ?? "").toLowerCase().includes(q) ||
      (u.angkatan ?? "").toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.nama.trim() || !editing.nim.trim()) {
      toast.error("Nama dan NIM wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({
        nama: editing.nama.trim(),
        nim: editing.nim.trim(),
        program_studi: editing.program_studi,
        angkatan: editing.angkatan,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Data berhasil diperbarui");
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    // Hapus log absensi user terlebih dahulu agar tidak orphan
    await supabase.from("attendance_logs").delete().eq("user_id", deleting.id);
    // Hapus foto storage jika ada
    if (deleting.foto_url) {
      const match = deleting.foto_url.match(/\/faces\/(.+)$/);
      if (match) await supabase.storage.from("faces").remove([match[1]]);
    }
    const { error } = await supabase.from("users").delete().eq("id", deleting.id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }
    toast.success(`${deleting.nama} dihapus`);
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-accent">Admin</div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Manajemen <span className="font-serif-display italic text-accent">mahasiswa.</span>
          </h1>
          <p className="text-muted-foreground">Kelola data mahasiswa terdaftar — edit atau hapus.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3">
            <UsersIcon className="h-4 w-4 text-accent" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total</div>
              <div className="text-xl font-semibold font-mono-tight">{users.length}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIM, prodi, angkatan…"
            className="border-0 bg-transparent focus-visible:ring-0 h-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Belum ada mahasiswa terdaftar.</div>
        ) : (
          (() => {
            // Group by program_studi
            const groups = new Map<string, UserRow[]>();
            filtered.forEach((u) => {
              const key = u.program_studi?.trim() || "Lainnya";
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(u);
            });
            const groupEntries = Array.from(groups.entries()).sort((a, b) =>
              a[0] === "Lainnya" ? 1 : b[0] === "Lainnya" ? -1 : a[0].localeCompare(b[0])
            );
            return (
              <Accordion type="multiple" defaultValue={groupEntries.map(([k]) => k)} className="px-2 py-2">
                {groupEntries.map(([prodi, list]) => (
                  <AccordionItem key={prodi} value={prodi} className="border-border/40">
                    <AccordionTrigger className="hover:no-underline px-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{prodi}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono-tight">
                          {list.length} mahasiswa
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="w-16"></TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NIM</TableHead>
                            <TableHead>Angkatan</TableHead>
                            <TableHead>Terdaftar</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.map((u) => (
                            <TableRow key={u.id} className="border-border/40 hover:bg-secondary/30">
                              <TableCell>
                                {u.foto_url ? (
                                  <img src={u.foto_url} alt={u.nama} className="h-10 w-10 rounded-xl object-cover border border-border/60" />
                                ) : (
                                  <div className="h-10 w-10 rounded-xl bg-muted" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{u.nama}</TableCell>
                              <TableCell className="font-mono-tight text-sm text-muted-foreground">{u.nim}</TableCell>
                              <TableCell className="font-mono-tight text-sm">{u.angkatan ?? "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono-tight">
                                {format(parseISO(u.created_at), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...u })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(u)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            );
          })()
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Mahasiswa</DialogTitle>
            <DialogDescription>Perbarui data mahasiswa terdaftar.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={editing.nama} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>NIM</Label>
                <Input value={editing.nim} onChange={(e) => setEditing({ ...editing, nim: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Program Studi</Label>
                <Select
                  value={editing.program_studi ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, program_studi: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
                  <SelectContent>
                    {PROGRAM_STUDI.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Angkatan</Label>
                <Input
                  value={editing.angkatan ?? ""}
                  onChange={(e) => setEditing({ ...editing, angkatan: e.target.value })}
                  placeholder="2024"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mahasiswa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && <>Data <strong>{deleting.nama}</strong> ({deleting.nim}) beserta seluruh log absensi dan foto wajahnya akan dihapus permanen.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
