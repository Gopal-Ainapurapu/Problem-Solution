
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import CreateReport from './pages/CreateReport';
import TeamWorkspace from './pages/TeamWorkspace';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import Profile from './pages/Profile';
import Notifications from './Notifications';
import ReportsMap from './pages/ReportsMap';

import ProtectedRoute from './components/ProtectedRoute';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Reports */}
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
        path="/reports/:id/workspace"
        element={
          <ProtectedRoute>
            <TeamWorkspace />
          </ProtectedRoute>
        }
      />

      {/* Role-based dashboards */}
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

      {/* Other protected pages */}
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

      <Route
        path="/reports-map"
        element={
          <ProtectedRoute>
            <ReportsMap />
          </ProtectedRoute>
        }
      />
<Route
  path="/admin/analytics"
  element={
    <ProtectedRoute roles={['admin']}>
      <AnalyticsDashboard />
    </ProtectedRoute>
  }
/>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
