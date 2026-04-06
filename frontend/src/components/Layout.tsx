import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  DollarSign,
  History,
  BarChart3,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: TrendingDown },
  { to: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
  { to: '/dolares', label: 'Dolares', icon: DollarSign },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/metricas', label: 'Metricas', icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h1 className="sidebar-title">Gestor</h1>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
                <link.icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
