import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Products from "./pages/Products"; // Renamed from Index
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import AddEditProduct from "./pages/AddEditProduct";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import OrderDetail from "./pages/OrderDetail"; // Importando OrderDetail
import { useAuth } from "@/hooks/use-auth";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Layout from "./components/Layout"; // Importando o novo Layout
import LoadingSpinner from "./components/LoadingSpinner"; // Importando LoadingSpinner
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Componente para proteger rotas e aplicar o layout
const ProtectedLayout = () => {
  const { session, loading, profile } = useAuth();

  if (loading) {
    // Usando o novo LoadingSpinner
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  // 4. Bloquear acessos indevidos (Lumi Seller)
  if (profile && profile.role !== 'seller') {
    // Use useEffect para executar o side effect (alert e sign out)
    useEffect(() => {
      alert("Acesso restrito a vendedores. Você será desconectado.");
      supabase.auth.signOut();
    }, [profile]);

    // Mostra um spinner enquanto o sign out acontece e o redirecionamento é processado
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Grouped under ProtectedLayout */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/adicionar-produto" element={<AddEditProduct />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/pedidos" element={<Orders />} />
              <Route path="/pedidos/:id" element={<OrderDetail />} /> {/* Nova Rota */}
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <MadeWithDyad />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;