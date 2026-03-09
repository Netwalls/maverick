'use client';

import { usePathname } from 'next/navigation';
import Nav from './Nav';
import StatusBar from './StatusBar';
import { WalletProvider } from '../contexts/WalletContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <>
        <div className="scanline" />
        <main>{children}</main>
      </>
    );
  }

  return (
    <WalletProvider>
      <div className="scanline" />
      <div className="app-layout">
        <Nav />
        <main className="main-content">
          {children}
        </main>
      </div>
      <StatusBar />
    </WalletProvider>
  );
}
