import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, AuthLayout, RedirectIfAuthed, RequireAdmin, RequireUser, UserLayout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminInventory from './pages/admin/AdminInventory';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/auth/AuthPages';
import Builder from './pages/user/Builder';
import Cart from './pages/user/Cart';
import Dashboard from './pages/user/Dashboard';
import Orders from './pages/user/Orders';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
              <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
            </Route>

            {/* Store: the menu and builder are public; cart and orders need a customer login. */}
            <Route element={<UserLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/build" element={<Builder />} />
              <Route path="/cart" element={<RequireUser><Cart /></RequireUser>} />
              <Route path="/orders" element={<RequireUser><Orders /></RequireUser>} />
            </Route>

            <Route path="/admin/login" element={<RedirectIfAuthed kind="admin"><AdminLogin /></RedirectIfAuthed>} />
            <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route path="/admin" element={<AdminInventory />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
            </Route>

            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
