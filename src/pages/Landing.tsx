import { Link } from "react-router-dom";
import { ScanFace, UserPlus, LayoutDashboard, ArrowRight, Zap, Shield, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthlyTopStudents from "@/components/MonthlyTopStudents";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const Landing = () => {
  useScrollReveal();

  return (
    <div className="space-y-32">
      {/* HERO */}
      <section className="relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="text-muted-foreground">Powered by</span>
              <span className="text-foreground">Real Time Absensi</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight">
              Absensi Kehadiran<br />
              <span className="text-gradient inline-block animate-fade-up" style={{ animationDelay: "100ms" }}>Perpustakaan</span><br />
              <span className="text-gradient inline-block animate-fade-up" style={{ animationDelay: "220ms" }}>ITSB.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Sistem absensi dengan pengenalan wajah dan akan tercatat otomatis dalam hitungan detik.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-full font-medium h-12 px-6">
                <Link to="/attend">
                  Mulai Absensi <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 glass border-border/60 hover:bg-secondary">
                <Link to="/admin">Area Admin</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-6 text-xs text-muted-foreground">
              {["Real-time", "Privacy-first", "Akurasi tinggi"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Visual — ITSB image */}
          <div className="lg:col-span-5 relative animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div className="relative aspect-square max-w-md mx-auto">
              {/* animated blobs */}
              <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl animate-blob" />
              <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

              <div className="relative h-full w-full rounded-[2rem] overflow-hidden glass-strong shadow-soft grid place-items-center p-8">
                <img
                  src="/itsb-logo.png"
                  alt="Logo ITSB - Institut Teknologi Sains Bandung"
                  className="max-h-full max-w-full object-contain drop-shadow-xl animate-float"
                />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[10px] uppercase tracking-[0.2em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
                    Kampus ITSB
                  </div>
                  <div className="px-2.5 py-1 rounded-full glass text-[10px] font-mono-tight">Perpustakaan</div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 glass-strong rounded-2xl px-4 py-3 shadow-soft animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</div>
                    <div className="font-mono-tight text-sm">~1.2s</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 glass-strong rounded-2xl px-4 py-3 shadow-soft animate-float" style={{ animationDelay: "2s" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Akurasi</div>
                    <div className="font-mono-tight text-sm">98.4%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-12">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal">
          <div className="space-y-2 max-w-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-accent">Cara kerja</div>
            <h2 className="text-3xl md:text-4xl font-semibold">
              Tiga langkah sederhana, <span className="text-gradient">ribuan kemungkinan.</span>
            </h2>
          </div>
          <Link to="/attend" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Mulai absensi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { num: "01", icon: UserPlus, title: "Registrasi", desc: "Daftarkan diri sekali — input nama, NIM, dan ambil foto wajah dengan webcam." },
            { num: "02", icon: ScanFace, title: "Absensi", desc: "Hadapkan wajah ke kamera. Sistem mendeteksi & mencocokkan secara otomatis." },
            { num: "03", icon: LayoutDashboard, title: "Dashboard", desc: "Pantau kehadiran harian dengan filter tanggal, statistik, dan ekspor data." },
          ].map(({ num, icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="reveal group relative glass rounded-3xl p-6 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/10 transition" />
              <div className="relative space-y-6">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl glass grid place-items-center group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-mono-tight text-xs text-muted-foreground">{num}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MONTHLY TOP STUDENTS */}
      <div className="reveal">
        <MonthlyTopStudents />
      </div>

      {/* FEATURES STATS */}
      <section className="relative glass-strong rounded-[2rem] p-8 md:p-12 overflow-hidden reveal">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="text-xs uppercase tracking-[0.2em] text-accent">Mengapa perpustakaan.itsb</div>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
              Dirancang untuk kampus modern, dibangun untuk skala.
            </h2>
            <p className="text-muted-foreground">
              Dari laboratorium kecil hingga jurusan dengan ribuan mahasiswa — sistem yang sama, performa yang konsisten.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild className="bg-gradient-primary text-primary-foreground rounded-full">
                <Link to="/attend">Mulai Absensi</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Zap, label: "Deteksi", value: "<1.5s" },
              { icon: Shield, label: "Privasi", value: "Lokal" },
              { icon: Sparkles, label: "Akurasi", value: "98.4%" },
              { icon: Clock, label: "Uptime", value: "24/7" },
            ].map(({ icon: Icon, label, value }, i) => (
              <div
                key={label}
                className="reveal glass rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <Icon className="h-4 w-4 text-accent mb-3" />
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold mt-1 font-mono-tight">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
