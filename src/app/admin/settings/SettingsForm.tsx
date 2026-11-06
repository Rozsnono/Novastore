'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Dices, KeyRound, Loader2, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { Field, bareInputClass } from '@/components/AppFormParts';

type SecretName = 'uploadKey' | 'downloadKey' | 'clientSecret';
type TextName = 'uploadUrl' | 'downloadUrl';

interface SecretStatus {
  name: SecretName;
  configured: boolean;
  source: 'db' | 'env' | 'none';
  hint: string | null;
  updatedAt: string | null;
}

interface TextStatus {
  name: TextName;
  configured: boolean;
  source: 'db' | 'env' | 'none';
  value: string | null;
  updatedAt: string | null;
}

/** A szolgáltatás URL-ek leírása (nem titkosak, a felület megjeleníti őket). */
const URL_FIELDS: { name: TextName; label: string; help: string; placeholder: string }[] = [
  {
    name: 'uploadUrl',
    label: 'Feltöltési API URL',
    help: 'A NAS feltöltő szolgáltatás címe (az admin feltöltő ide küldi az APK-t).',
    placeholder: 'https://storage.example.com',
  },
  {
    name: 'downloadUrl',
    label: 'Letöltési API URL',
    help: 'A NAS letöltő szolgáltatás címe, ezt kapja a telefon. Üresen hagyva a feltöltési URL érvényes.',
    placeholder: 'https://storage.example.com',
  },
];

/** A titkos kulcsok leírása (felirat, magyarázat, súgó). */
const FIELDS: { name: SecretName; label: string; help: string; canGenerate?: boolean }[] = [
  {
    name: 'downloadKey',
    label: 'Letöltési API kulcs',
    help: 'Ezt kapja meg a telefon titkosítva az APK letöltéséhez. Ha üresen hagyod, a feltöltési kulcs érvényes.',
  },
  {
    name: 'uploadKey',
    label: 'Feltöltési API kulcs',
    help: 'Az admin felület feltöltője használja az APK-k NAS-ra küldéséhez. Csak bejelentkezett admin kapja meg.',
  },
  {
    name: 'clientSecret',
    label: 'Alkalmazás-titok (titkosításhoz)',
    help: 'A telefonnak küldött letöltési kulcs titkosításához. Az app buildben ugyanennek kell szerepelnie (EXPO_PUBLIC_CLIENT_SECRET).',
    canGenerate: true,
  },
];

/** Forrás magyar neve a jelvényhez. */
function sourceLabel(s: SecretStatus): string {
  if (!s.configured) return 'Nincs beállítva';
  return s.source === 'db' ? 'Beállítva (titkosítva az adatbázisban)' : 'Környezeti változóból (tartalék)';
}

/**
 * Admin beállítások: API kulcsok megadása. A kulcsok értéke sosem jelenik meg újra;
 * csak az állapot és az utolsó 4 karakter látszik. Üres mező = változatlan.
 */
export default function SettingsForm() {
  const [statuses, setStatuses] = useState<SecretStatus[]>([]);
  const [textStatuses, setTextStatuses] = useState<TextStatus[]>([]);
  // Az URL mezők szerkesztett értéke (a betöltéskor a jelenlegi értékkel töltjük ki)
  const [urlValues, setUrlValues] = useState<Record<TextName, string>>({ uploadUrl: '', downloadUrl: '' });
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const [values, setValues] = useState<Record<SecretName, string>>({ uploadKey: '', downloadKey: '', clientSecret: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'A beállítások betöltése nem sikerült');
      setStatuses(json.data.secrets);
      setTextStatuses(json.data.texts);
      setUrlValues({
        uploadUrl: json.data.texts.find((t: TextStatus) => t.name === 'uploadUrl')?.value ?? '',
        downloadUrl: json.data.texts.find((t: TextStatus) => t.name === 'downloadUrl')?.value ?? '',
      });
      setEncryptionConfigured(json.data.encryptionConfigured);
    } catch (err: any) {
      setError(err.message || 'A beállítások betöltése nem sikerült');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Az URL-ek közül csak a ténylegesen módosítottakat küldjük. */
  const changedUrls = (Object.keys(urlValues) as TextName[]).filter((n) => {
    const current = textStatuses.find((t) => t.name === n)?.value ?? '';
    return urlValues[n].trim() !== current.trim() && urlValues[n].trim() !== '';
  });
  const hasChanges = Object.values(values).some((v) => v.trim()) || changedUrls.length > 0;
  const hasSecretChanges = Object.values(values).some((v) => v.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          ...Object.fromEntries(changedUrls.map((n) => [n, urlValues[n].trim()])),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'A mentés nem sikerült');
      setValues({ uploadKey: '', downloadKey: '', clientSecret: '' });
      setNotice('Mentve. A kulcsok titkosítva tárolódnak.');
      await load();
    } catch (err: any) {
      setError(err.message || 'A mentés nem sikerült');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (name: SecretName | TextName) => {
    if (!confirm('Biztosan törlöd az adatbázisban tárolt értéket? Ha van környezeti változó, az lép érvénybe.')) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/settings?name=${name}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'A törlés nem sikerült');
      setNotice('Az adatbázisban tárolt érték törölve.');
      await load();
    } catch (err: any) {
      setError(err.message || 'A törlés nem sikerült');
    }
  };

  /** Véletlen 256 bites titok a böngésző biztonságos véletlengenerátorával. */
  const generateSecret = (name: SecretName) => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    setValues((prev) => ({ ...prev, [name]: hex }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 text-acc-400 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-3">
          <KeyRound className="w-7 h-7 text-acc-400" />
          Beállítások
        </h1>
        <p className="text-sm text-ink-400 mt-1">
          A NAS feltöltő és letöltő szolgáltatás címei és API kulcsai. A kulcsok titkosítva tárolódnak, és a telefonnak is
          titkosítva jutnak el.
        </p>
      </div>

      {!encryptionConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            A mentéshez add meg a <code className="font-mono">SETTINGS_ENCRYPTION_KEY</code> környezeti változót
            (legalább 32 karakter) a <code className="font-mono">novastore-api/.env.local</code> fájlban, majd
            indítsd újra a szervert. Addig a környezeti változókból érkező kulcsok maradnak érvényben.
          </span>
        </div>
      )}

      <div className="bg-surface-card border border-surface-line rounded-2xl p-5 sm:p-6 space-y-5">
        {URL_FIELDS.map((f) => {
          const status = textStatuses.find((t) => t.name === f.name);
          return (
            <div key={f.name} className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
                    status?.configured ? 'bg-acc-900 text-acc-300' : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {status?.configured ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {!status?.configured
                    ? 'Nincs beállítva'
                    : status.source === 'db'
                    ? 'Beállítva (adatbázis)'
                    : 'Környezeti változóból (tartalék)'}
                </span>
                {status?.source === 'db' && (
                  <button
                    type="button"
                    onClick={() => handleClear(f.name)}
                    className="ml-auto inline-flex items-center gap-1 text-ink-400 hover:text-amber-400 transition-colors"
                    aria-label={`${f.label} törlése`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Törlés
                  </button>
                )}
              </div>
              <Field label={f.label} hint={f.help}>
                <input
                  type="url"
                  value={urlValues[f.name]}
                  onChange={(e) => setUrlValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={`${bareInputClass} font-mono`}
                />
              </Field>
            </div>
          );
        })}
      </div>

      <div className="bg-surface-card border border-surface-line rounded-2xl p-5 sm:p-6 space-y-5">
        {FIELDS.map((f) => {
          const status = statuses.find((s) => s.name === f.name);
          return (
            <div key={f.name} className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
                    status?.configured ? 'bg-acc-900 text-acc-300' : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {status?.configured ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {status ? sourceLabel(status) : 'Ismeretlen'}
                </span>
                {status?.hint && <span className="font-mono text-ink-400">{status.hint}</span>}
                {status?.source === 'db' && (
                  <button
                    type="button"
                    onClick={() => handleClear(f.name)}
                    className="ml-auto inline-flex items-center gap-1 text-ink-400 hover:text-amber-400 transition-colors"
                    aria-label={`${f.label} törlése`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Törlés
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Field label={f.label} className="flex-1" hint={f.help}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={values[f.name]}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    placeholder={status?.configured ? 'Új érték megadása (üresen hagyva változatlan)' : 'Kulcs megadása'}
                    className={`${bareInputClass} font-mono`}
                  />
                </Field>
                {f.canGenerate && (
                  <button
                    type="button"
                    onClick={() => generateSecret(f.name)}
                    title="Véletlen titok generálása"
                    aria-label="Véletlen titok generálása"
                    className="mt-1.5 p-3 rounded-xl border border-surface-line text-ink-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !hasChanges || (hasSecretChanges && !encryptionConfigured)}
          className="glow-button px-6 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Mentés...' : 'Mentés'}</span>
        </button>
      </div>
    </form>
  );
}
