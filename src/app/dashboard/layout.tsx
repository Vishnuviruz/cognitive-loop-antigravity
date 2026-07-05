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
    <div className="flex h-full min-h-screen bg-[#050409]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        <main className="flex-1 p-4 md:p-8 lg:p-12 relative overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
