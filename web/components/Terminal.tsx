'use client';

interface TerminalProps {
  title: string;
  children: React.ReactNode;
}

export default function Terminal({ title, children }: TerminalProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        <span style={{ color: 'var(--red)' }}>●</span>
        <span style={{ color: 'var(--yellow)' }}>●</span>
        <span style={{ color: 'var(--green)' }}>●</span>
        <span style={{ marginLeft: 8, letterSpacing: 1 }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}
