import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VersionsPage from './pages/VersionsPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import RestorePage from './pages/RestorePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import GestionPage from './pages/GestionPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/restore" element={<RestorePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/gestion" element={<GestionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
