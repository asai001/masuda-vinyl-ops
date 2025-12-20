'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onNavigate={handleNavigate} />
      <main className="flex-1 bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
