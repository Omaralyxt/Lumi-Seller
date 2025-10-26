import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SessionContextProvider } from './integrations/supabase/session-context';
import ProtectedRoute from './components/protected-route';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import ProductDetail from './pages/ProductDetail';
import OrderDetail from './pages/OrderDetail';
import StoreSetup from './pages/StoreSetup';
import Notifications from './pages/Notifications';

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
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/store-setup" element={<StoreSetup />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* Redirecionamento padrão para login se a rota não for encontrada e não estiver autenticado */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </SessionContextProvider>
  );
}

export default App;