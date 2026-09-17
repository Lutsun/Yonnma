import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { countStopsPerLine, deleteLine, listLines, listOperators } from '../lib/api';
import type { Line, Operator } from '../lib/types';

export default function LinesPage() {
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stopCounts, setStopCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([listLines(), listOperators(), countStopsPerLine()])
      .then(([l, o, counts]) => {
        setLines(l);
        setOperators(o);
        setStopCounts(counts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const operatorById = useMemo(() => new Map(operators.map((o) => [o.id, o])), [operators]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((l) => {
      if (operatorFilter && l.operator_id !== operatorFilter) return false;
      if (!q) return true;
      return l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q);
    });
  }, [lines, query, operatorFilter]);

  const handleDelete = async (line: Line, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer la ligne « ${line.code} » ?`)) return;
    try {
      await deleteLine(line.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lignes</h1>
          <p className="page-subtitle">
            {lines.length} ligne{lines.length > 1 ? 's' : ''} au total. Ouvre une ligne pour éditer son tracé.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/lignes/nouvelle')}>
          + Ajouter une ligne
        </button>
      </div>

      {error && <div className="notice notice-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Chercher un code ou un nom…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)}>
          <option value="">Tous les opérateurs</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div className="spacer" />
      </div>

      {loading ? (
        <div className="centered-state">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Aucune ligne ne correspond.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Opérateur</th>
                <th>Tarif</th>
                <th>Arrêts</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((line) => {
                const op = operatorById.get(line.operator_id);
                const count = stopCounts.get(line.id) ?? 0;
                return (
                  <tr key={line.id} onClick={() => navigate(`/lignes/${line.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="badge" style={{ background: line.color || op?.color || '#999' }}>
                        {line.code}
                      </span>{' '}
                      {line.name}
                    </td>
                    <td>{op?.name ?? '—'}</td>
                    <td>{line.fare_fcfa} FCFA</td>
                    <td>
                      {count < 2 ? (
                        <span style={{ color: 'var(--danger)' }}>{count} (incomplet)</span>
                      ) : (
                        count
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-danger" onClick={(e) => handleDelete(line, e)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
