'use client';

import React from 'react';
import Link from 'next/link';
import { Download, ShieldCheck, Layers, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              NovaStore
            </span>
            <span className="text-[10px] text-indigo-400 font-medium -mt-1 tracking-wider uppercase">
              App Distribution
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/#features"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block"
          >
            Features
          </Link>
          <Link
            href="/#architecture"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block"
          >
            Architecture
          </Link>
          
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-indigo-400 px-3 py-1.5 rounded-lg border border-white/10 hover:border-indigo-500/30 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Admin Portal</span>
          </Link>

          <a
            href="/novastore.apk"
            download="novastore.apk"
            className="glow-button flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download APK</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
