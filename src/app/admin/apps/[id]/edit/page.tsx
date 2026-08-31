'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { ArrowLeft, Save, AlertCircle, RefreshCw, CheckCircle, Loader2, Shield } from 'lucide-react';
import { IAppItem, AppAccessLevel } from '@/types';

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
    accessLevel: 'public' as AppAccessLevel,
    requiredRoles: [] as string[],
    requiredPermissions: [] as string[],
  });

  const [customPermInput, setCustomPermInput] = useState('');

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
          accessLevel: data.data.accessLevel || 'public',
          requiredRoles: data.data.requiredRoles || [],
          requiredPermissions: data.data.requiredPermissions || [],
        });
        setCustomPermInput((data.data.requiredPermissions || []).join(', '));
      } catch (err: any) {
        setError(err.message || 'Failed to load app');
      } finally {
        setLoading(false);
      }
    }
    fetchApp();
  }, [id]);

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => {
      const exists = prev.requiredRoles.includes(role);
      const updated = exists
        ? prev.requiredRoles.filter((r) => r !== role)
        : [...prev.requiredRoles, role];
      return { ...prev, requiredRoles: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      ...formData,
      requiredPermissions: customPermInput
        ? customPermInput.split(',').map((p) => p.trim()).filter(Boolean)
        : formData.requiredPermissions,
    };

    try {
      const res = await fetch(`/api/admin/apps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba történt az alkalmazás frissítésekor');

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Hiba történt a mentés során');
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
              <h1 className="text-2xl font-extrabold text-white">Alkalmazás Szerkesztése</h1>
              <p className="text-xs font-mono text-indigo-400">{formData.packageName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Details */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Alapadatok
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Alkalmazás Neve *
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
                  Csomagnév (Zárolt)
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
                  Verziószám *
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
                  Verziókód *
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
                Leírás *
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

          {/* Section 2: Access Control & Permissions */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Hozzáférési Szint & Jogosultságok</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.accessLevel === 'public'
                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <input
                  type="radio"
                  name="accessLevel"
                  value="public"
                  checked={formData.accessLevel === 'public'}
                  onChange={() => setFormData({ ...formData, accessLevel: 'public' })}
                  className="hidden"
                />
                <span className="font-bold text-sm">🌍 Nyilvános (Public)</span>
                <span className="text-xs text-slate-400">Bárki letöltheti regisztráció nélkül.</span>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.accessLevel === 'registered'
                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <input
                  type="radio"
                  name="accessLevel"
                  value="registered"
                  checked={formData.accessLevel === 'registered'}
                  onChange={() => setFormData({ ...formData, accessLevel: 'registered' })}
                  className="hidden"
                />
                <span className="font-bold text-sm">👤 Regisztráltak</span>
                <span className="text-xs text-slate-400">Bejelentkezett fiók szükséges a letöltéshez.</span>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.accessLevel === 'age_18'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <input
                  type="radio"
                  name="accessLevel"
                  value="age_18"
                  checked={formData.accessLevel === 'age_18'}
                  onChange={() => setFormData({ ...formData, accessLevel: 'age_18' })}
                  className="hidden"
                />
                <span className="font-bold text-sm">🔞 18+ Korhatáros</span>
                <span className="text-xs text-slate-400">Csak 18 éven felüli regisztrált felhasználóknak.</span>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  formData.accessLevel === 'restricted'
                    ? 'bg-purple-500/10 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <input
                  type="radio"
                  name="accessLevel"
                  value="restricted"
                  checked={formData.accessLevel === 'restricted'}
                  onChange={() => setFormData({ ...formData, accessLevel: 'restricted' })}
                  className="hidden"
                />
                <span className="font-bold text-sm">🔒 Zárt / VIP Hozzáférés</span>
                <span className="text-xs text-slate-400">Csak a kijelölt szerepkörök tölthetik le.</span>
              </label>
            </div>

            {formData.accessLevel === 'restricted' && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Engedélyezett Szerepkörök (Roles)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['vip', 'tester', 'developer', 'admin'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        formData.requiredRoles.includes(role)
                          ? 'bg-indigo-500 border-indigo-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Egyedi jogosultsági címkék (vesszővel elválasztva)
                  </label>
                  <input
                    type="text"
                    value={customPermInput}
                    onChange={(e) => setCustomPermInput(e.target.value)}
                    placeholder="pl. internal-tools, cluedo-beta, staff"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Media Assets */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Média & Ikonok
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
                <span>Új APK Verzió Feltöltése (4MB Darabolt WebDAV)</span>
                <span className="text-xs text-slate-400 font-mono">
                  Jelenlegi méret: {(formData.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Új verzió feltöltésekor a korábbi aktív verzió automatikusan biztonsági másolatként (backup)
                mentődik a WebDAV szerveren.
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
              Mégse
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Mentés folyamatban...' : 'Módosítások Mentése'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
