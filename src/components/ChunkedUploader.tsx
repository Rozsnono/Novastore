'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileCode2, Loader2, Clock, Zap, Gauge } from 'lucide-react';

interface ChunkedUploaderProps {
  packageName: string;
  versionCode: number;
  onUploadSuccess: (data: { apkWebDavPath: string; sizeBytes: number }) => void;
  disabled?: boolean;
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB Chunk

export default function ChunkedUploader({
  packageName,
  versionCode,
  onUploadSuccess,
  disabled = false,
}: ChunkedUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
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

  const startChunkedUpload = async () => {
    if (!file) {
      setError('Kérlek válassz ki egy APK fájlt.');
      return;
    }
    if (!packageName.trim()) {
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

    const calculatedTotalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setTotalChunks(calculatedTotalChunks);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const startTime = Date.now();
    let totalUploadedBytes = 0;

    try {
      // 1. Upload each 4MB chunk sequentially
      for (let chunkIdx = 0; chunkIdx < calculatedTotalChunks; chunkIdx++) {
        setCurrentChunk(chunkIdx + 1);
        setStatusMessage(`Darab feltöltése: ${chunkIdx + 1} / ${calculatedTotalChunks} (4MB szeletek)...`);

        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIdx.toString());
        formData.append('totalChunks', calculatedTotalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('packageName', packageName.trim());
        formData.append('chunk', chunkBlob);

        const chunkStartTime = Date.now();
        const response = await fetch('/api/admin/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `${chunkIdx + 1}. darab feltöltése sikertelen`);
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

        const uploadedMegabytes = (totalUploadedBytes / (1024 * 1024)).toFixed(1);
        setUploadedMB(uploadedMegabytes);

        const currentPct = Math.round(((chunkIdx + 1) / calculatedTotalChunks) * 90);
        setProgress(currentPct);
      }

      // 2. Trigger Complete & Assembly
      setStatusMessage('Darabok összefűzése és mentése a WebDAV NAS tárolóra...');
      setEstimatedTimeStr('feldolgozás...');
      
      const completeRes = await fetch('/api/admin/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          totalChunks: calculatedTotalChunks,
          fileName: file.name,
          packageName: packageName.trim(),
          versionCode: Number(versionCode),
          totalBytes: file.size,
        }),
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'A darabok összefűzése és NAS mentése sikertelen');
      }

      const result = await completeRes.json();
      setProgress(100);
      setIsDone(true);
      setEstimatedTimeStr('Kész!');
      setStatusMessage('APK sikeresen ellenőrizve és feltöltve a WebDAV tárolóra!');
      onUploadSuccess({
        apkWebDavPath: result.apkWebDavPath,
        sizeBytes: result.sizeBytes || file.size,
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Hiba történt a darabolt APK feltöltése közben.');
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
                  {totalSizeMB} MB • {Math.ceil(file.size / CHUNK_SIZE)} szelet (4MB-os darabok)
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
            onClick={startChunkedUpload}
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
                <span>APK Feltöltése 4MB-os szeletekben</span>
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
