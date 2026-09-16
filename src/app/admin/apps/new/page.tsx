'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { ArrowLeft, Save, AlertCircle, Sparkles, CheckCircle, Shield, Lock } from 'lucide-react';
import { AppAccessLevel, UserRole } from '@/types';

export default function NewAppPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    packageName: '',
    versionCode: 1 as number | string,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!formData.title || !formData.packageName || !formData.versionName || !formData.description) {
      setError('Kérlek töltsd ki az alkalmazás alapadatokat.');
      return;
    }

    if (!formData.iconUrl) {
      setError('Kérlek tölts fel egy alkalmazás ikont.');
      return;
    }

    if (!formData.apkWebDavPath) {
      setError('Kérlek töltsd fel az APK fájlt a lenti feltöltővel.');
      return;
    }

    setLoading(true);

    const finalVersionCode = Math.max(1, parseInt(String(formData.versionCode), 10) || 1);

    const payload = {
      ...formData,
      versionCode: finalVersionCode,
      requiredPermissions: customPermInput
        ? customPermInput.split(',').map((p) => p.trim()).filter(Boolean)
        : formData.requiredPermissions,
    };

    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hiba történt az alkalmazás mentésekor');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Hiba történt a mentés során');
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
              <h1 className="text-2xl font-extrabold text-white">Új Alkalmazás Hozzáadása</h1>
              <p className="text-xs text-slate-400">
                Alkalmazáscsomag közzététele 4MB darabolt WebDAV streameléssel és jogosultságokkal
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Alapadatok</span>
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="pl. Nova Analytics"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Csomagnév (Egyedi azonosító) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.packageName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      packageName: e.target.value.toLowerCase().trim(),
                    }))
                  }
                  placeholder="pl. com.nova.analytics"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Verziószám (Kijelzett) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.versionName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, versionName: e.target.value }))}
                  placeholder="pl. 1.0.0"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Verziókód (Egész szám) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={formData.versionCode}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      versionCode: raw === '' ? '' : parseInt(raw, 10) || '',
                    }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      versionCode:
                        !prev.versionCode || Number(prev.versionCode) < 1
                          ? 1
                          : Number(prev.versionCode),
                    }));
                  }}
                  placeholder="pl. 1"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Belső verziószám (pl. 7). Frissítés észlelésekor a kliens ezt hasonlítja össze.
                </p>
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
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Részletes leírás az alkalmazás funkcióiról és újdonságairól..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                  onChange={() => setFormData((prev) => ({ ...prev, accessLevel: 'public' }))}
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
                  onChange={() => setFormData((prev) => ({ ...prev, accessLevel: 'registered' }))}
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
                  onChange={() => setFormData((prev) => ({ ...prev, accessLevel: 'age_18' }))}
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
                  onChange={() => setFormData((prev) => ({ ...prev, accessLevel: 'restricted' }))}
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

          {/* Section 3: Media Assets (Icon & Screenshots) */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Média & Ikonok
            </h2>

            <MediaUploader
              packageName={formData.packageName}
              iconUrl={formData.iconUrl}
              screenshots={formData.screenshots}
              onIconChange={(url) => setFormData((prev) => ({ ...prev, iconUrl: url }))}
              onScreenshotsChange={(urls) => setFormData((prev) => ({ ...prev, screenshots: urls }))}
            />
          </div>

          {/* Section 4: 4MB Chunked APK Upload */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center justify-between">
              <span>Android APK Bináris (4MB Darabolt Feltöltés)</span>
              {formData.apkWebDavPath && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>APK Készen áll</span>
                </span>
              )}
            </h2>

            <ChunkedUploader
              packageName={formData.packageName}
              versionCode={formData.versionCode}
              onUploadSuccess={({ apkWebDavPath, sizeBytes }) => {
                setFormData((prev) => ({
                  ...prev,
                  apkWebDavPath,
                  sizeBytes,
                }));
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
              disabled={loading || !formData.apkWebDavPath || !formData.iconUrl}
              className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Közzététel...' : 'Alkalmazás Közzététele'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
