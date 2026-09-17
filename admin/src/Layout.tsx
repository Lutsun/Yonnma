import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';

const LINKS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/operateurs', label: 'Opérateurs' },
  { to: '/lignes', label: 'Lignes' },
  { to: '/arrets', label: 'Arrêts' },
];

export default function Layout() {
  const { email, signOut } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span style={{ color: 'var(--yonn)' }}>Yonn</span>ma
        </div>
        <nav className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {email && <div className="sidebar-email">{email}</div>}
          <button className="btn" onClick={() => signOut()}>
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
