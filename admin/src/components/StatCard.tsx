import type { ReactNode } from 'react';

export default function StatCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="stat-card">
      <div className={'stat-icon' + (tone === 'danger' ? ' stat-icon-danger' : '')}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
