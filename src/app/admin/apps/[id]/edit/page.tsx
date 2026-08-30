'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { ArrowLeft, Save, AlertCircle, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { IAppItem } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAppPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<IAppItem | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    packageName: '',
    versionCode: 1,
    versionName: '1.0.0',
    description: '',
    iconUrl: '',
    screenshots: [] as string[],
    apkWebDavPath: '',
    sizeBytes: 0,
  });

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/admin/apps/${id}`);
        if (!res.ok) throw new Error('App not found');
        const data = await res.json();
        setApp(data.data);
        setFormData({
          title: data.data.title,
          packageName: data.data.packageName,
          versionCode: data.data.versionCode,
          versionName: data.data.versionName,
          description: data.data.description,
          iconUrl: data.data.iconUrl,
          screenshots: data.data.screenshots || [],
          apkWebDavPath: data.data.apkWebDavPath,
          sizeBytes: data.data.sizeBytes,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load app');
      } finally {
        setLoading(false);
      }
    }
    fetchApp();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/apps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update application');

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error updating application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <AdminNavbar currentPath="/admin" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Edit Application</h1>
              <p className="text-xs font-mono text-indigo-400">{formData.packageName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Details */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Application Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  App Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Package Name (Locked)
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.packageName}
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-sm font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Version Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.versionName}
                  onChange={(e) => setFormData({ ...formData, versionName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Version Code *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.versionCode}
                  onChange={(e) =>
                    setFormData({ ...formData, versionCode: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Media Assets */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Media & Assets
            </h2>

            <MediaUploader
              packageName={formData.packageName}
              iconUrl={formData.iconUrl}
              screenshots={formData.screenshots}
              onIconChange={(url) => setFormData({ ...formData, iconUrl: url })}
              onScreenshotsChange={(urls) => setFormData({ ...formData, screenshots: urls })}
            />
          </div>

          {/* APK Update & NAS Version Retention */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center justify-between">
                <span>Upload New APK Version (4MB Chunked)</span>
                <span className="text-xs text-slate-400 font-mono">
                  Current size: {(formData.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Uploading a new version will preserve the current APK on your WebDAV NAS as a backup
                and automatically purge older iterations.
              </p>
            </div>

            <ChunkedUploader
              packageName={formData.packageName}
              versionCode={formData.versionCode}
              onUploadSuccess={({ apkWebDavPath, sizeBytes }) => {
                setFormData({
                  ...formData,
                  apkWebDavPath,
                  sizeBytes,
                });
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <Link
              href="/admin"
              className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 border border-white/10 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save & Update Package'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
