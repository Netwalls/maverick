'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'HOME', icon: '~' },
  { href: '/wallet', label: 'WALLET', icon: '$' },
  { href: '/swap', label: 'SWAP', icon: '<>' },
  { href: '/bank', label: 'BANK', icon: '#' },
  { href: '/markets', label: 'MARKETS', icon: '%' },
  { href: '/history', label: 'HISTORY', icon: '>' },
  { href: '/voice', label: 'VOICE', icon: '*' },
  { href: '/agents', label: 'AGENTS', icon: '@' },
  { href: '/governance', label: 'GOV', icon: '=' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 200,
      height: '100vh',
      background: '#0d0d0d',
      borderRight: '1px solid var(--border)',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      <div style={{ padding: '0 16px', marginBottom: 32 }}>
        <div style={{
          color: 'var(--green)',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 2,
          textShadow: 'var(--glow-green)',
        }}>
          MAVERICK
        </div>
        <div style={{
          color: 'var(--text-muted)',
          fontSize: 10,
          marginTop: 4,
          letterSpacing: 1,
        }}>
          v1.0.1 // devnet
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {links.map(link => {
          const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              color: active ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: 12,
              letterSpacing: 1,
              borderLeft: active ? '2px solid var(--cyan)' : '2px solid transparent',
              background: active ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}>
              <span style={{
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                fontWeight: 600,
                width: 20,
                textAlign: 'center',
              }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-muted)',
      }}>
        solana://devnet
      </div>
    </nav>
  );
}
