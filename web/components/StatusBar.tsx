'use client';

import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 28,
      background: '#0d0d0d',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: 11,
      color: 'var(--text-muted)',
      zIndex: 100,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ color: 'var(--green)' }}>● CONNECTED</span>
        <span>cluster: devnet</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <span>maverick-web</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
