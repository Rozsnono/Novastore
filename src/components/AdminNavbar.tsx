'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StorageDonut, { DonutSlice } from '@/components/StorageDonut';
import { LayoutGrid, Users, Terminal, PlusCircle, Settings, LogOut, ArrowLeft } from 'lucide-react';

interface AdminNavbarProps {
  currentPath?: string;
}

/** Az admin menüpontjai (útvonal, felirat, ikon). Új oldal felvételekor itt kell bővíteni. */
const NAV_ITEMS = [
  { href: '/admin', label: 'Alkalmazások', Icon: LayoutGrid },
  { href: '/admin/users', label: 'Felhasználók', Icon: Users },
  { href: '/admin/logs', label: 'Napló', Icon: Terminal },
  { href: '/admin/apps/new', label: 'Új alkalmazás', Icon: PlusCircle },
  { href: '/admin/settings', label: 'Beállítások', Icon: Settings },
];

/**
 * Admin navigáció.
 * Asztali nézetben fix bal oldalsáv (a tartalom helyét az `.admin-theme:has(.admin-sidebar)`
 * szabály adja a globals.css-ben), mobilon alsó, lebegő tab bar.
 */
export default function AdminNavbar({ currentPath }: AdminNavbarProps) {
  const router = useRouter();
  // Tárhely-összesítő az oldalsáv körgrafikonjához (hiba esetén a grafikon rejtve marad)
  const [storage, setStorage] = useState<{ slices: DonutSlice[]; totalBytes: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/storage')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => !cancelled && setStorage(json.data))
      .catch((err) => console.error('Tárhely-összesítő betöltési hiba:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (href: string) => currentPath === href;

  return (
    <>
      {/* Asztali oldalsáv */}
      <aside className="admin-sidebar hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-surface-side border-r border-surface-line z-40">
        <Link href="/admin" className="px-6 pt-7 pb-8 block">
          <span className="text-lg font-semibold tracking-wide text-white">
            NOVA<span className="text-acc-500">STORE</span>
          </span>
          <span className="block text-[10px] tracking-[0.2em] text-ink-400 mt-0.5">ADMIN</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors border-r-[3px] ${
                isActive(href)
                  ? 'text-white border-acc-500 bg-gradient-to-r from-transparent to-acc-900'
                  : 'text-ink-400 border-transparent hover:text-ink-200 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive(href) ? 'text-acc-500' : ''}`} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {storage && (
          <div className="px-6 pb-5">
            <p className="text-sm font-semibold text-white">NAS tárhely</p>
            <p className="text-[11px] text-ink-400 mb-3">Felhasználás appok szerint</p>
            <StorageDonut
              compact
              slices={storage.slices}
              centerLabel={`${(storage.totalBytes / (1024 * 1024)).toFixed(0)} MB`}
              centerSub="összesen"
            />
          </div>
        )}

        <div className="p-4 space-y-1 border-t border-surface-line">
          <Link
            href="/"
            className="flex items-center gap-3 px-2 py-2 text-xs text-ink-400 hover:text-ink-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nyilvános oldal</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-2 text-xs text-ink-400 hover:text-amber-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </aside>

      {/* Mobil: alsó lebegő tab bar */}
      <nav className="admin-sidebar lg:hidden fixed bottom-3 left-3 right-3 z-40 flex justify-around items-center rounded-2xl bg-surface-card border border-surface-line shadow-lg shadow-black/50 py-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`p-2.5 rounded-xl ${isActive(href) ? 'text-acc-500 bg-acc-900' : 'text-ink-400'}`}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}
        <button onClick={handleLogout} aria-label="Kijelentkezés" className="p-2.5 text-ink-400">
          <LogOut className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
}
