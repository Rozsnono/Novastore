'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Edit3, Trash2, ExternalLink, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { IAppItem } from '@/types';

interface AdminAppListProps {
  initialApps: IAppItem[];
}

export default function AdminAppList({ initialApps }: AdminAppListProps) {
  const [apps, setApps] = useState<IAppItem[]>(initialApps);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IAppItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const filteredApps = apps.filter(
    (app) =>
      app.title.toLowerCase().includes(search.toLowerCase()) ||
      app.packageName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget._id) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/apps/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete app');

      setApps((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      alert('Error deleting application and NAS files');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or package name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <Link
          href="/admin/apps/new"
          className="glow-button px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          + Add New Application
        </Link>
      </div>

      {/* Table Card */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400 border-b border-white/10 font-semibold">
              <tr>
                <th className="py-4 px-6">Application</th>
                <th className="py-4 px-6">Package Name</th>
                <th className="py-4 px-6">Version</th>
                <th className="py-4 px-6">Size</th>
                <th className="py-4 px-6">Downloads</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    {search ? 'No applications match your search query.' : 'No applications found. Upload your first APK!'}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={app.iconUrl}
                            alt={app.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {app.title}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-[200px]">
                            {app.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-indigo-300">
                      {app.packageName}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">v{app.versionName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Code: {app.versionCode}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-slate-300 font-mono text-xs">
                      {(app.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                        <Download className="w-3 h-3" />
                        <span>{app.downloadCount.toLocaleString()}</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/apps/${app._id}/edit`}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors"
                          title="Edit & Update APK"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => setDeleteTarget(app)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                          title="Delete App and Purge from NAS"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-red-500/20 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Permanently Delete Application?</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.title}</strong> (
              <span className="font-mono text-xs text-indigo-300">{deleteTarget.packageName}</span>)? This will
              delete its database record and <strong>permanently purge all APKs and media from your WebDAV NAS</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 border border-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Purging NAS...</span>
                  </>
                ) : (
                  <span>Yes, Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
