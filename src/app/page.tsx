import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  HardDrive,
  RefreshCw,
  Layers,
  ArrowRight,
  Server,
  Sparkles,
  Star,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import AppItem from '@/lib/models/AppItem';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getLandingData() {
  try {
    await connectToDatabase();
    const [apps, totalApps, novaStoreApp, downloadStats] = await Promise.all([
      AppItem.find({ packageName: { $ne: 'com.novastore.app' } })
        .sort({ downloadCount: -1 })
        .limit(12)
        .lean(),
      AppItem.countDocuments({ packageName: { $ne: 'com.novastore.app' } }),
      AppItem.findOne({ packageName: 'com.novastore.app' }).lean(),
      AppItem.aggregate([
        { $group: { _id: null, totalDownloads: { $sum: '$downloadCount' } } },
      ]),
    ]);

    const totalDownloads = downloadStats[0]?.totalDownloads || 0;

    return {
      apps: JSON.parse(JSON.stringify(apps)),
      totalApps,
      totalDownloads,
      novaStoreVersion: novaStoreApp?.versionName ? `v${novaStoreApp.versionName}` : 'v1.0.0',
      novaStoreDownloadUrl: novaStoreApp
        ? `/api/apps/com.novastore.app/download`
        : '/novastore.apk',
    };
  } catch (e) {
    return {
      apps: [],
      totalApps: 0,
      totalDownloads: 0,
      novaStoreVersion: 'v1.0.0',
      novaStoreDownloadUrl: '/novastore.apk',
    };
  }
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-16 sm:pb-24 md:pt-24 md:pb-32">
        {/* Background glow meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-pink-500/15 rounded-full blur-[90px] sm:blur-[140px] pointer-events-none" />
        <div className="absolute top-2/3 right-4 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-cyan-500/15 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[11px] sm:text-xs font-semibold tracking-wide uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Saját Android App Áruház Rendszer</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Privát & Független <br />
              <span className="gradient-text">Android App Store</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-slate-300 font-normal leading-relaxed px-2 sm:px-0">
              Biztonságos alkalmazásterjesztés saját WebDAV NAS szerverről. 4MB darabolt letöltés, automatikus 3x újracsatlakozás, jogosultságkezelés és önfrissítő rendszer.
            </p>

            {/* CTA Buttons - Mobile-first Full Width Stack */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              <a
                href={data.novaStoreDownloadUrl}
                download="novastore.apk"
                className="glow-button w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2.5 shadow-xl transform active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                <span>NovaStore APK Letöltése</span>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 bg-white/20 rounded-full font-mono">
                  {data.novaStoreVersion}
                </span>
              </a>

              <Link
                href="/admin"
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-semibold text-slate-200 border border-white/10 hover:border-indigo-500/40 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                <span>Admin Portál</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Live Metrics Cards */}
            <div className="pt-6 sm:pt-10 grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto">
              <div className="glass-card p-3 sm:p-4 rounded-2xl text-center">
                <p className="text-xl sm:text-3xl font-extrabold text-white">{data.totalApps}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                  Alkalmazás
                </p>
              </div>

              <div className="glass-card p-3 sm:p-4 rounded-2xl text-center">
                <p className="text-xl sm:text-3xl font-extrabold text-indigo-400">
                  {data.totalDownloads.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                  Letöltés
                </p>
              </div>

              <div className="glass-card p-3 sm:p-4 rounded-2xl text-center">
                <p className="text-xl sm:text-3xl font-extrabold text-emerald-400">4 MB</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                  Stream Szelet
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Store Catalog Section */}
      <section id="catalog" className="py-12 sm:py-20 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
            <h2 className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-indigo-400">
              Katalógus
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Elérhető Alkalmazások az Áruházban
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Töltsd le közvetlenül telefonodra vagy telepítsd a NovaStore appon keresztül
            </p>
          </div>

          {data.apps.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-3xl border border-white/5 max-w-md mx-auto">
              <Smartphone className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Még nincs közzétett alkalmazás</p>
              <p className="text-xs text-slate-400 mt-1">Lépj be az admin felületre új APK feltöltéséhez.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.apps.map((app: any) => {
                const sizeMB = (app.sizeBytes / (1024 * 1024)).toFixed(1);
                return (
                  <div
                    key={app._id}
                    className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={`/api/apps/${app.packageName}/icon`}
                        alt={app.title}
                        className="w-14 h-14 rounded-xl object-cover bg-white/5 border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-white text-sm sm:text-base truncate">
                            {app.title}
                          </h3>
                          {app.accessLevel === 'restricted' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
                              ZÁRT
                            </span>
                          )}
                          {app.accessLevel === 'age_18' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-bold">
                              18+
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-indigo-400 font-mono truncate mt-0.5">
                          {app.packageName}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {app.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {app.averageRating > 0 && (
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{app.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        <span>v{app.versionName}</span>
                        <span>•</span>
                        <span>{sizeMB} MB</span>
                      </div>

                      <a
                        href={`/api/apps/${app.packageName}/download`}
                        download={`${app.packageName}-v${app.versionCode}.apk`}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-indigo-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>APK</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-12 sm:py-20 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-2">
            <h2 className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-indigo-400">
              Főbb Képességek
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white">
              Sebességre, Biztonságra és Stabilitásra Tervezve
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">WebDAV NAS Védelem</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                A saját NAS tárhelyed teljesen védve marad a Next.js biztonsági reverse proxy mögött, memóriabeli gyorsítótárral.
              </p>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">4MB Darabolt Streamelés</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                A nagyméretű APK fájlok HTTP Range szeletekben töltődnek le. Hálózati hiba esetén automatikus 3x újracsatlakozás biztosított.
              </p>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Automatikus Önfrissítés</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                A mobil app induláskor összeveti a verziókat, azonnal jelzi az új kiadásokat, és 1-kattintásos frissítést biztosít.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-12 sm:py-20 bg-black/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-2">
            <h2 className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-indigo-400">
              Rendszer Architektúra
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white">
              Saját Kezelésű Teljes Infrastruktúra
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <h4 className="font-bold text-white text-sm sm:text-base">Next.js 16 API Proxy</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Központi átjáró. Kezeli a MongoDB metaadatokat, a 4MB darabolt feltöltések összefűzését és védi a NAS hitelesítő adatait.
              </p>
            </div>

            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm sm:text-base">WebDAV Tárhely Réteg</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tárolja a bináris APK-kat, ikonokat és képernyőképeket automatikus verziómegőrzéssel (aktuális + előző backup verzió).
              </p>
            </div>

            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                <h4 className="font-bold text-white text-sm sm:text-base">Expo Natív Android Kliens</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Natív csomagtelepítő integráció, offline letöltési állapotok perzisztálása és jogosultság alapú letöltésvédelem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 sm:py-12 border-t border-white/10 text-center text-xs text-slate-500 px-4">
        <p>© 2026 NovaStore Platform. Next.js 16, Expo React Native & MongoDB.</p>
      </footer>
    </div>
  );
}
