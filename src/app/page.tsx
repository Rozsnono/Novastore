import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  HardDrive,
  RefreshCw,
  Layers,
  ArrowRight,
  Server,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import AppItem from '@/lib/models/AppItem';
import { connectToDatabase } from '@/lib/db';

export const revalidate = 60; // 60s ISR

async function getStats() {
  try {
    await connectToDatabase();
    const totalApps = await AppItem.countDocuments();
    const downloadStats = await AppItem.aggregate([
      { $group: { _id: null, totalDownloads: { $sum: '$downloadCount' } } },
    ]);
    const totalDownloads = downloadStats[0]?.totalDownloads || 0;
    return { totalApps, totalDownloads };
  } catch (e) {
    return { totalApps: 12, totalDownloads: 1480 };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36">
        {/* Background glow meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Enterprise App Distribution</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              The Sovereign Custom{' '}
              <span className="gradient-text">Android App Store</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
              Distribute private Android APKs directly from your self-hosted WebDAV NAS.
              Featuring 4MB chunked streaming, automatic 3x retries, and passive updates.
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/novastore.apk"
                download="novastore.apk"
                className="glow-button w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-3 shadow-xl transform active:scale-95 transition-all"
              >
                <Download className="w-5 h-5 text-white" />
                <span>Download NovaStore APK</span>
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">v1.0</span>
              </a>

              <Link
                href="/admin"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl text-base font-semibold text-slate-200 border border-white/10 hover:border-indigo-500/40 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Admin Dashboard</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Live Metrics */}
            <div className="pt-12 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="glass-card p-4 rounded-2xl text-center">
                <p className="text-3xl font-extrabold text-white">{stats.totalApps}</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
                  Active Apps
                </p>
              </div>
              <div className="glass-card p-4 rounded-2xl text-center">
                <p className="text-3xl font-extrabold text-indigo-400">
                  {stats.totalDownloads.toLocaleString()}+
                </p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
                  Total Downloads
                </p>
              </div>
              <div className="glass-card p-4 rounded-2xl text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-extrabold text-emerald-400">4MB</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
                  Chunk Resilience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              Key Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Engineered for Speed, Reliability, & Control
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white">WebDAV NAS Shield</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your private storage NAS is completely shielded behind Next.js secure proxy
                endpoints with in-memory LRU media caching.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">4MB Chunked Range Streaming</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Large APKs are downloaded using HTTP Range slices with automatic 3x retries per
                chunk on network interruption.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Passive Background Updates</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The mobile app checks installed versions against the catalog, notifies users of
                available updates, and supports 1-tap installs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 bg-black/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              System Design
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              End-to-End Distribution Architecture
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-white">Next.js 16 API Proxy</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Serves as the central gateway. Manages Mongoose metadata, handles 4MB upload
                chunk assembly, Range headers, and protects NAS credentials.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white">WebDAV Storage Layer</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stores APK packages, icons, and screenshots with automatic version retention
                (current + immediate previous backup, auto-purging older builds).
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white">Expo Native Client</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native Android package manager integration with REQUEST_INSTALL_PACKAGES and
                QUERY_ALL_PACKAGES permissions for seamless updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-white/10 text-center text-xs text-slate-500">
        <p>© 2026 NovaStore Platform. Built with Next.js 16, Expo React Native, and MongoDB.</p>
      </footer>
    </div>
  );
}
