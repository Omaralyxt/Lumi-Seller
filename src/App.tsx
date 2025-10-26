import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner'; // Importando Toaster do sonner
import { SessionContextProvider } from '@/integrations/supabase/session-context';
import ProtectedRoute from './components/protected-route';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import AddEditProduct from './pages/AddEditProduct';
import OrderDetail from './pages/OrderDetail';
import StoreSetup from './pages/StoreSetup';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound'; // Importando NotFound

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/adicionar-produto" element={<AddEditProduct />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/pedidos/:id" element={<OrderDetail />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/store-setup" element={<StoreSetup />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* Rota 404 - Captura qualquer rota não definida */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </SessionContextProvider>
  );
}

export default App;