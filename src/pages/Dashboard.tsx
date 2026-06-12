import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Calendar as CalendarIcon, TrendingUp, GraduationCap, BookOpen, Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LabelList,
} from "recharts";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";
import { useAdminTools } from "@/context/AdminTools";

interface LogRow {
  id: string;
  timestamp: string;
  users: {
    nama: string;
    nim: string;
    foto_url: string | null;
    program_studi: string | null;
    angkatan: string | null;
  } | null;
}

interface TrendPoint {
  date: string;
  label: string;
  pengunjung: number;
}

interface BreakdownPoint {
  name: string;
  value: number;
}

const Dashboard = () => {
  const { date } = useAdminTools();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [prodiBreakdown, setProdiBreakdown] = useState<BreakdownPoint[]>([]);
  const [angkatanBreakdown, setAngkatanBreakdown] = useState<BreakdownPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Logs untuk tanggal terpilih + total user
  useEffect(() => {
    setLoading(true);
    const from = startOfDay(parseISO(date)).toISOString();
    const to = endOfDay(parseISO(date)).toISOString();
    Promise.all([
      supabase
        .from("attendance_logs")
        .select("id, timestamp, users(nama, nim, foto_url, program_studi, angkatan)")
        .gte("timestamp", from)
        .lte("timestamp", to)
        .order("timestamp", { ascending: false }),
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]).then(([logsRes, usersRes]) => {
      if (logsRes.data) setLogs(logsRes.data as unknown as LogRow[]);
      if (typeof usersRes.count === "number") setTotalUsers(usersRes.count);
      setLoading(false);
    });
  }, [date]);

  // Trend 7 hari + breakdown prodi/angkatan (semua kehadiran hari ini)
  useEffect(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 6));
    supabase
      .from("attendance_logs")
      .select("timestamp, user_id, users(program_studi, angkatan)")
      .gte("timestamp", start.toISOString())
      .lte("timestamp", end.toISOString())
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{
          timestamp: string;
          user_id: string;
          users: { program_studi: string | null; angkatan: string | null } | null;
        }>;

        // Trend harian (unique pengunjung)
        const days = eachDayOfInterval({ start, end });
        const buckets = new Map<string, Set<string>>();
        days.forEach((d) => buckets.set(format(d, "yyyy-MM-dd"), new Set()));
        rows.forEach((row) => {
          const key = format(parseISO(row.timestamp), "yyyy-MM-dd");
          buckets.get(key)?.add(row.user_id);
        });
        setTrend(
          days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            return {
              date: key,
              label: format(d, "EEE d", { locale: localeId }),
              pengunjung: buckets.get(key)?.size ?? 0,
            };
          })
        );

        // Breakdown prodi & angkatan (count log)
        const prodiMap = new Map<string, number>();
        const angkatanMap = new Map<string, number>();
        rows.forEach((row) => {
          const p = row.users?.program_studi || "Lainnya";
          const a = row.users?.angkatan || "—";
          prodiMap.set(p, (prodiMap.get(p) ?? 0) + 1);
          angkatanMap.set(a, (angkatanMap.get(a) ?? 0) + 1);
        });
        setProdiBreakdown(
          Array.from(prodiMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );
        setAngkatanBreakdown(
          Array.from(angkatanMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      });
  }, [logs.length]);

  const uniqueAttendees = useMemo(() => {
    const set = new Set(logs.map((l) => l.users?.nim).filter(Boolean));
    return set.size;
  }, [logs]);

  const stats = [
    { label: "Total Mahasiswa", value: totalUsers, icon: Users },
    { label: "Hadir Hari Ini", value: uniqueAttendees, icon: CalendarIcon },
    { label: "Total Log", value: logs.length, icon: ClipboardList },
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-accent">Analytics</div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Dashboard <span className="text-gradient">kehadiran.</span>
          </h1>
          <p className="text-muted-foreground">
            Menampilkan data untuk{" "}
            <span className="font-medium text-foreground">
              {format(parseISO(date), "EEEE, d MMMM yyyy", { locale: localeId })}
            </span>
            . Ubah tanggal di menu samping.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => {
            if (!logs.length) return toast.error("Belum ada data untuk diekspor");
            exportToCsv(
              `kehadiran-${date}.csv`,
              logs.map((l) => ({
                nama: l.users?.nama ?? "",
                nim: l.users?.nim ?? "",
                program_studi: l.users?.program_studi ?? "",
                angkatan: l.users?.angkatan ?? "",
                tanggal: format(parseISO(l.timestamp), "yyyy-MM-dd"),
                waktu: format(parseISO(l.timestamp), "HH:mm:ss"),
              })),
              [
                { key: "nama", label: "Nama" },
                { key: "nim", label: "NIM" },
                { key: "program_studi", label: "Program Studi" },
                { key: "angkatan", label: "Angkatan" },
                { key: "tanggal", label: "Tanggal" },
                { key: "waktu", label: "Waktu" },
              ],
            );
            toast.success("CSV diunduh");
          }}
        >
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="relative glass-strong rounded-3xl p-6 overflow-hidden group">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl group-hover:bg-accent/20 transition" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl glass grid place-items-center">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
              </div>
              <div className="text-4xl font-semibold font-mono-tight">{value}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Tren pengunjung 7 hari */}
      <section className="glass-strong rounded-3xl p-6 overflow-hidden">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg glass grid place-items-center">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <h2 className="font-semibold text-lg">Tren Pengunjung</h2>
            </div>
            <p className="text-xs text-muted-foreground ml-10">Jumlah pengunjung unik 7 hari terakhir</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total Minggu Ini</div>
            <div className="text-2xl font-semibold font-mono-tight">
              {trend.reduce((s, p) => s + p.pengunjung, 0)}
            </div>
          </div>
        </div>
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(v: number) => [`${v} pengunjung`, ""]}
              />
              <Area type="monotone" dataKey="pengunjung" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#visitorGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Breakdown prodi & angkatan */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-3xl p-6 overflow-hidden">
          <div className="flex items-start justify-between mb-1 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg glass grid place-items-center">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">Per Program Studi</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">7 hari</span>
          </div>
          <p className="text-xs text-muted-foreground ml-10 mb-5">Total kunjungan terbagi per prodi</p>
          {prodiBreakdown.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">Belum ada data.</div>
          ) : (
            <div style={{ height: Math.max(220, prodiBreakdown.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prodiBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 8, bottom: 0 }}
                  barCategoryGap={10}
                >
                  <defs>
                    <linearGradient id="prodiGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                    formatter={(v: number) => [`${v} kunjungan`, ""]}
                  />
                  <Bar dataKey="value" fill="url(#prodiGrad)" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="value" position="right" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-strong rounded-3xl p-6 overflow-hidden">
          <div className="flex items-start justify-between mb-1 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg glass grid place-items-center">
                <GraduationCap className="h-4 w-4 text-accent" />
              </div>
              <h2 className="font-semibold text-lg">Per Angkatan</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">7 hari</span>
          </div>
          <p className="text-xs text-muted-foreground ml-10 mb-5">Distribusi kunjungan per angkatan</p>
          <div className="h-64 -mx-2">
            {angkatanBreakdown.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={angkatanBreakdown} margin={{ top: 18, right: 16, left: -16, bottom: 0 }} barCategoryGap={20}>
                  <defs>
                    <linearGradient id="angkatanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    cursor={{ fill: "hsl(var(--accent) / 0.08)" }}
                    formatter={(v: number) => [`${v} kunjungan`, ""]}
                  />
                  <Bar dataKey="value" fill="url(#angkatanGrad)" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    <LabelList dataKey="value" position="top" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="glass-strong rounded-3xl overflow-hidden">
        <div className="p-6 pb-3 flex items-center justify-between border-b border-border/40">
          <div>
            <h2 className="font-semibold text-lg">Log Kehadiran</h2>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(date), "EEEE, d MMMM yyyy", { locale: localeId })}
            </span>
          </div>
          <div className="text-xs font-mono-tight text-muted-foreground">{logs.length} entries</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="w-16"></TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIM</TableHead>
              <TableHead>Program Studi</TableHead>
              <TableHead>Angkatan</TableHead>
              <TableHead className="text-right">Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Belum ada kehadiran pada tanggal ini.</TableCell></TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-border/40 hover:bg-secondary/30">
                  <TableCell>
                    {log.users?.foto_url ? (
                      <img src={log.users.foto_url} alt={log.users.nama} className="h-10 w-10 rounded-xl object-cover border border-border/60" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{log.users?.nama ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono-tight text-sm">{log.users?.nim ?? "—"}</TableCell>
                  <TableCell className="text-sm">{log.users?.program_studi ?? "—"}</TableCell>
                  <TableCell className="font-mono-tight text-sm">{log.users?.angkatan ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono-tight">
                    {format(parseISO(log.timestamp), "HH:mm:ss")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
};

export default Dashboard;
