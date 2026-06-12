import { useState, useEffect, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, LogOut, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Kredensial admin tetap (hardcoded sesuai permintaan)
const ADMIN_EMAIL = "perpus@itsb.ac.id";
const ADMIN_PASSWORD = "perpustakaan2026";
const STORAGE_KEY = "perpus_admin_ok";

interface Props {
  children: ReactNode;
}

const AdminGate = ({ children }: Props) => {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    setLoading(false);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
      toast.success("Selamat datang, Admin Perpustakaan ITSB");
    } else {
      toast.error("Email atau password salah");
      setPw("");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setEmail("");
    setPw("");
  };

  if (loading) return null;

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="glass-strong rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center mx-auto shadow-glow">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold">Login Admin</h1>
            <p className="text-sm text-muted-foreground">Masukkan email & password admin perpustakaan.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="perpus@itsb.ac.id"
                  autoFocus
                  className="bg-secondary/50 border-border/60 h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/50 border-border/60 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11">Masuk sebagai Admin</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Keluar
        </Button>
      </div>
      {children}
    </div>
  );
};

export default AdminGate;
