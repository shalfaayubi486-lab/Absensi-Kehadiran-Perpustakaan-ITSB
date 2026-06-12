import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWebcam } from "@/hooks/useWebcam";
import { loadFaceModels, detectSingleFace, findBestMatch } from "@/lib/faceApi";
import { useGeofence, ALLOWED_RADIUS_M } from "@/hooks/useGeofence";
import CameraView from "@/components/CameraView";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ScanFace, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface UserRow {
  id: string;
  nama: string;
  nim: string;
  program_studi: string | null;
  face_descriptor: number[];
  foto_url: string | null;
}

const COOLDOWN_MS = 60_000;
const SUCCESS_DISPLAY_MS = 5_000;
const DETECT_INTERVAL_MS = 400;
// Loosened: wajah cukup ≥22% lebar frame (lebih mudah trigger jarak normal)
const MIN_FACE_WIDTH_RATIO = 0.22;
// 0.50 = seimbang, lebih mudah cocok tanpa false positive berarti
const MATCH_THRESHOLD = 0.50;
// 2 frame berturut-turut cukup (lebih responsif)
const REQUIRED_CONFIRMATIONS = 2;
const RESET_NO_FACE_FRAMES = 3;

const Attend = () => {
  const { videoRef, ready, error, start, stop, attach } = useWebcam();
  const geo = useGeofence();
  const insideArea = geo.status === "inside";
  const [modelReady, setModelReady] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [status, setStatus] = useState<"idle" | "scanning" | "approach" | "matched" | "unknown">("idle");
  const [lastMatch, setLastMatch] = useState<{
    nama: string; nim: string; prodi: string | null; foto?: string | null; at: Date;
  } | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [locked, setLocked] = useState(false); // setelah berhasil absen → tampilkan card besar & matikan deteksi sebentar

  const lastLogRef = useRef<Map<string, number>>(new Map());
  const busyRef = useRef(false);
  const lockedRef = useRef(false);
  const noFaceCountRef = useRef(0);
  const confirmRef = useRef<{ userId: string | null; count: number }>({ userId: null, count: 0 });

  // Jam berjalan
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Re-attach stream saat layout berubah (locked toggle remounts video element)
  useEffect(() => {
    attach();
  }, [locked, attach]);

  // Suara konfirmasi pakai Web Speech API
  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "id-ID";
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  };

  // Bootstrap
  useEffect(() => {
    (async () => {
      await Promise.all([
        loadFaceModels().then(() => setModelReady(true)),
        supabase
          .from("users")
          .select("id, nama, nim, program_studi, face_descriptor, foto_url")
          .then(({ data }) => {
            if (data) setUsers(data as UserRow[]);
          }),
      ]);
      await start();
    })();
    return () => stop();
  }, [start, stop]);

  // Loop deteksi
  useEffect(() => {
    if (!modelReady || !ready || !insideArea) return;
    let timer: number;

    const tick = async () => {
      if (busyRef.current || !videoRef.current) {
        timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
        return;
      }
      // Saat sedang menampilkan sukses (locked), tetap pantau apakah wajah sudah hilang
      busyRef.current = true;
      try {
        const det = await detectSingleFace(videoRef.current);

        if (lockedRef.current) {
          if (!det) {
            noFaceCountRef.current += 1;
            if (noFaceCountRef.current >= RESET_NO_FACE_FRAMES) {
              lockedRef.current = false;
              setLocked(false);
              setStatus("scanning");
            }
          } else {
            noFaceCountRef.current = 0;
          }
          return; // tidak proses match selama locked
        }

        if (!det) {
          confirmRef.current = { userId: null, count: 0 };
          setStatus("scanning");
          return;
        }

        // Cek apakah wajah cukup dekat (besar di frame)
        const videoWidth = videoRef.current.videoWidth || 640;
        const faceWidth = det.detection.box.width;
        if (faceWidth / videoWidth < MIN_FACE_WIDTH_RATIO) {
          confirmRef.current = { userId: null, count: 0 };
          setStatus("approach");
          return;
        }

        const match = findBestMatch(det.descriptor, users, MATCH_THRESHOLD);
        if (!match) {
          confirmRef.current = { userId: null, count: 0 };
          setStatus("unknown");
          return;
        }

        // Confirmation gate — harus cocok N frame berturut-turut ke user yang sama
        if (confirmRef.current.userId === match.user.id) {
          confirmRef.current.count += 1;
        } else {
          confirmRef.current = { userId: match.user.id, count: 1 };
        }
        if (confirmRef.current.count < REQUIRED_CONFIRMATIONS) {
          setStatus("scanning");
          return;
        }

        const nowMs = Date.now();
        const last = lastLogRef.current.get(match.user.id) ?? 0;
        if (nowMs - last < COOLDOWN_MS) {
          // sudah absen barusan — anggap selesai, lock layar tanpa insert ulang
          setLastMatch({
            nama: match.user.nama,
            nim: match.user.nim,
            prodi: match.user.program_studi,
            foto: match.user.foto_url,
            at: new Date(last),
          });
          setStatus("matched");
          lockedRef.current = true;
          noFaceCountRef.current = 0;
          setLocked(true);
          setTimeout(() => {
            // setelah display, masih tunggu wajah hilang sebelum unlock (handled in loop)
          }, SUCCESS_DISPLAY_MS);
          return;
        }

        lastLogRef.current.set(match.user.id, nowMs);
        const { error: e } = await supabase
          .from("attendance_logs")
          .insert({ user_id: match.user.id });
        if (e) return;

        const matchedAt = new Date();
        setLastMatch({
          nama: match.user.nama,
          nim: match.user.nim,
          prodi: match.user.program_studi,
          foto: match.user.foto_url,
          at: matchedAt,
        });
        setStatus("matched");
        speak(
          `${match.user.nama}, terima kasih atas kunjungannya di Perpustakaan ITSB, selamat belajar.`,
        );
        toast.success(`Terabsensi: ${match.user.nama}`, {
          description: `NIM ${match.user.nim}`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });

        // Lock layar — tampilkan sukses besar, deteksi paused
        lockedRef.current = true;
        noFaceCountRef.current = 0;
        setLocked(true);
      } catch {
        // silent
      } finally {
        busyRef.current = false;
        timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
      }
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [modelReady, ready, users, videoRef, insideArea]);

  // Header
  const header = (
    <header className="space-y-3 max-w-2xl animate-fade-up">
      <div className="text-xs uppercase tracking-[0.2em] text-primary">Real-time Recognition</div>
      <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
        Hadapkan wajah, <span className="text-gradient">selesai.</span>
      </h1>
      <p className="text-muted-foreground">
        Mendekatlah ke kamera agar sistem dapat mengenali Anda. Setiap mahasiswa hanya bisa absen sekali per kunjungan.
      </p>
    </header>
  );

  // ===== Geofence gate — wajib berada di area Perpustakaan ITSB =====
  if (geo.status !== "inside") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {header}
        <div className="relative glass-strong rounded-[2rem] p-10 overflow-hidden animate-fade-up">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-destructive/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center space-y-5">
            <div className="h-20 w-20 rounded-3xl bg-gradient-primary grid place-items-center shadow-glow">
              {geo.status === "checking" ? (
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              ) : geo.status === "denied" ? (
                <AlertTriangle className="h-8 w-8 text-primary-foreground" />
              ) : (
                <MapPin className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold">
                {geo.status === "checking" && "Memeriksa lokasi Anda…"}
                {geo.status === "denied" && "Tidak dapat membaca lokasi"}
                {geo.status === "outside" && "Anda berada di luar area"}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                {geo.status === "checking" &&
                  "Mohon izinkan akses lokasi pada browser Anda. Absensi hanya dapat dilakukan di Perpustakaan ITSB."}
                {geo.status === "denied" && geo.message}
                {geo.status === "outside" &&
                  `Anda berjarak sekitar ${Math.round(geo.distance)} m dari Perpustakaan ITSB (radius diizinkan ${ALLOWED_RADIUS_M} m). Silakan datang ke perpustakaan untuk melakukan absensi.`}
              </p>
            </div>
            {geo.status === "outside" && (
              <div className="grid grid-cols-2 gap-3 max-w-md w-full pt-2">
                <div className="glass rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Jarak Anda</div>
                  <div className="font-mono-tight font-semibold text-lg">{Math.round(geo.distance)} m</div>
                </div>
                <div className="glass rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Akurasi GPS</div>
                  <div className="font-mono-tight font-semibold text-lg">±{Math.round(geo.accuracy)} m</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Overlay kecil untuk kamera
  const overlay = !modelReady ? (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs">
      <Loader2 className="h-3 w-3 animate-spin" /> Memuat model AI…
    </div>
  ) : status === "approach" ? (
    <div className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-soft">
      Mendekatlah ke kamera…
    </div>
  ) : status === "unknown" ? (
    <div className="px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold shadow-soft">
      Wajah tidak dikenali
    </div>
  ) : (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Mendeteksi wajah…
    </div>
  );

  // MODE 1: SUKSES — tampilan besar, kamera dikecilkan
  if (locked && lastMatch) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {header}

        <div className="grid lg:grid-cols-[1fr,260px] gap-6 items-start">
          {/* Big success card */}
          <div className="relative glass-strong rounded-[2rem] p-8 md:p-10 overflow-hidden shadow-soft animate-fade-in">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative grid md:grid-cols-[260px,1fr] gap-8 items-center">
              <div className="relative mx-auto md:mx-0">
                <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-2xl opacity-40" />
                {lastMatch.foto ? (
                  <img
                    src={lastMatch.foto}
                    alt={lastMatch.nama}
                    className="relative h-60 w-60 rounded-3xl object-cover border-4 border-background shadow-glow"
                  />
                ) : (
                  <div className="relative h-60 w-60 rounded-3xl bg-muted grid place-items-center text-6xl font-semibold">
                    {lastMatch.nama.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-success text-success-foreground text-xs font-bold tracking-wider shadow-soft flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> TERABSENSI
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Selamat datang</div>
                  <div className="text-4xl md:text-5xl font-semibold leading-tight">{lastMatch.nama}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-2xl p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">NIM</div>
                    <div className="font-mono-tight font-semibold">{lastMatch.nim}</div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Program Studi</div>
                    <div className="font-medium text-sm">{lastMatch.prodi ?? "—"}</div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Jam Masuk</div>
                    <div className="font-mono-tight font-semibold text-2xl tabular-nums">
                      {format(lastMatch.at, "HH:mm:ss")}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Tanggal</div>
                    <div className="text-sm">{format(lastMatch.at, "EEEE, d MMM yyyy", { locale: localeId })}</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Silakan menjauh dari kamera agar mahasiswa berikutnya dapat absen.
                </p>
              </div>
            </div>
          </div>

          {/* Kamera kecil di samping — tetap berjalan, siap untuk user berikutnya tanpa double absen */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Kamera (siaga)</div>
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden glass-strong">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] grid place-items-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-foreground px-3 py-1 rounded-full glass">
                  Menunggu user berikutnya…
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total terdaftar</span>
              <span className="font-mono-tight text-sm font-semibold">{users.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE 2: SCANNING — kamera besar
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {header}

      <div className="grid lg:grid-cols-[1fr,340px] gap-6">
        <CameraView ref={videoRef} overlay={overlay} />

        <div className="space-y-5">
          <div className="glass-strong rounded-3xl p-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Waktu Sekarang</div>
            <div className="text-3xl font-mono-tight font-semibold tabular-nums">
              {format(now, "HH:mm:ss")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {format(now, "EEEE, d MMMM yyyy", { locale: localeId })}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status Deteksi</div>
              <div
                className={`h-2 w-2 rounded-full ${
                  status === "approach"
                    ? "bg-primary animate-pulse"
                    : status === "unknown"
                    ? "bg-destructive"
                    : "bg-primary animate-pulse"
                }`}
              />
            </div>

            <div className="py-8 text-center">
              <div className="h-16 w-16 mx-auto rounded-2xl glass grid place-items-center mb-3">
                <ScanFace className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground">
                {status === "approach"
                  ? "Mendekatlah ke kamera…"
                  : status === "unknown"
                  ? "Wajah tidak dikenali — coba lagi"
                  : "Menunggu wajah…"}
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total terdaftar</span>
            <span className="font-mono-tight text-sm font-semibold">{users.length}</span>
          </div>
          {error && <p className="text-xs text-destructive px-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Attend;
