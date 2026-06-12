import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadFaceModels, detectSingleFace, descriptorDistance } from "@/lib/faceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, ImagePlus, X, AlertCircle, FileImage, ShieldAlert } from "lucide-react";

// Ambang descriptor untuk deteksi duplikat wajah (lebih longgar dari match agar mencegah daftar ulang)
const DUPLICATE_THRESHOLD = 0.45;

// Daftar program studi ITSB
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

// Skema validasi per item
const schema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  nim: z
    .string()
    .trim()
    .min(3, "NIM minimal 3 karakter")
    .max(30)
    .regex(/^[A-Za-z0-9]+$/, "NIM hanya huruf/angka"),
  program_studi: z.string().trim().min(2, "Program studi wajib diisi").max(100),
  angkatan: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Angkatan harus 4 digit tahun (mis. 2023)"),
});

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type ItemStatus = "pending" | "processing" | "success" | "error";

type RegisterItem = {
  id: string;
  file: File;
  previewUrl: string;
  nama: string;
  nim: string;
  program_studi: string;
  angkatan: string;
  status: ItemStatus;
  message?: string;
};

// Parse "Nama_NIM.jpg" -> {nama, nim}
const parseFilename = (filename: string): { nama: string; nim: string } => {
  const base = filename.replace(/\.[^.]+$/, ""); // remove ext
  const parts = base.split(/[_\-]/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z0-9]+$/.test(last)) {
      const nim = last;
      const nama = parts.slice(0, -1).join(" ").replace(/\s+/g, " ").trim();
      return { nama, nim };
    }
  }
  return { nama: base.replace(/[_\-]/g, " ").trim(), nim: "" };
};

const loadImageEl = (f: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(f);
  });

const Register = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Default bulk untuk prodi & angkatan — diterapkan ke semua file baru
  const [defaultProdi, setDefaultProdi] = useState<string>(PROGRAM_STUDI[0]);
  const [defaultAngkatan, setDefaultAngkatan] = useState<string>(String(new Date().getFullYear()));

  useEffect(() => {
    loadFaceModels().then(() => setModelLoading(false));
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: RegisterItem[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: bukan gambar`);
        return;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: lebih dari 5MB`);
        return;
      }
      const { nama, nim } = parseFilename(f.name);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        nama,
        nim,
        program_studi: defaultProdi,
        angkatan: defaultAngkatan,
        status: "pending",
      });
    });
    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateItem = (id: string, patch: Partial<RegisterItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  };

  // Proses satu item — return true jika sukses
  const processItem = async (item: RegisterItem): Promise<boolean> => {
    const parsed = schema.safeParse({
      nama: item.nama,
      nim: item.nim,
      program_studi: item.program_studi,
      angkatan: item.angkatan,
    });
    if (!parsed.success) {
      updateItem(item.id, { status: "error", message: parsed.error.issues[0].message });
      return false;
    }
    updateItem(item.id, { status: "processing", message: undefined });
    try {
      const imgEl = await loadImageEl(item.file);
      const detection = await detectSingleFace(imgEl);
      URL.revokeObjectURL(imgEl.src);
      if (!detection) {
        updateItem(item.id, { status: "error", message: "Wajah tidak terdeteksi" });
        return false;
      }

      // Cek duplikat wajah — 1 wajah hanya boleh terdaftar 1 kali
      const { data: existing } = await supabase
        .from("users")
        .select("id, nama, nim, face_descriptor");
      const queryVec = detection.descriptor;
      let dup: { nama: string; nim: string } | null = null;
      for (const u of existing ?? []) {
        const d = descriptorDistance(queryVec, (u as { face_descriptor: number[] }).face_descriptor);
        if (d <= DUPLICATE_THRESHOLD) {
          dup = { nama: (u as { nama: string }).nama, nim: (u as { nim: string }).nim };
          break;
        }
      }
      if (dup) {
        updateItem(item.id, {
          status: "error",
          message: `Wajah ini sudah terdaftar atas nama ${dup.nama} (${dup.nim})`,
        });
        return false;
      }

      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${parsed.data.nim}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("faces")
        .upload(filename, item.file, { contentType: item.file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("faces").getPublicUrl(filename);

      const descriptorArr = Array.from(detection.descriptor);
      const { error: insErr } = await supabase.from("users").insert({
        nama: parsed.data.nama,
        nim: parsed.data.nim,
        program_studi: parsed.data.program_studi,
        angkatan: parsed.data.angkatan,
        face_descriptor: descriptorArr,
        foto_url: pub.publicUrl,
      });
      if (insErr) {
        if (insErr.code === "23505") {
          updateItem(item.id, { status: "error", message: "NIM sudah terdaftar" });
          return false;
        }
        throw insErr;
      }

      updateItem(item.id, { status: "success", message: "Berhasil" });
      return true;
    } catch (e) {
      updateItem(item.id, {
        status: "error",
        message: e instanceof Error ? e.message : "Gagal",
      });
      return false;
    }
  };

  const handleSubmitAll = async () => {
    const queue = items.filter((it) => it.status !== "success");
    if (queue.length === 0) {
      toast.error("Tidak ada data baru untuk disimpan");
      return;
    }
    setSubmitting(true);
    let ok = 0;
    let fail = 0;
    // Proses sequential agar tidak overload model
    for (const it of queue) {
      // Ambil versi terbaru dari state (nama/nim mungkin sudah diedit user)
      const current = (await new Promise<RegisterItem | undefined>((resolve) => {
        setItems((prev) => {
          resolve(prev.find((x) => x.id === it.id));
          return prev;
        });
      })) ?? it;
      const success = await processItem(current);
      if (success) ok++;
      else fail++;
    }
    setSubmitting(false);
    if (ok > 0) toast.success(`${ok} mahasiswa berhasil didaftarkan`);
    if (fail > 0) toast.error(`${fail} gagal — periksa daftar di bawah`);
    if (fail === 0 && ok > 0) {
      setTimeout(() => navigate("/attend"), 1200);
    }
  };

  const pendingCount = items.filter((it) => it.status === "pending" || it.status === "error").length;
  const successCount = items.filter((it) => it.status === "success").length;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="space-y-3 max-w-2xl animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-accent">Step 01 · Onboarding</div>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Daftarkan wajah <span className="text-gradient">satu per satu atau sekaligus.</span>
        </h1>
        <p className="text-muted-foreground">
          Pilih beberapa foto sekaligus. Sistem akan otomatis membaca nama &amp; NIM dari nama file
          (format: <span className="font-mono-tight text-foreground">Nama_NIM.jpg</span>) — Anda tetap bisa mengedit sebelum submit.
        </p>
      </header>

      {/* Notice — 1 wajah = 1 pendaftaran */}
      <div className="relative glass-strong border border-primary/30 rounded-2xl p-5 flex items-start gap-4 animate-fade-up">
        <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <div className="font-semibold text-sm">Satu wajah hanya bisa didaftarkan satu kali</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sistem secara otomatis memeriksa setiap foto yang diunggah. Jika wajah sudah pernah terdaftar
            (meskipun dengan nama atau NIM berbeda), pendaftaran akan ditolak dan ditampilkan nama pemilik sebelumnya.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="relative rounded-3xl glass-strong border border-dashed border-border/60 p-10"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl glass grid place-items-center">
              <ImagePlus className="h-7 w-7 text-accent" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-medium">Tarik &amp; lepas foto di sini</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Bisa pilih banyak file sekaligus · JPG/PNG · Maks 5MB per file
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button variant="outline" onClick={clearAll} className="rounded-full border-border/60">
                Bersihkan
              </Button>
            )}
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full shadow-glow"
            >
              <Upload className="h-4 w-4 mr-2" /> Pilih Foto
            </Button>
          </div>
        </div>

        {/* Default prodi & angkatan untuk file yang akan diupload */}
        <div className="mt-6 pt-6 border-t border-border/40 grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Default Program Studi</Label>
            <select
              value={defaultProdi}
              onChange={(e) => setDefaultProdi(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-md bg-secondary/50 border border-border/60 px-3 text-sm"
            >
              {PROGRAM_STUDI.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Default Angkatan</Label>
            <Input
              value={defaultAngkatan}
              onChange={(e) => setDefaultAngkatan(e.target.value)}
              placeholder="2024"
              maxLength={4}
              className="mt-1.5 h-10 bg-secondary/50 border-border/60 font-mono-tight"
            />
          </div>
          <p className="sm:col-span-2 text-[11px] text-muted-foreground -mt-1">
            Nilai default ini akan terisi otomatis ke semua foto baru. Bisa diubah per mahasiswa di kartu di bawah.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* List items */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{items.length}</span> foto dipilih ·{" "}
              <span className="text-accent">{successCount} sukses</span> ·{" "}
              <span>{pendingCount} menunggu</span>
            </div>
            <Button
              onClick={handleSubmitAll}
              disabled={modelLoading || submitting || pendingCount === 0}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full h-11 px-6 shadow-glow"
            >
              {modelLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat model AI…</>
              ) : submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses {pendingCount}…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Daftarkan Semua ({pendingCount})</>
              )}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {items.map((it) => (
              <div
                key={it.id}
                className={`glass-strong rounded-2xl p-3 flex gap-3 border transition ${
                  it.status === "success"
                    ? "border-success/40"
                    : it.status === "error"
                    ? "border-destructive/40"
                    : "border-border/60"
                }`}
              >
                <div className="relative h-24 w-24 flex-shrink-0 rounded-xl overflow-hidden bg-secondary">
                  <img src={it.previewUrl} alt={it.file.name} className="w-full h-full object-cover" />
                  {it.status === "processing" && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    </div>
                  )}
                  {it.status === "success" && (
                    <div className="absolute inset-0 grid place-items-center bg-success/20">
                      <CheckCircle2 className="h-7 w-7 text-success" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1">
                      <FileImage className="h-3 w-3" /> {it.file.name}
                    </div>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="text-muted-foreground hover:text-destructive transition"
                      aria-label="Hapus"
                      disabled={submitting}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`nama-${it.id}`} className="text-[10px] text-muted-foreground">Nama</Label>
                      <Input
                        id={`nama-${it.id}`}
                        value={it.nama}
                        onChange={(e) => updateItem(it.id, { nama: e.target.value, status: "pending", message: undefined })}
                        disabled={submitting || it.status === "success"}
                        className="h-8 text-xs bg-secondary/50 border-border/60 mt-0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`nim-${it.id}`} className="text-[10px] text-muted-foreground">NIM</Label>
                      <Input
                        id={`nim-${it.id}`}
                        value={it.nim}
                        onChange={(e) => updateItem(it.id, { nim: e.target.value, status: "pending", message: undefined })}
                        disabled={submitting || it.status === "success"}
                        className="h-8 text-xs bg-secondary/50 border-border/60 mt-0.5 font-mono-tight"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`prodi-${it.id}`} className="text-[10px] text-muted-foreground">Program Studi</Label>
                      <select
                        id={`prodi-${it.id}`}
                        value={it.program_studi}
                        onChange={(e) => updateItem(it.id, { program_studi: e.target.value, status: "pending", message: undefined })}
                        disabled={submitting || it.status === "success"}
                        className="mt-0.5 w-full h-8 rounded-md bg-secondary/50 border border-border/60 px-2 text-xs"
                      >
                        {PROGRAM_STUDI.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`angkatan-${it.id}`} className="text-[10px] text-muted-foreground">Angkatan</Label>
                      <Input
                        id={`angkatan-${it.id}`}
                        value={it.angkatan}
                        onChange={(e) => updateItem(it.id, { angkatan: e.target.value, status: "pending", message: undefined })}
                        disabled={submitting || it.status === "success"}
                        maxLength={4}
                        className="h-8 text-xs bg-secondary/50 border-border/60 mt-0.5 font-mono-tight"
                      />
                    </div>
                  </div>

                  {it.message && (
                    <div
                      className={`flex items-center gap-1 text-[11px] ${
                        it.status === "success" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {it.status === "success" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {it.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 <span className="text-foreground font-medium">Tips bulk upload:</span> beri nama file dengan format{" "}
          <span className="font-mono-tight text-foreground">NamaLengkap_NIM.jpg</span> (contoh:{" "}
          <span className="font-mono-tight">Budi_Santoso_2021123456.jpg</span>). Sistem akan otomatis mengisi nama &amp; NIM.
        </p>
      </div>
    </div>
  );
};

export default Register;
