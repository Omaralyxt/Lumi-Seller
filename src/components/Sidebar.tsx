import { Link, useLocation } from "react-router-dom";
import { Package, ShoppingCart, LayoutDashboard, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Pedidos", href: "/pedidos", icon: ShoppingCart },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  name: string;
  isMobile?: boolean;
  onClick?: () => void;
}

const NavLink = ({ href, icon: Icon, name, isMobile = false, onClick }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === href;

  const baseClasses = "flex items-center p-3 rounded-lg transition-colors font-sans";
  const activeClasses = "bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-bold";
  const inactiveClasses = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Link to={href} onClick={onClick} className={cn(baseClasses, isActive ? activeClasses : inactiveClasses)}>
      <Icon className="h-5 w-5 mr-3" />
      {name}
    </Link>
  );
};

const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStore();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const storeName = store?.name || (storeLoading ? "Carregando Loja..." : "Minha Loja");

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header / Store Info */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-sidebar-primary">Lumi Seller</h1>
        <p className="text-sm text-sidebar-foreground mt-1 truncate">{storeName}</p>
        <p className="text-xs text-sidebar-foreground/70 truncate">{profile?.first_name || 'Vendedor'}</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink 
            key={item.href} 
            href={item.href} 
            icon={item.icon} 
            name={item.name} 
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
          <SidebarContent onLinkClick={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:block w-64 h-screen fixed top-0 left-0 bg-sidebar border-r border-sidebar-border shadow-lg">
      <SidebarContent />
    </div>
  );
};

export default Sidebar;