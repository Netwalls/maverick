import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from '../components/LayoutShell';

export const metadata: Metadata = {
  title: 'Maverick | Autonomous Multi-Agent DeFi Terminal',
  description: 'Maverick: DeFi terminal for multi-agent operations on Solana devnet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
