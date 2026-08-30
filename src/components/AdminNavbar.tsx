'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, PlusCircle, LogOut, LayoutGrid, HardDrive, ArrowLeft, Terminal } from 'lucide-react';

interface AdminNavbarProps {
  currentPath?: string;
}

export default function AdminNavbar({ currentPath }: AdminNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">NovaStore</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                  Admin
                </span>
              </div>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 pl-4 border-l border-white/10">
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === '/admin'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Applications</span>
            </Link>

            <Link
              href="/admin/logs"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === '/admin/logs'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>System Logs</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </Link>

          <Link
            href="/admin/apps/new"
            className="glow-button flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium text-white shadow-sm active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Application</span>
          </Link>

          <button
            onClick={handleLogout}
            title="Log out of Admin Portal"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
