import { c } from '../theme';

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  width?:   number;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, width = 500, children }: DrawerProps) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width, maxWidth: '100vw',
        background: c.cardBg,
        borderLeft: `1px solid ${c.cardBorder}`,
        boxShadow: '-12px 0 40px rgba(0,0,0,0.45)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${c.cardBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: c.textPrimary }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '1.25rem', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
          >
            ✕
          </button>
        </div>
        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {children}
        </div>
      </div>
    </>
  );
}
