'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

/**
 * Shell layout for authenticated pages.
 * Redirects to login if no token found.
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('dg_token')) router.push('/');
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 240, padding: '32px 36px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
