'use client';

import React from 'react';
import Link from 'next/link';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              NovaStore
            </span>
            <span className="text-[9px] sm:text-[10px] text-indigo-400 font-medium -mt-1 tracking-wider uppercase">
              App Platform
            </span>
          </div>
        </Link>

        {/* Desktop Links & Action Buttons */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#features"
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block"
          >
            Funkciók
          </Link>
          <Link
            href="/#catalog"
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block"
          >
            Katalógus
          </Link>
          <Link
            href="/#architecture"
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block"
          >
            Rendszer
          </Link>

          {/* Admin link - icon only on mobile, text on desktop */}
          <Link
            href="/admin"
            title="Admin Portál"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-indigo-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-white/10 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* Download CTA */}
          <a
            href="/api/apps/com.novastore.app/download"
            download="novastore.apk"
            className="glow-button flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all transform active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>APK Letöltés</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
