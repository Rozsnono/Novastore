'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileCode2, Loader2, Clock, Zap } from 'lucide-react';

interface ChunkedUploaderProps {
  packageName: string;
  versionCode: number;
  onUploadSuccess: (data: { apkWebDavPath: string; sizeBytes: number }) => void;
  disabled?: boolean;
}

// 20MB chunk size: maximizes upload throughput directly to Synology NAS (same as NewFileSharer)
const CHUNK_SIZE = 20 * 1024 * 1024;
const UPLOAD_API_KEY = process.env.NEXT_PUBLIC_UPLOAD_API_KEY || 'test-secret-key-12345';

function resolveUploadApiUrl(): string {
  let configured = (process.env.NEXT_PUBLIC_UPLOAD_API_URL || '').trim();
  if (!configured) {
    configured = 'https://api.filesharer.rozsnorbert.hu:9443';
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && configured.startsWith('http://')) {
    configured = configured.replace(/^http:\/\//, 'https://');
  }
  return configured.replace(/\/+$/, '');
}

export default function ChunkedUploader({
  packageName,
  versionCode,
  onUploadSuccess,
  disabled = false,
}: ChunkedUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // Real-time upload metrics
  const [uploadSpeedMBs, setUploadSpeedMBs] = useState<string>('0.0');
  const [estimatedTimeStr, setEstimatedTimeStr] = useState<string>('');
  const [uploadedMB, setUploadedMB] = useState<string>('0.0');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSeconds = (sec: number): string => {
    if (!isFinite(sec) || sec <= 0) return 'pár másodperc';
    const rounded = Math.round(sec);
    if (rounded < 60) {
      return `kb. ${rounded} mp`;
    }
    const mins = Math.floor(rounded / 60);
    const remainingSec = rounded % 60;
    return `${mins} perc ${remainingSec > 0 ? `${remainingSec} mp` : ''}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsDone(false);
    setProgress(0);
    setEstimatedTimeStr('');
    setUploadSpeedMBs('0.0');
    setUploadedMB('0.0');
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.apk')) {
        setError('Kérlek válassz érvényes Android APK fájlt (.apk)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const startDirectNasUpload = async () => {
    if (!file) {
      setError('Kérlek válassz ki egy APK fájlt.');
      return;
    }
    const sanitizedPackage = packageName.trim();
    if (!sanitizedPackage) {
      setError('Kérlek add meg a Csomagnevet (Package Name) a feltöltés előtt.');
      return;
    }
    if (!versionCode || versionCode < 1) {
      setError('Kérlek adj meg érvényes Verziókódot a feltöltés előtt.');
      return;
    }

    setUploading(true);
    setError(null);
    setIsDone(false);
    setProgress(0);

    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const targetPath = `/novastore/apps/${sanitizedPackage}/apk`;
    const targetFilename = `app-v${versionCode}.apk`;
    const uploadApiUrl = resolveUploadApiUrl();

    let remoteUploadId: string | null = null;
    const startTime = Date.now();
    let totalUploadedBytes = 0;

    try {
      // 1. Start Upload Session on the dedicated Synology NAS Upload API
      setStatusMessage('Feltöltési munkamenet indítása a NAS tárolón...');
      const startResponse = await fetch(`${uploadApiUrl}/upload/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': UPLOAD_API_KEY,
        },
        body: JSON.stringify({
          filename: targetFilename,
          totalChunks,
          chunkSize: CHUNK_SIZE,
          targetPath,
        }),
      });

      if (!startResponse.ok) {
        const startData = await startResponse.json().catch(() => ({}));
        throw new Error(
          startData.message || startData.error || `A feltöltés indítása sikertelen (${startResponse.status})`
        );
      }

      const startData = await startResponse.json();
      remoteUploadId = startData.uploadId;

      // 2. Upload Chunks sequentially directly to Synology NAS with retry mechanism
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        setStatusMessage(
          `Feltöltés a NAS-ra: ${chunkIdx + 1} / ${totalChunks} (${(chunkSize / (1024 * 1024)).toFixed(1)} MB szelet)...`
        );

        const formData = new FormData();
        formData.append('file', chunkBlob, targetFilename);
        formData.append('uploadId', remoteUploadId!);
        formData.append('chunkIndex', chunkIdx.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('filename', targetFilename);

        let chunkUploaded = false;
        let chunkError = '';

        // Try uploading chunk up to 3 times with exponential backoff
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const chunkResponse = await fetch(`${uploadApiUrl}/upload/chunk`, {
              method: 'POST',
              headers: {
                'x-api-key': UPLOAD_API_KEY,
              },
              body: formData,
            });

            if (chunkResponse.ok) {
              chunkUploaded = true;
              break;
            } else {
              const errData = await chunkResponse.json().catch(() => ({}));
              chunkError = errData.message || errData.error || `HTTP ${chunkResponse.status}`;
            }
          } catch (netErr: any) {
            chunkError = netErr.message;
          }

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          }
        }

        if (!chunkUploaded) {
          throw new Error(`Sikertelen darab feltöltés ${chunkIdx + 1}/${totalChunks}: ${chunkError}`);
        }

        totalUploadedBytes += chunkSize;
        const elapsedSec = (Date.now() - startTime) / 1000;

        if (elapsedSec > 0) {
          const speedBytesPerSec = totalUploadedBytes / elapsedSec;
          const speedMBs = speedBytesPerSec / (1024 * 1024);
          setUploadSpeedMBs(speedMBs.toFixed(1));

          const remainingBytes = file.size - totalUploadedBytes;
          const etaSec = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : 0;
          setEstimatedTimeStr(formatSeconds(etaSec));
        }

        setUploadedMB((totalUploadedBytes / (1024 * 1024)).toFixed(1));
        const currentPct = Math.round(((chunkIdx + 1) / totalChunks) * 92);
        setProgress(currentPct);
      }

      // 3. Finalize & Stream Merge directly on Synology NAS
      setStatusMessage('Darabok véglegesítése és streaming mentés WebDAV tárolóra...');
      setEstimatedTimeStr('összefűzés...');

      const finishResponse = await fetch(`${uploadApiUrl}/upload/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': UPLOAD_API_KEY,
        },
        body: JSON.stringify({
          uploadId: remoteUploadId,
          totalChunks,
          filename: targetFilename,
          targetPath,
        }),
      });

      if (!finishResponse.ok) {
        const finishData = await finishResponse.json().catch(() => ({}));
        throw new Error(
          finishData.message || finishData.error || `A végleges összefűzés sikertelen (${finishResponse.status})`
        );
      }

      const finishData = await finishResponse.json();
      const finalDestination = finishData.destination || `${targetPath}/${targetFilename}`;

      setProgress(100);
      setIsDone(true);
      setEstimatedTimeStr('Kész!');
      setStatusMessage('APK sikeresen feltöltve a Synology NAS tárolóra!');

      onUploadSuccess({
        apkWebDavPath: finalDestination,
        sizeBytes: finishData.size || file.size,
      });
    } catch (err: any) {
      console.error('NAS upload failed:', err);

      // Trigger cleanup on NAS if upload session was started
      if (remoteUploadId) {
        fetch(`${uploadApiUrl}/upload/failed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': UPLOAD_API_KEY,
          },
          body: JSON.stringify({
            uploadId: remoteUploadId,
            filename: targetFilename,
          }),
        }).catch(() => {});
      }

      setError(err.message || 'Hiba történt az APK feltöltése közben.');
    } finally {
      setUploading(false);
    }
  };

  const totalSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <div
        onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDone
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : error
            ? 'border-red-500/50 bg-red-500/5'
            : file
            ? 'border-indigo-500/50 bg-indigo-500/5'
            : 'border-white/10 hover:border-indigo-500/40 bg-white/[0.02]'
        } ${uploading || disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || disabled}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {isDone ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : file ? (
            <FileCode2 className="w-10 h-10 text-indigo-400 animate-pulse" />
          ) : (
            <Upload className="w-10 h-10 text-slate-400" />
          )}

          <div>
            {file ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {totalSizeMB} MB • {Math.ceil(file.size / CHUNK_SIZE)} szelet (20MB közvetlen NAS szeletek)
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  Kattints ide vagy húzd ide az Android APK fájlt
                </p>
                <p className="text-xs text-slate-500">Minden szabványos Android csomag támogatott (.apk)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {file && !isDone && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={startDirectNasUpload}
            disabled={uploading || disabled || !packageName || !versionCode}
            className="glow-button px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Feltöltés folyamatban ({progress}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>APK Feltöltése a Synology NAS-ra (20MB szeletek)</span>
              </>
            )}
          </button>
        </div>
      )}

      {uploading && (
        <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/10 shadow-lg">
          {/* Top Status & Percentage */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="text-slate-300 font-medium">{statusMessage}</span>
            <span className="font-mono text-indigo-400 font-bold text-sm sm:text-xs">
              {progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 rounded-full shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Metrics Row: Speed, Uploaded MB, Estimated Time Remaining */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[11px]">
            {/* Speed */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Sebesség</p>
                <p className="font-mono font-bold text-white">{uploadSpeedMBs} MB/s</p>
              </div>
            </div>

            {/* Transferred Size */}
            <div className="flex items-center gap-1.5 text-slate-300 text-center justify-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Átvitel</p>
                <p className="font-mono font-bold text-white">
                  {uploadedMB} / {totalSizeMB} MB
                </p>
              </div>
            </div>

            {/* Estimated Remaining Time (ETA) */}
            <div className="flex items-center gap-1.5 text-slate-300 justify-end text-right">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Hátralévő idő</p>
                <p className="font-bold text-emerald-400">
                  {estimatedTimeStr || 'számítás...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
