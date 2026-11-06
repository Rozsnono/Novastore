'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import ChunkedUploader from '@/components/ChunkedUploader';
import MediaUploader from '@/components/MediaUploader';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Field, FormSection, FormTopBar, AccessPicker, AppPreview, bareInputClass } from '@/components/AppFormParts';
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

  // Ami még hiányzik a közzétételhez (a Közzététel gomb ezek nélkül tiltott)
  const missing: string[] = [];
  if (!formData.iconUrl) missing.push('ikon');
  if (!formData.apkWebDavPath) missing.push('APK');

  return (
    <div className="min-h-screen flex flex-col bg-surface text-white">
      <AdminNavbar currentPath="/admin/apps/new" />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-10">
        <FormTopBar
          title="Új alkalmazás"
          subtitle="Alkalmazáscsomag közzététele darabolt feltöltéssel és jogosultságokkal"
          submitLabel={loading ? 'Közzététel...' : 'Közzététel'}
          busy={loading}
          missing={missing}
          formId="app-form"
        />

        <form
          id="app-form"
          onSubmit={handleSubmit}
          className="max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start"
        >
          {/* Bal oszlop: kitöltendő adatok */}
          <div className="space-y-6 min-w-0">
            <FormSection step={1} title="Alapadatok">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Alkalmazás neve *">
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="pl. Nova Analytics"
                    className={bareInputClass}
                  />
                </Field>

                <Field label="Csomagnév (egyedi azonosító) *">
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
                    className={`${bareInputClass} font-mono`}
                  />
                </Field>

                <Field label="Verziónév (kijelzett) *">
                  <input
                    type="text"
                    required
                    value={formData.versionName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, versionName: e.target.value }))}
                    placeholder="pl. 1.0.0"
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
                    placeholder="pl. 1"
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
                  placeholder="Részletes leírás az alkalmazás funkcióiról és újdonságairól..."
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

          {/* Jobb oszlop: előnézet és feltöltés (asztali nézetben görgetéskor is látszik) */}
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
              title="APK feltöltés"
              aside={
                formData.apkWebDavPath && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    APK kész
                  </span>
                )
              }
            >
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
          </div>
        </form>
      </main>
    </div>
  );
}
