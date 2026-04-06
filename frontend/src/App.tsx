import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingresos from './pages/Ingresos';
import Gastos from './pages/Gastos';
import Transferencias from './pages/Transferencias';
import Dolares from './pages/Dolares';
import Historial from './pages/Historial';
import Metricas from './pages/Metricas';
import Categorias from './pages/Categorias';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ingresos" element={<Ingresos />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/transferencias" element={<Transferencias />} />
        <Route path="/dolares" element={<Dolares />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/metricas" element={<Metricas />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
