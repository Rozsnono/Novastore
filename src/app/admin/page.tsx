import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import AdminNavbar from '@/components/AdminNavbar';
import AdminAppList from './AdminAppList';
import { Package, Download, HardDrive, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  await connectToDatabase();
  const rawApps = await AppItem.find().sort({ updatedAt: -1 }).lean();
  const apps = JSON.parse(JSON.stringify(rawApps));

  const totalApps = apps.length;
  const totalDownloads = apps.reduce((acc: number, app: any) => acc + (app.downloadCount || 0), 0);
  const totalBytes = apps.reduce((acc: number, app: any) => acc + (app.sizeBytes || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-white">
      <AdminNavbar currentPath="/admin" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Alkalmazások
            </h1>
            <p className="text-sm text-ink-400 mt-1">
              APK-tár, verziók és NAS tárhely kezelése
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NAS tároló</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-acc-500/10 border border-acc-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-acc-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">{totalApps}</p>
              <p className="text-xs text-ink-400 font-medium uppercase tracking-wider">
                Csomagok
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-acc-500/10 border border-acc-500/20 flex items-center justify-center">
              <Download className="w-6 h-6 text-acc-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-acc-300">
                {totalDownloads.toLocaleString()}
              </p>
              <p className="text-xs text-ink-400 font-medium uppercase tracking-wider">
                Letöltések
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-acc-500/10 border border-acc-500/20 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-acc-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-acc-300">{totalMB} MB</p>
              <p className="text-xs text-ink-400 font-medium uppercase tracking-wider">
                Tárhely
              </p>
            </div>
          </div>
        </div>

        {/* Legutóbb frissített appok (a lista már updatedAt szerint rendezett) */}
        {apps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-ink-200">Legutóbbi appok</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {apps.slice(0, 4).map((app: any) => (
                <Link
                  key={app._id}
                  href={`/admin/apps/${app._id}/edit`}
                  className="glass-card p-3 rounded-2xl block"
                >
                  <div className="aspect-[16/10] rounded-xl bg-acc-900 overflow-hidden mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {app.iconUrl && <img src={app.iconUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{app.title}</p>
                  <p className="text-xs text-ink-400 font-mono">
                    v{app.versionName} · {((app.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Interactive App List Table */}
        <AdminAppList initialApps={apps} />
      </main>
    </div>
  );
}
