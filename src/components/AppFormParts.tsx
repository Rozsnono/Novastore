'use client';

/**
 * Az "Új alkalmazás" és "Alkalmazás szerkesztése" oldal közös építőelemei
 * (Karmazsin téma): kitöltött stílusú mező, számozott szekció, hozzáférés-csempék,
 * élő előnézet kártya és a felső műveletsáv.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Globe, User, BadgeCheck, Lock, Package, Loader2 } from 'lucide-react';
import { AppAccessLevel } from '@/types';

/* ------------------------------------------------------------------ */
/* Mezők                                                               */
/* ------------------------------------------------------------------ */

/** A beágyazott input/textarea közös, keret nélküli stílusa (a keretet a Field adja). */
export const bareInputClass =
  'w-full bg-transparent border-0 p-0 mt-0.5 text-sm text-white placeholder-ink-500 focus:outline-none focus:ring-0 disabled:text-ink-400 disabled:cursor-not-allowed';

interface FieldProps {
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Kitöltött stílusú mező: puha háttér, a címke a mezőn belül; fókuszkor piros keretet kap.
 * A gyerek egy `bareInputClass` osztályú input/textarea legyen.
 */
export function Field({ label, hint, disabled, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label
        className={`block rounded-xl border border-transparent px-3.5 py-2.5 transition-colors ${
          disabled
            ? 'bg-[#242020]/50'
            : 'bg-[#242020] focus-within:border-acc-500 focus-within:bg-[#2a2222]'
        }`}
      >
        <span className="block text-[11px] text-ink-400">{label}</span>
        {children}
      </label>
      {hint && <p className="text-[11px] text-ink-500 mt-1.5 px-1">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Szekció                                                             */
/* ------------------------------------------------------------------ */

interface FormSectionProps {
  step: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/** Számozott kártya az űrlap egy lépéséhez. */
export function FormSection({ step, title, aside, children }: FormSectionProps) {
  return (
    <section className="bg-surface-card border border-surface-line rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-acc-900 text-acc-400 text-xs font-semibold flex items-center justify-center shrink-0">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-white flex-1">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hozzáférés                                                          */
/* ------------------------------------------------------------------ */

/** Hozzáférési szintek: azonosító, felirat, rövid leírás, ikon. */
const ACCESS_OPTIONS: {
  value: AppAccessLevel;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'public', label: 'Nyilvános', desc: 'Bárki, regisztráció nélkül', Icon: Globe },
  { value: 'registered', label: 'Regisztrált', desc: 'Bejelentkezett fiókkal', Icon: User },
  { value: 'age_18', label: '18+', desc: 'Csak nagykorúaknak', Icon: BadgeCheck },
  { value: 'restricted', label: 'Zárt', desc: 'Kijelölt szerepkörök', Icon: Lock },
];

const ROLES = ['vip', 'tester', 'developer', 'admin'];

/** A hozzáférési szint magyar neve (előnézethez, jelvényhez). */
export function accessLabel(level: AppAccessLevel): string {
  return ACCESS_OPTIONS.find((o) => o.value === level)?.label ?? level;
}

interface AccessPickerProps {
  value: AppAccessLevel;
  onChange: (level: AppAccessLevel) => void;
  roles: string[];
  onRoleToggle: (role: string) => void;
  customPerm: string;
  onCustomPermChange: (value: string) => void;
}

/** Négy csempe a hozzáférési szinthez; zárt szintnél szerepkörök és egyedi címkék. */
export function AccessPicker({
  value,
  onChange,
  roles,
  onRoleToggle,
  customPerm,
  onCustomPermChange,
}: AccessPickerProps) {
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Hozzáférési szint" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {ACCESS_OPTIONS.map(({ value: v, label, desc, Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(v)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                selected
                  ? 'border-acc-500 bg-acc-900 text-white'
                  : 'border-surface-line bg-surface hover:border-ink-600 text-ink-300'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon className={`w-4 h-4 ${selected ? 'text-acc-400' : 'text-ink-400'}`} />
                {label}
              </span>
              <span className="block text-[11px] text-ink-400 mt-1">{desc}</span>
            </button>
          );
        })}
      </div>

      {value === 'restricted' && (
        <div className="rounded-xl border border-surface-line bg-surface p-4 space-y-3">
          <p className="text-xs text-ink-300">Engedélyezett szerepkörök</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleToggle(role)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  roles.includes(role)
                    ? 'bg-acc-500 border-acc-500 text-white'
                    : 'border-surface-line text-ink-400 hover:text-ink-200'
                }`}
              >
                {role.toUpperCase()}
              </button>
            ))}
          </div>
          <Field label="Egyedi jogosultsági címkék (vesszővel elválasztva)">
            <input
              type="text"
              value={customPerm}
              onChange={(e) => onCustomPermChange(e.target.value)}
              placeholder="pl. internal-tools, cluedo-beta, staff"
              className={`${bareInputClass} font-mono text-xs`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Előnézet                                                            */
/* ------------------------------------------------------------------ */

interface AppPreviewProps {
  title: string;
  versionName: string;
  sizeBytes: number;
  iconUrl: string;
  accessLevel: AppAccessLevel;
}

/** Élő előnézet: így jelenik meg az app kártyája a mobil boltban. */
export function AppPreview({ title, versionName, sizeBytes, iconUrl, accessLevel }: AppPreviewProps) {
  return (
    <section className="bg-surface-card border border-surface-line rounded-2xl p-5">
      <p className="text-[11px] tracking-wider text-ink-400 mb-3">ÉLŐ ELŐNÉZET</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-acc-900 overflow-hidden flex items-center justify-center shrink-0">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-acc-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title || 'Alkalmazás neve'}</p>
          <p className="text-[11px] text-ink-400 font-mono">
            v{versionName || '—'} · {(sizeBytes / (1024 * 1024)).toFixed(1)} MB
          </p>
        </div>
        <span className="rounded-full bg-acc-500 text-white text-xs font-medium px-3 py-1">Telepít</span>
      </div>
      <span className="inline-block mt-3 rounded-full bg-acc-900 text-acc-400 text-[11px] px-2.5 py-0.5">
        {accessLabel(accessLevel).toLowerCase()}
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Felső műveletsáv                                                    */
/* ------------------------------------------------------------------ */

interface FormTopBarProps {
  title: string;
  subtitle?: string;
  submitLabel: string;
  busy: boolean;
  /** Ha nem üres, a mentés tiltott, és a lista megjelenik a gomb mellett ("Hiányzik: …"). */
  missing?: string[];
  /** A `<form id>` értéke, amelyhez a gomb tartozik. */
  formId: string;
}

/** Görgetéskor is látható felső sáv: vissza, cím, Mégse és mentés gomb. */
export function FormTopBar({ title, subtitle, submitLabel, busy, missing = [], formId }: FormTopBarProps) {
  const blocked = busy || missing.length > 0;
  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-surface/90 backdrop-blur border-b border-surface-line">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <Link
          href="/admin"
          aria-label="Vissza az alkalmazásokhoz"
          className="p-2 rounded-xl text-ink-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-ink-400 font-mono truncate">{subtitle}</p>}
        </div>
        {missing.length > 0 && (
          <span className="hidden sm:inline text-xs text-ink-400">Hiányzik: {missing.join(', ')}</span>
        )}
        <Link
          href="/admin"
          className="px-4 py-2 rounded-xl text-sm text-ink-300 border border-surface-line hover:bg-white/5 transition-colors"
        >
          Mégse
        </Link>
        <button
          type="submit"
          form={formId}
          disabled={blocked}
          title={missing.length ? `Hiányzik: ${missing.join(', ')}` : undefined}
          className="glow-button px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{submitLabel}</span>
        </button>
      </div>
    </div>
  );
}
