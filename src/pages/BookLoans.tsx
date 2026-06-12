import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, BookOpen, CheckCircle2, RotateCcw, Download } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { exportToCsv } from "@/lib/exportCsv";
import { useAdminTools } from "@/context/AdminTools";

interface UserOpt { id: string; nama: string; nim: string; }
interface LoanRow {
  id: string;
  user_id: string;
  judul_buku: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  users?: { nama: string; nim: string } | null;
}

const todayLocalISO = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

const BookLoans = () => {
  const { loanDialogOpen: open, setLoanDialogOpen: setOpen, loanRefreshKey } = useAdminTools();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<LoanRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user_id: "", judul_buku: "", tanggal_pinjam: todayLocalISO() });

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: u }] = await Promise.all([
      supabase
        .from("book_loans")
        .select("id, user_id, judul_buku, tanggal_pinjam, tanggal_kembali, users(nama, nim)")
        .order("tanggal_pinjam", { ascending: false }),
      supabase.from("users").select("id, nama, nim").order("nama"),
    ]);
    setLoans((l ?? []) as unknown as LoanRow[]);
    setUsers((u ?? []) as UserOpt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [loanRefreshKey]);

  const handleAdd = async () => {
    if (!form.user_id || !form.judul_buku.trim() || !form.tanggal_pinjam) {
      toast.error("Mahasiswa, judul buku & tanggal pinjam wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("book_loans").insert({
      user_id: form.user_id,
      judul_buku: form.judul_buku.trim(),
      tanggal_pinjam: new Date(form.tanggal_pinjam).toISOString(),
    });
    setSaving(false);
    if (error) return toast.error("Gagal: " + error.message);
    toast.success("Peminjaman dicatat");
    setForm({ user_id: "", judul_buku: "", tanggal_pinjam: todayLocalISO() });
    setOpen(false);
    load();
  };

  const handleReturn = async (loan: LoanRow) => {
    const { error } = await supabase
      .from("book_loans")
      .update({ tanggal_kembali: new Date().toISOString() })
      .eq("id", loan.id);
    if (error) return toast.error("Gagal: " + error.message);
    toast.success("Buku dikembalikan");
    load();
  };

  const handleUnreturn = async (loan: LoanRow) => {
    const { error } = await supabase
      .from("book_loans")
      .update({ tanggal_kembali: null })
      .eq("id", loan.id);
    if (error) return toast.error("Gagal: " + error.message);
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("book_loans").delete().eq("id", deleting.id);
    if (error) return toast.error("Gagal: " + error.message);
    toast.success("Data peminjaman dihapus");
    setDeleting(null);
    load();
  };

  const handleExport = () => {
    if (!loans.length) return toast.error("Belum ada data untuk diekspor");
    exportToCsv(
      `peminjaman-buku-${todayLocalISO()}.csv`,
      loans.map((l) => ({
        nama: l.users?.nama ?? "",
        nim: l.users?.nim ?? "",
        judul_buku: l.judul_buku,
        tanggal_pinjam: format(parseISO(l.tanggal_pinjam), "yyyy-MM-dd HH:mm"),
        tanggal_kembali: l.tanggal_kembali ? format(parseISO(l.tanggal_kembali), "yyyy-MM-dd HH:mm") : "",
        status: l.tanggal_kembali ? "Dikembalikan" : "Dipinjam",
      })),
      [
        { key: "nama", label: "Nama" },
        { key: "nim", label: "NIM" },
        { key: "judul_buku", label: "Judul Buku" },
        { key: "tanggal_pinjam", label: "Tanggal Pinjam" },
        { key: "tanggal_kembali", label: "Tanggal Kembali" },
        { key: "status", label: "Status" },
      ],
    );
    toast.success("CSV diunduh");
  };

  const active = loans.filter((l) => !l.tanggal_kembali).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-primary">Admin</div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Peminjaman <span className="text-gradient">buku.</span>
          </h1>
          <p className="text-muted-foreground">
            Catat &amp; kelola peminjaman buku perpustakaan. Gunakan tombol{" "}
            <span className="font-medium text-foreground">Catat Peminjaman</span> di menu samping.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sedang Dipinjam</div>
              <div className="text-xl font-semibold font-mono-tight">{active}</div>
            </div>
          </div>
          <Button variant="outline" className="rounded-full h-11" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Peminjaman Baru</DialogTitle>
            <DialogDescription>Pilih mahasiswa, judul buku &amp; tanggal pinjam.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Mahasiswa</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih mahasiswa" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama} · {u.nim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Judul Buku</Label>
              <Input
                value={form.judul_buku}
                onChange={(e) => setForm({ ...form, judul_buku: e.target.value })}
                placeholder="Contoh: Pengantar Teknik Perminyakan"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Pinjam</Label>
              <Input
                type="date"
                value={form.tanggal_pinjam}
                max={todayLocalISO()}
                onChange={(e) => setForm({ ...form, tanggal_pinjam: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="glass-strong rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead>Mahasiswa</TableHead>
              <TableHead>NIM</TableHead>
              <TableHead>Judul Buku</TableHead>
              <TableHead>Tanggal Pinjam</TableHead>
              <TableHead>Tanggal Kembali</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : loans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Belum ada peminjaman.</TableCell></TableRow>
            ) : (
              loans.map((l) => (
                <TableRow key={l.id} className="border-border/40 hover:bg-secondary/30">
                  <TableCell className="font-medium">{l.users?.nama ?? "—"}</TableCell>
                  <TableCell className="font-mono-tight text-sm text-muted-foreground">{l.users?.nim ?? "—"}</TableCell>
                  <TableCell>{l.judul_buku}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono-tight">
                    {format(parseISO(l.tanggal_pinjam), "dd MMM yyyy", { locale: localeId })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono-tight">
                    {l.tanggal_kembali ? format(parseISO(l.tanggal_kembali), "dd MMM yyyy", { locale: localeId }) : "—"}
                  </TableCell>
                  <TableCell>
                    {l.tanggal_kembali ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                        <CheckCircle2 className="h-3 w-3" /> Dikembalikan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">
                        Dipinjam
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {l.tanggal_kembali ? (
                        <Button size="sm" variant="ghost" onClick={() => handleUnreturn(l)} title="Batal kembali">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleReturn(l)} title="Tandai dikembalikan">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(l)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data peminjaman?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && <>Data peminjaman <strong>{deleting.judul_buku}</strong> oleh <strong>{deleting.users?.nama}</strong> akan dihapus permanen.</>}
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

export default BookLoans;
