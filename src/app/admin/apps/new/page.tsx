'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { ArrowLeft, Save, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

export default function NewAppPage() {
  const router = useRouter();
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.packageName || !formData.versionName || !formData.description) {
      setError('Please fill in all basic application details.');
      return;
    }

    if (!formData.iconUrl) {
      setError('Please upload an App Icon.');
      return;
    }

    if (!formData.apkWebDavPath) {
      setError('Please upload the APK file using the chunked uploader below.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create application');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <AdminNavbar currentPath="/admin/apps/new" />

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
              <h1 className="text-2xl font-extrabold text-white">Add New Application</h1>
              <p className="text-xs text-slate-400">
                Deploy a new Android package with 4MB chunked streaming
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Application Details</span>
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
                  placeholder="e.g. Nova Analytics"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Package Name (Unique) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.packageName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      packageName: e.target.value.toLowerCase().trim(),
                    })
                  }
                  placeholder="e.g. com.nova.analytics"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                  placeholder="e.g. 1.0.0"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Version Code (Integer) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.versionCode}
                  onChange={(e) =>
                    setFormData({ ...formData, versionCode: parseInt(e.target.value, 10) || 1 })
                  }
                  placeholder="e.g. 1"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                placeholder="Detailed description of features, permissions, and changelog..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Media Assets (Icon & Screenshots) */}
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

          {/* Section 3: 4MB Chunked APK Upload */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center justify-between">
              <span>Android APK Binary (4MB Chunked WebDAV Stream)</span>
              {formData.apkWebDavPath && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>APK Ready</span>
                </span>
              )}
            </h2>

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
              disabled={loading || !formData.apkWebDavPath || !formData.iconUrl}
              className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Publishing App...' : 'Publish Application'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
