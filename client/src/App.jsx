import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import ProtectedRoute from './components/ProtectedRoute';
import CreateReport from './pages/CreateReport';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import Profile from './pages/Profile';
import Notifications from './Notifications';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
  path="/reports/new"
  element={
    <ProtectedRoute>
      <CreateReport />
    </ProtectedRoute>
  }
/>

      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportDetails />
          </ProtectedRoute>
        }
      />
      <Route
  path="/volunteer"
  element={
    <ProtectedRoute roles={['volunteer']}>
      <VolunteerDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/citizen"
  element={
    <ProtectedRoute roles={['citizen']}>
      <CitizenDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin"
  element={
    <ProtectedRoute roles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <Notifications />
    </ProtectedRoute>
  }
/>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}