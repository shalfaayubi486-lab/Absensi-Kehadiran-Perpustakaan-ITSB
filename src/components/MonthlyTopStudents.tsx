import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Trophy, BookOpen, ScanFace, Users as UsersIcon, Medal } from "lucide-react";

interface TopItem {
  user_id: string;
  nama: string;
  nim: string;
  foto_url: string | null;
  count: number;
}

interface UserLite {
  id: string;
  nama: string;
  nim: string;
  foto_url: string | null;
}

const MEDALS = [
  { color: "text-yellow-500", bg: "from-yellow-400/20 to-yellow-400/0", label: "🥇" },
  { color: "text-zinc-500", bg: "from-zinc-400/20 to-zinc-400/0", label: "🥈" },
  { color: "text-amber-700", bg: "from-amber-600/20 to-amber-600/0", label: "🥉" },
];

const MonthlyTopStudents = () => {
  const [topVisitors, setTopVisitors] = useState<TopItem[]>([]);
  const [topBorrowers, setTopBorrowers] = useState<TopItem[]>([]);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // jam realtime untuk header
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // hitung pengunjung unik hari ini (realtime)
  useEffect(() => {
    let mounted = true;

    const fetchToday = async () => {
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      const { data } = await supabase
        .from("attendance_logs")
        .select("user_id")
        .gte("timestamp", start)
        .lte("timestamp", end);
      if (!mounted) return;
      const unique = new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
      setTodayCount(unique.size);
    };

    fetchToday();

    // subscribe realtime — setiap insert log → refetch hari ini
    const channel = supabase
      .channel("attendance-today")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        () => fetchToday(),
      )
      .subscribe();

    // refresh ringan tiap 30s untuk handle rollover hari & fallback bila subs gagal
    const poll = setInterval(fetchToday, 30_000);

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  // top kategori bulanan
  useEffect(() => {
    (async () => {
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();

      const [{ data: usersData }, { data: logs }, { data: loans }] = await Promise.all([
        supabase.from("users").select("id, nama, nim, foto_url"),
        supabase.from("attendance_logs").select("user_id").gte("timestamp", start).lte("timestamp", end),
        supabase.from("book_loans").select("user_id").gte("tanggal_pinjam", start).lte("tanggal_pinjam", end),
      ]);

      const userMap = new Map<string, UserLite>(
        ((usersData ?? []) as UserLite[]).map((u) => [u.id, u])
      );

      const build = (counts: Map<string, number>): TopItem[] =>
        Array.from(counts.entries())
          .map(([user_id, count]) => {
            const u = userMap.get(user_id);
            if (!u) return null;
            return { user_id, nama: u.nama, nim: u.nim, foto_url: u.foto_url, count };
          })
          .filter((x): x is TopItem => x !== null)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

      const visitCounts = new Map<string, number>();
      (logs ?? []).forEach((l: { user_id: string }) => {
        visitCounts.set(l.user_id, (visitCounts.get(l.user_id) ?? 0) + 1);
      });
      const loanCounts = new Map<string, number>();
      (loans ?? []).forEach((l: { user_id: string }) => {
        loanCounts.set(l.user_id, (loanCounts.get(l.user_id) ?? 0) + 1);
      });

      setTopVisitors(build(visitCounts));
      setTopBorrowers(build(loanCounts));
      setLoading(false);
    })();
  }, [now]);

  const studentCategories = [
    {
      title: "Paling Aktif Mengunjungi",
      icon: ScanFace,
      unit: "kunjungan",
      data: topVisitors,
      desc: "Total absensi terbanyak bulan ini.",
    },
    {
      title: "Paling Aktif Meminjam Buku",
      icon: BookOpen,
      unit: "buku",
      data: topBorrowers,
      desc: "Jumlah peminjaman buku terbanyak.",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2 max-w-xl">
          <div className="text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5" /> Sorotan Perpustakaan
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold">
            Sorotan <span className="text-gradient">{format(now, "MMMM yyyy", { locale: localeId })}.</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Mahasiswa teratas bulan ini &amp; jumlah pengunjung hari ini secara realtime.
          </p>
        </div>
      </div>

      {/* Realtime today card */}
      <div className="relative glass-strong rounded-3xl p-6 md:p-8 overflow-hidden">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live · {format(now, "EEEE, d MMM yyyy", { locale: localeId })}
            </div>
            <div className="text-xl md:text-2xl font-semibold">Pengunjung Hari Ini</div>
            <p className="text-xs text-muted-foreground max-w-md">
              Jumlah mahasiswa unik yang sudah absen di perpustakaan hari ini — diperbarui otomatis.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <UsersIcon className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <div className="text-6xl md:text-7xl font-semibold font-mono-tight text-gradient leading-none tabular-nums">
                {todayCount}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 text-right">
                orang
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {studentCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="glass-strong rounded-3xl p-6 space-y-5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div className="h-11 w-11 rounded-2xl glass grid place-items-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <Medal className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <div className="relative space-y-1">
                <h3 className="text-lg font-semibold leading-tight">{cat.title}</h3>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </div>

              <div className="relative space-y-2 pt-2">
                {loading ? (
                  <div className="text-xs text-muted-foreground text-center py-8">Memuat…</div>
                ) : cat.data.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">Belum ada data bulan ini.</div>
                ) : (
                  cat.data.map((item, i) => (
                    <div
                      key={item.user_id}
                      className={`relative flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r ${MEDALS[i].bg} border border-border/40`}
                    >
                      <div className="text-lg w-6 text-center">{MEDALS[i].label}</div>
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nama} className="h-10 w-10 rounded-xl object-cover border border-border/60" />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center text-xs font-semibold">
                          {item.nama.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.nama}</div>
                        <div className="text-[10px] font-mono-tight text-muted-foreground truncate">{item.nim}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono-tight font-semibold ${MEDALS[i].color}`}>{item.count}</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{cat.unit}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MonthlyTopStudents;
