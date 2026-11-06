'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Field, FormSection, FormTopBar, AccessPicker, AppPreview, bareInputClass } from '@/components/AppFormParts';
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

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/admin/apps/${id}`);
        if (!res.ok) throw new Error('Az alkalmazás nem található');
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
        setError(err.message || 'Az alkalmazás betöltése nem sikerült');
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

  /** Alkalmazás törlése (DB + NAS fájlok) megerősítés után. */
  const handleDelete = async () => {
    if (
      !confirm(
        `Biztosan törlöd a(z) ${formData.title} alkalmazást? Az adatbázisbejegyzés és az összes APK/médiafájl véglegesen törlődik a NAS-ról.`
      )
    ) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/apps/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Az alkalmazás törlése nem sikerült');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      console.error('Delete app error:', err);
      setError(err.message || 'Az alkalmazás törlése nem sikerült');
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const finalVersionCode = Math.max(1, parseInt(String(formData.versionCode), 10) || 1);

    const payload = {
      ...formData,
      versionCode: finalVersionCode,
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
      <div className="min-h-screen flex items-center justify-center bg-surface text-white">
        <Loader2 className="w-8 h-8 text-acc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-white">
      <AdminNavbar currentPath="/admin" />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-10">
        <FormTopBar
          title="Alkalmazás szerkesztése"
          subtitle={formData.packageName}
          submitLabel={saving ? 'Mentés...' : 'Módosítások mentése'}
          busy={saving}
          formId="app-form"
        />

        <form
          id="app-form"
          onSubmit={handleSubmit}
          className="max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start"
        >
          {/* Bal oszlop: szerkeszthető adatok */}
          <div className="space-y-6 min-w-0">
            <FormSection step={1} title="Alapadatok">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Alkalmazás neve *">
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className={bareInputClass}
                  />
                </Field>

                <Field label="Csomagnév (zárolt)" disabled>
                  <input type="text" disabled value={formData.packageName} className={`${bareInputClass} font-mono`} />
                </Field>

                <Field label="Verziónév *">
                  <input
                    type="text"
                    required
                    value={formData.versionName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, versionName: e.target.value }))}
                    className={bareInputClass}
                  />
                </Field>

                <Field label="Verziókód (egész szám) *">
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
                    className={`${bareInputClass} font-mono`}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-ink-500 -mt-1 px-1">
                A verziókód belső egész szám (pl. 7); frissítés észlelésekor a kliens ezt hasonlítja össze.
              </p>

              <Field label="Leírás *">
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className={`${bareInputClass} resize-y`}
                />
              </Field>
            </FormSection>

            <FormSection step={2} title="Ki töltheti le?">
              <AccessPicker
                value={formData.accessLevel}
                onChange={(level) => setFormData((prev) => ({ ...prev, accessLevel: level }))}
                roles={formData.requiredRoles}
                onRoleToggle={handleRoleToggle}
                customPerm={customPermInput}
                onCustomPermChange={setCustomPermInput}
              />
            </FormSection>

            <FormSection step={3} title="Ikon és képernyőképek">
              <MediaUploader
                packageName={formData.packageName}
                iconUrl={formData.iconUrl}
                screenshots={formData.screenshots}
                onIconChange={(url) => setFormData((prev) => ({ ...prev, iconUrl: url }))}
                onScreenshotsChange={(urls) => setFormData((prev) => ({ ...prev, screenshots: urls }))}
              />
            </FormSection>
          </div>

          {/* Jobb oszlop: előnézet, új APK verzió, veszélyzóna */}
          <div className="space-y-6 min-w-0 lg:sticky lg:top-24">
            <AppPreview
              title={formData.title}
              versionName={formData.versionName}
              sizeBytes={formData.sizeBytes}
              iconUrl={formData.iconUrl}
              accessLevel={formData.accessLevel}
            />

            <FormSection
              step={4}
              title="Új APK verzió feltöltése"
              aside={
                <span className="text-[11px] text-ink-400 font-mono">
                  Jelenlegi: v{app?.versionName} · {((app?.sizeBytes ?? formData.sizeBytes) / (1024 * 1024)).toFixed(1)} MB
                </span>
              }
            >
              <p className="text-xs text-ink-400">
                Új verzió feltöltésekor a korábbi aktív verzió automatikusan biztonsági másolatként
                mentődik a NAS tárolón.
              </p>
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
            </FormSection>

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <section className="rounded-2xl border border-amber-500/30 bg-surface-card p-5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">Veszélyzóna</p>
                <p className="text-xs text-ink-400">Az alkalmazás és a NAS-on tárolt fájljai végleg törlődnek.</p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Törlés
              </button>
            </section>
          </div>
        </form>
      </main>
    </div>
  );
}
