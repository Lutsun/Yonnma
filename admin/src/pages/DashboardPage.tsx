import { useEffect, useState } from 'react';
import { getStats } from '../lib/api';
import type { Stats } from '../lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((s) => !cancelled && setStats(s))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="notice notice-danger">{error}</div>;
  if (!stats) return <div className="centered-state">Chargement…</div>;

  const maxLines = Math.max(1, ...stats.lines_by_operator.map((o) => o.lines));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble du réseau et de son utilisation.</p>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Opérateurs" value={stats.operators} />
        <Stat label="Lignes" value={stats.lines} />
        <Stat label="Arrêts" value={stats.stops} />
        <Stat label="Comptes créés" value={stats.users} />
        <Stat label="Trajets enregistrés" value={stats.saved_trips} />
        <Stat label="Lignes en favori" value={stats.favorite_lines} />
      </div>

      {(stats.orphan_stops > 0 || stats.short_lines > 0) && (
        <div className="notice notice-warning" style={{ marginBottom: 20 }}>
          {stats.orphan_stops > 0 && (
            <div>
              {stats.orphan_stops} arrêt{stats.orphan_stops > 1 ? 's' : ''} sans aucune ligne —
              invisible{stats.orphan_stops > 1 ? 's' : ''} pour le calcul d'itinéraire.
            </div>
          )}
          {stats.short_lines > 0 && (
            <div>
              {stats.short_lines} ligne{stats.short_lines > 1 ? 's' : ''} avec moins de 2 arrêts —
              inutilisable{stats.short_lines > 1 ? 's' : ''} par le calcul d'itinéraire.
            </div>
          )}
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Lignes par opérateur</h3>
          {stats.lines_by_operator.length === 0 ? (
            <p className="page-subtitle">Aucune donnée.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.lines_by_operator.map((o) => (
                <div key={o.operator}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{o.operator}</span>
                    <span style={{ color: 'var(--ink-muted)' }}>{o.lines}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--fill)', borderRadius: 3 }}>
                    <div
                      style={{
                        height: 6,
                        width: `${(o.lines / maxLines) * 100}%`,
                        background: o.color,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Lignes les plus mises en favori</h3>
          {stats.popular_lines.length === 0 ? (
            <p className="page-subtitle">Aucun favori pour le moment.</p>
          ) : (
            <table>
              <tbody>
                {stats.popular_lines.map((l) => (
                  <tr key={l.code + l.operator}>
                    <td>
                      <strong>{l.code}</strong> · {l.name}
                      <div style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{l.operator}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.favorites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
