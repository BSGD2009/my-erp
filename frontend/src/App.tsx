import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
type HealthData = {
  status: string;
  db: string;
  environment: string;
  timestamp: string;
};

type CheckState = 'loading' | 'ok' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────
const green = '#16a34a';
const red = '#dc2626';
const gray = '#6b7280';

function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        marginRight: 8,
      }}
    />
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<CheckState>('loading');
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<HealthData>;
      })
      .then((data) => {
        setHealth(data);
        setState('ok');
      })
      .catch(() => setState('error'));
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        maxWidth: 560,
        margin: '60px auto',
        padding: '0 1.5rem',
        color: '#111827',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          BoxERP
        </h1>
        <p style={{ color: gray, margin: '0.25rem 0 0' }}>
          Corrugated packaging — quote to cash
        </p>
      </div>

      {/* Status card */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          background: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }}>
          System status
        </h2>

        {state === 'loading' && (
          <p style={{ color: gray }}>Checking connections…</p>
        )}

        {state === 'error' && (
          <p style={{ color: red }}>
            <StatusDot color={red} />
            Could not reach the backend. Is Docker running?
          </p>
        )}

        {state === 'ok' && health && (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {[
                {
                  label: 'API',
                  value: health.status,
                  ok: health.status === 'ok',
                },
                {
                  label: 'Database',
                  value: health.db,
                  ok: health.db === 'connected',
                },
                {
                  label: 'Environment',
                  value: health.environment,
                  ok: true,
                },
                {
                  label: 'Server time',
                  value: new Date(health.timestamp).toLocaleString(),
                  ok: true,
                },
              ].map(({ label, value, ok }) => (
                <tr key={label}>
                  <td
                    style={{
                      padding: '0.45rem 0',
                      fontWeight: 600,
                      width: 140,
                      color: gray,
                      fontSize: '0.875rem',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: '0.45rem 0',
                      color: ok ? green : red,
                      fontSize: '0.875rem',
                    }}
                  >
                    <StatusDot color={ok ? green : red} />
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Next steps hint */}
      <p style={{ color: gray, fontSize: '0.8rem', marginTop: '1.5rem' }}>
        Session 1 complete. Next: Prisma schema, migrations, and seed data.
      </p>
    </div>
  );
}
