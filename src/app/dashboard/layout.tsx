import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Guard routing if session gets terminated
  if (!user) {
    redirect('/login');
  }

  return (
    // The outer wrapper is NOT a horizontal flex — Sidebar's fixed desktop
    // aside positions itself, and the mobile top bar flows naturally above the content.
    <div className="min-h-screen bg-[#050409] w-full">
      {/* Sidebar renders:
          - Desktop: a position:fixed aside (doesn't affect document flow)
          - Mobile: a sticky top bar + overlay drawer (stacks above content) */}
      <Sidebar user={user} />

      {/* Content area: on desktop offset by sidebar width, on mobile full-width */}
      <div className="lg:pl-64 min-h-screen flex flex-col w-full overflow-x-hidden">
        <main className="flex-1 p-4 md:p-6 lg:p-12 w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
