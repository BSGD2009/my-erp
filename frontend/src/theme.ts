// BoxERP — shared design tokens
// ServiceNow-inspired dark theme

export const c = {
  pageBg:       '#0c0f1a',
  navBg:        '#141927',
  navBorder:    'rgba(255,255,255,0.07)',
  sideBg:       '#111623',
  accent:       '#3b82f6',
  accentHover:  '#2563eb',
  accentMuted:  'rgba(59,130,246,0.12)',
  accentBorder: 'rgba(59,130,246,0.25)',
  textPrimary:  '#f1f5f9',
  textMuted:    '#64748b',
  textLabel:    '#94a3b8',
  cardBg:       '#141927',
  cardBorder:   'rgba(255,255,255,0.07)',
  rowHover:     'rgba(255,255,255,0.03)',
  inputBg:      '#1a2035',
  inputBorder:  'rgba(255,255,255,0.12)',
  inputFocus:   'rgba(59,130,246,0.4)',
  danger:       '#ef4444',
  dangerMuted:  'rgba(239,68,68,0.12)',
  success:      '#22c55e',
  successMuted: 'rgba(34,197,94,0.12)',
  warning:      '#f59e0b',
  warningMuted: 'rgba(245,158,11,0.12)',
  divider:      'rgba(255,255,255,0.06)',
} as const;

export const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

// ── Reusable style snippets ───────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  background:   c.inputBg,
  border:       `1px solid ${c.inputBorder}`,
  borderRadius: 6,
  padding:      '0.45rem 0.75rem',
  color:        c.textPrimary,
  fontSize:     '0.875rem',
  width:        '100%',
  boxSizing:    'border-box',
  outline:      'none',
};

export const labelStyle: React.CSSProperties = {
  fontSize:    '0.75rem',
  fontWeight:  600,
  color:       c.textLabel,
  marginBottom: 4,
  display:     'block',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

export const btnPrimary: React.CSSProperties = {
  background:   c.accent,
  border:       'none',
  borderRadius: 6,
  padding:      '0.5rem 1.1rem',
  fontSize:     '0.875rem',
  fontWeight:   600,
  color:        '#fff',
  cursor:       'pointer',
  transition:   'background 0.15s',
};

export const btnSecondary: React.CSSProperties = {
  background:   'transparent',
  border:       `1px solid ${c.inputBorder}`,
  borderRadius: 6,
  padding:      '0.45rem 1rem',
  fontSize:     '0.875rem',
  color:        c.textLabel,
  cursor:       'pointer',
};

export const btnDanger: React.CSSProperties = {
  background:   c.dangerMuted,
  border:       `1px solid rgba(239,68,68,0.3)`,
  borderRadius: 6,
  padding:      '0.45rem 1rem',
  fontSize:     '0.875rem',
  color:        c.danger,
  cursor:       'pointer',
};

export const cardStyle: React.CSSProperties = {
  background:   c.cardBg,
  border:       `1px solid ${c.cardBorder}`,
  borderRadius: 10,
};

// Status badge colors by value
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Generic
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',    text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  INACTIVE:  { bg: 'rgba(100,116,139,0.12)',  text: '#64748b', border: 'rgba(100,116,139,0.2)' },
  // Job status
  QUEUED:      { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
  IN_PROGRESS: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  COMPLETE:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  ON_HOLD:     { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  // Tooling condition
  NEW:     { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  GOOD:    { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  WORN:    { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  RETIRED: { bg: 'rgba(100,116,139,0.12)', text: '#64748b', border: 'rgba(100,116,139,0.2)' },
  // Transfer status
  PENDING:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  COMPLETED: { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
};
