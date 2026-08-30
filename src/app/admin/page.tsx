import React from 'react';
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
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <AdminNavbar currentPath="/admin" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Application Inventory
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your private APK repository, versions, and WebDAV NAS backups
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>WebDAV NAS Connected</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">{totalApps}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Total Packages
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-purple-300">
                {totalDownloads.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Total Downloads
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-cyan-300">{totalMB} MB</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Storage Used
              </p>
            </div>
          </div>
        </div>

        {/* Interactive App List Table */}
        <AdminAppList initialApps={apps} />
      </main>
    </div>
  );
}
