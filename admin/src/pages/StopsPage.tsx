import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Plus, Search, MapPin, AlertCircle } from 'lucide-react';
import '../components/LeafletIconFix';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { deleteStop, listStops, saveStop } from '../lib/api';
import type { Stop } from '../lib/types';

// Centré sur Dakar — même point que la carte de l'app mobile.
const DAKAR_CENTER: [number, number] = [14.6928, -17.4467];

type FormState = { id?: string; name: string; latitude: number; longitude: number };

export default function StopsPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listStops()
      .then(setStops)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? stops.filter((s) => s.name.toLowerCase().includes(q)) : stops;
  }, [stops, query]);

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      await saveStop(form);
      setForm(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Échec de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stop: Stop) => {
    if (!confirm(`Supprimer l'arrêt « ${stop.name} » ? Il sera retiré de toutes ses lignes.`)) return;
    try {
      await deleteStop(stop.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Arrêts"
        subtitle="Clique sur la carte pour ajouter un arrêt à l'endroit exact, ou sur un point existant pour le modifier."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setForm({ name: '', latitude: DAKAR_CENTER[0], longitude: DAKAR_CENTER[1] })}
          >
            <Plus size={16} />
            Ajouter un arrêt
          </button>
        }
      />

      {error && (
        <div className="notice notice-danger" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="map-container" style={{ marginBottom: 20 }}>
        <MapContainer center={DAKAR_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToAdd onPick={(lat, lng) => setForm({ name: '', latitude: lat, longitude: lng })} />
          {stops.map((s) => (
            <Marker
              key={s.id}
              position={[s.latitude, s.longitude]}
              eventHandlers={{ click: () => setForm(s) }}
            >
              <Popup>
                <strong>{s.name}</strong>
                <br />
                {s.line_count} ligne{s.line_count > 1 ? 's' : ''}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!loading && stops.length > 0 && (
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              type="search"
              placeholder="Chercher un arrêt…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="spacer" />
          <span className="page-subtitle" style={{ margin: 0 }}>
            {filtered.length} arrêt{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {loading ? (
        <div className="centered-state">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin size={26} />}
          title="Aucun arrêt ne correspond"
          description="Essaie une autre recherche, ou clique sur la carte pour en ajouter un."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Coordonnées</th>
                <th>Lignes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--ink-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                  </td>
                  <td>
                    {s.line_count === 0 ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>0 (orphelin)</span>
                    ) : (
                      s.line_count
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => setForm(s)}>
                        Modifier
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(s)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Modifier l'arrêt" : 'Nouvel arrêt'} onClose={() => setForm(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Place de la Nation"
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                />
              </label>
            </div>
            {formError && (
              <div className="notice notice-danger">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClickToAdd({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}
