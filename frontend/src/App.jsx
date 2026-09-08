import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import BookRepair from './pages/BookRepair'
import CustomerLogin from './pages/CustomerLogin'
import AdminLogin from './pages/AdminLogin'
import CustomerDashboard from './pages/CustomerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminServices from './pages/AdminServices'
import AdminInventory from './pages/AdminInventory'
import AdminReports from './pages/AdminReports'
import RepairDetail from './pages/RepairDetail'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/book-repair" element={<BookRepair />} />
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'technician']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/services"
        element={
          <ProtectedRoute allowedRoles={['admin', 'technician']}>
            <AdminServices />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'technician']}>
            <AdminInventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'technician']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/repairs/:orderId"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin', 'technician']}>
            <RepairDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
