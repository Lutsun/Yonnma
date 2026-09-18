import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Trash2, Bus, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { deleteOperator, listOperators, saveOperator } from '../lib/api';
import type { Operator } from '../lib/types';

type FormState = { id?: string; name: string; short_name: string; color: string };
const EMPTY: FormState = { name: '', short_name: '', color: '#12B76A' };

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listOperators()
      .then(setOperators)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      await saveOperator(form);
      setForm(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Échec de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (op: Operator) => {
    if (!confirm(`Supprimer « ${op.name} » et toutes ses lignes ?`)) return;
    try {
      await deleteOperator(op.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Opérateurs"
        subtitle="Les réseaux de transport (BRT, Dakar Dem Dikk, Tata AFTU…)."
        action={
          <button className="btn btn-primary" onClick={() => setForm(EMPTY)}>
            <Plus size={16} />
            Ajouter un opérateur
          </button>
        }
      />

      {error && (
        <div className="notice notice-danger" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="centered-state">Chargement…</div>
      ) : operators.length === 0 ? (
        <EmptyState
          icon={<Bus size={26} />}
          title="Aucun opérateur pour le moment"
          description="Ajoute le premier réseau de transport pour commencer."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Couleur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id}>
                  <td style={{ fontWeight: 600 }}>{op.name}</td>
                  <td>{op.short_name}</td>
                  <td>
                    <span className="color-dot" style={{ background: op.color }} />
                    {op.color}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => setForm(op)}>
                        <Pencil size={14} />
                        Modifier
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(op)}>
                        <Trash2 size={14} />
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
        <Modal title={form.id ? "Modifier l'opérateur" : 'Nouvel opérateur'} onClose={() => setForm(null)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dakar Dem Dikk"
                required
              />
            </label>
            <label className="field">
              <span>Code court</span>
              <input
                value={form.short_name}
                onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                placeholder="DDD"
                required
              />
            </label>
            <label className="field">
              <span>Couleur</span>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </label>
            {formError && (
              <div className="notice notice-danger">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
