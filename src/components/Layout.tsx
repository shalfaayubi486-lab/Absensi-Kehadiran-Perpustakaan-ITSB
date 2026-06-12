import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ScanFace, Sparkles, Github, ShieldCheck, Home } from "lucide-react";

const navItems = [
  { to: "/", label: "Beranda", end: true, icon: Home },
  { to: "/attend", label: "Absensi", icon: ScanFace },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

const Layout = () => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen relative">
      {/* Decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] h-[40rem] w-[40rem] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="text-base font-semibold tracking-tight">perpustakaan<span className="text-accent">.itsb</span></div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Absensi Kehadiran</div>
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1 glass rounded-full p-1">
            {navItems.map(({ to, label, end }) => {
              const isActive = end ? pathname === to : pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-gradient-primary -z-10" />
                  )}
                  {label}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-1">
            {navItems.slice(1).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `p-2 rounded-lg ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
                }
                title={label}
              >
                {Icon && <Icon className="h-4 w-4" />}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="container py-12 relative">
        <Outlet />
      </main>

      <footer className="border-t border-border/40 mt-20">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>Sistem aktif · v1.0</span>
          </div>
          <div className="font-mono-tight">
            © 2026 perpustakaan.itsb — Open Source
          </div>
          <a href="#" className="flex items-center gap-1.5 hover:text-foreground transition">
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
