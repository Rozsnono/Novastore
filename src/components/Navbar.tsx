'use client';

import React from 'react';
import Link from 'next/link';
import { Download, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex flex-col shrink-0">
          <span className="text-base sm:text-lg font-semibold tracking-wide text-white">
            NOVA<span className="text-acc-500">STORE</span>
          </span>
          <span className="text-[9px] sm:text-[10px] text-ink-400 tracking-[0.2em] -mt-0.5">APP PLATFORM</span>
        </Link>

        {/* Desktop Links & Action Buttons */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#features"
            className="text-xs sm:text-sm font-medium text-ink-300 hover:text-white transition-colors hidden md:block"
          >
            Funkciók
          </Link>
          <Link
            href="/#catalog"
            className="text-xs sm:text-sm font-medium text-ink-300 hover:text-white transition-colors hidden md:block"
          >
            Katalógus
          </Link>
          <Link
            href="/#architecture"
            className="text-xs sm:text-sm font-medium text-ink-300 hover:text-white transition-colors hidden md:block"
          >
            Rendszer
          </Link>

          {/* Admin link - icon only on mobile, text on desktop */}
          <Link
            href="/admin"
            title="Admin felület"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink-300 hover:text-acc-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-surface-line hover:border-acc-500/40 bg-surface-card hover:bg-white/5 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-acc-400 shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* Download CTA */}
          <a
            href="/api/apps/com.novastore.app/download?stream=true"
            download="novastore.apk"
            className="glow-button flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>APK Letöltés</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
