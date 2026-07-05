'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BrainCircuit, 
  Timeline, 
  Activity, 
  GitMerge, 
  Network,
  Sparkles, 
  MessageSquare, 
  CheckSquare,
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: 'Timeline & Capture', href: '/dashboard', icon: Activity },
    { name: 'Connections Graph', href: '/dashboard/connections', icon: Network },
    { name: 'Action Center', href: '/dashboard/actions', icon: CheckSquare },
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 border-b border-zinc-800/50">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/10">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-glow-indigo text-lg">
              Cognitive Loop
            </span>
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-300 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User block & Logout */}
      <div className="pt-4 border-t border-zinc-800/50 space-y-4">
        <div className="flex items-center gap-3 px-2">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User'}
              className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700">
              <User className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {user.name || user.email.split('@')[0]}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-950/10 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-zinc-500 hover:text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Left side fixed) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 glass-panel border-r border-zinc-800/50 p-4">
        <NavContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between glass-panel border-b border-zinc-800/50 px-4 py-3 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-white text-md tracking-wide">Cognitive Loop</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-zinc-400 hover:text-white p-1 focus:outline-none"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          {/* Backdrop blur */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#08070d] border-r border-zinc-800 p-6">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
