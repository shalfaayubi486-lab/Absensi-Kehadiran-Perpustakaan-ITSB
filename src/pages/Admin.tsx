import { useState } from "react";
import AdminGate from "@/components/AdminGate";
import Dashboard from "./Dashboard";
import Users from "./Users";
import Register from "./Register";
import BookLoans from "./BookLoans";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users as UsersIcon, UserPlus, BookOpen, ShieldCheck, Plus, CalendarIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarHeader,
} from "@/components/ui/sidebar";
import { AdminToolsProvider, useAdminTools } from "@/context/AdminTools";
import { format } from "date-fns";

type Tab = "dashboard" | "users" | "loans" | "register";

const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Mahasiswa", icon: UsersIcon },
  { key: "loans", label: "Peminjaman", icon: BookOpen },
  { key: "register", label: "Registrasi", icon: UserPlus },
];

const AdminSidebar = ({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) => {
  const tools = useAdminTools();
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Sidebar collapsible="none" className="border-r border-border/60 w-64 shrink-0">
      <SidebarHeader className="border-b border-border/40">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Admin Panel</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">perpustakaan.itsb</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    onClick={() => setTab(key)}
                    isActive={tab === key}
                    className="data-[active=true]:bg-gradient-primary data-[active=true]:text-primary-foreground transition-all"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools kontekstual per tab */}
        {tab === "dashboard" && (
          <SidebarGroup>
            <SidebarGroupLabel>Filter</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-2 space-y-2">
                <Label htmlFor="sb-date" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" /> Tanggal
                </Label>
                <Input
                  id="sb-date"
                  type="date"
                  value={tools.date}
                  max={today}
                  onChange={(e) => tools.setDate(e.target.value)}
                  className="h-9 text-xs font-mono-tight"
                />
                {tools.date !== today && (
                  <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => tools.setDate(today)}>
                    Reset ke hari ini
                  </Button>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {tab === "loans" && (
          <SidebarGroup>
            <SidebarGroupLabel>Aksi</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-2">
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl h-10"
                  onClick={() => tools.setLoanDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Catat Peminjaman
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

const Admin = () => {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <AdminGate>
      <AdminToolsProvider>
        <SidebarProvider defaultOpen>
          <div className="flex w-full min-h-[calc(100vh-12rem)] -mx-4 md:-mx-0">
            <AdminSidebar tab={tab} setTab={setTab} />
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 p-4 md:p-6 min-w-0">
                {tab === "dashboard" && <Dashboard />}
                {tab === "users" && <Users />}
                {tab === "loans" && <BookLoans />}
                {tab === "register" && <Register />}
              </div>
            </div>
          </div>
        </SidebarProvider>
      </AdminToolsProvider>
    </AdminGate>
  );
};

export default Admin;
