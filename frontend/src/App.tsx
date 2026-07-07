import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { useAuth } from './auth/AuthContext';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <p className="loading">Cargando...</p>;
  if (!session) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
