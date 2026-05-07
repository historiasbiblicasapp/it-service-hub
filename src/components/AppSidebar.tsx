import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { Wrench, Users, ClipboardList, BarChart3, LogOut, Share2, Wallet, Bike, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";

const navItems = [
  { to: "/", icon: ClipboardList, label: "Atendimentos" },
  { to: "/services", icon: Wrench, label: "Serviços" },
  { to: "/customers", icon: Users, label: "Clientes" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/finance", icon: Wallet, label: "Financeiro" },
  { to: "/moto", icon: Bike, label: "Moto" },
  { to: "/paid-bills", icon: Receipt, label: "Contas Pagas" },
  { to: "/share", icon: Share2, label: "Compartilhar" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-primary flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-primary-foreground/10">
        <img src={logo} alt="Ponto Digital" className="w-12 h-12 rounded-xl object-contain bg-white/90" />
        <span className="text-primary-foreground font-bold text-lg">Ponto Digital</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              location.pathname === item.to
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-primary-foreground/10">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
