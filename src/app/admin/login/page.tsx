'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, KeyRound, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'A hitelesítés nem sikerült');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Hibás mesterkulcs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-surface">
      {/* Glow Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-acc-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 sm:p-10 rounded-2xl shadow-2xl border border-white/10 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-acc-600 to-acc-500 mx-auto flex items-center justify-center shadow-lg shadow-acc-500/25">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin felület</h1>
            <p className="text-sm text-ink-400">
              Add meg a mesterkulcsot a NovaStore csomagok kezeléséhez
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-300 tracking-wide mb-2">
                Mesterkulcs
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-surface-line rounded-xl text-white placeholder-ink-500 focus:outline-none focus:border-acc-500 focus:ring-1 focus:ring-acc-500 transition-colors text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="glow-button w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ellenőrzés...</span>
                </>
              ) : (
                <>
                  <span>Belépés</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <a href="/" className="text-xs text-ink-400 hover:text-acc-400 transition-colors">
              ← Vissza a nyilvános oldalra
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
