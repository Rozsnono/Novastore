import React from 'react';

/** Egy szelet a körgrafikonon. */
export interface DonutSlice {
  label: string;
  value: number;
}

interface StorageDonutProps {
  slices: DonutSlice[];
  /** A kör közepén megjelenő fő szöveg (pl. "412 MB"). */
  centerLabel: string;
  /** A kör közepén megjelenő kisebb szöveg. */
  centerSub?: string;
  /** Kompakt mód (oldalsávhoz): kisebb kör, jelmagyarázat nélkül. */
  compact?: boolean;
}

/** Piros árnyalatok a szeletekhez, a legnagyobb szelet a legerősebb. */
const SLICE_COLORS = ['#e5383b', '#f0585b', '#c92a2d', '#ff9a9c', '#a61f22', '#5a1d1f'];

/**
 * Tiszta SVG körgrafikon (szerveroldalon is renderelhető, külső függőség nélkül).
 * Üres adatnál (0 összeg) üres gyűrűt rajzol.
 */
export default function StorageDonut({ slices, centerLabel, centerSub, compact = false }: StorageDonutProps) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className={`relative ${compact ? 'w-28 h-28' : 'w-44 h-44'}`}>
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" role="img" aria-label="Tárhelyhasználat appok szerint">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#272222" strokeWidth="16" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`${compact ? 'text-base' : 'text-2xl'} font-bold text-white`}>{centerLabel}</span>
          {centerSub && <span className="text-[11px] text-ink-400 mt-0.5">{centerSub}</span>}
        </div>
      </div>

      {!compact && (
      <ul className="w-full space-y-1.5 text-xs">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-ink-300">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="truncate flex-1">{s.label}</span>
            <span className="font-mono text-ink-400">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
