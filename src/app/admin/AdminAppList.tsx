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
      if (!res.ok) throw new Error('Az alkalmazás törlése nem sikerült');

      setApps((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      alert('Hiba történt az alkalmazás és a NAS fájlok törlésekor');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés név vagy csomagnév alapján..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-surface-line rounded-xl text-sm text-white placeholder-ink-500 focus:outline-none focus:border-acc-500 focus:ring-1 focus:ring-acc-500"
          />
        </div>

        <Link
          href="/admin/apps/new"
          className="glow-button px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          + Új alkalmazás
        </Link>
      </div>

      {/* Table Card */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-300">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-ink-400 border-b border-white/10 font-semibold">
              <tr>
                <th className="py-4 px-6">Alkalmazás</th>
                <th className="py-4 px-6">Csomagnév</th>
                <th className="py-4 px-6">Verzió</th>
                <th className="py-4 px-6">Méret</th>
                <th className="py-4 px-6">Letöltések</th>
                <th className="py-4 px-6">Utolsó frissítés</th>
                <th className="py-4 px-6 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-500 text-sm">
                    {search ? 'Nincs a keresésnek megfelelő alkalmazás.' : 'Még nincs alkalmazás. Tölts fel egy APK-t!'}
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
                          <p className="font-semibold text-white group-hover:text-acc-300 transition-colors">
                            {app.title}
                          </p>
                          <p className="text-xs text-ink-400 line-clamp-1 max-w-[200px]">
                            {app.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-acc-300">
                      {app.packageName}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">v{app.versionName}</span>
                        <span className="text-[10px] text-ink-400 font-mono">
                          Kód: {app.versionCode}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-ink-300 font-mono text-xs">
                      {(app.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-acc-500/10 text-acc-300 border border-acc-500/20 text-xs font-semibold">
                        <Download className="w-3 h-3" />
                        <span>{app.downloadCount.toLocaleString()}</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-ink-300">
                      {app.updatedAt ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-200">
                            {new Date(app.updatedAt).toLocaleDateString('hu-HU', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                          <span className="text-[11px] text-ink-400 font-mono">
                            {new Date(app.updatedAt).toLocaleTimeString('hu-HU', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-500">-</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/apps/${app._id}/edit`}
                          className="p-2 text-ink-400 hover:text-acc-400 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors"
                          title="Szerkesztés és APK frissítése"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => setDeleteTarget(app)}
                          className="p-2 text-ink-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg border border-transparent hover:border-amber-500/20 transition-colors"
                          title="Alkalmazás törlése és eltávolítása a NAS-ról"
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
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-amber-500/20 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Véglegesen törlöd az alkalmazást?</h3>
            </div>

            <p className="text-sm text-ink-300 leading-relaxed">
              Biztosan törlöd a(z) <strong className="text-white">{deleteTarget.title}</strong> alkalmazást (
              <span className="font-mono text-xs text-acc-300">{deleteTarget.packageName}</span>)? Ez törli az
              adatbázisbejegyzést, és <strong>véglegesen eltávolítja az összes APK-t és médiafájlt a WebDAV NAS-ról</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-ink-300 hover:bg-white/5 border border-white/10"
              >
                Mégse
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>NAS tisztítása...</span>
                  </>
                ) : (
                  <span>Igen, végleges törlés</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
