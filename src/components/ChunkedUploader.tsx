'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileCode2, Loader2 } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsDone(false);
    setProgress(0);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.apk')) {
        setError('Please select a valid Android APK file (.apk)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const startChunkedUpload = async () => {
    if (!file) {
      setError('Please select an APK file first.');
      return;
    }
    if (!packageName.trim()) {
      setError('Please enter a Package Name before uploading the APK.');
      return;
    }
    if (!versionCode || versionCode < 1) {
      setError('Please enter a valid Version Code before uploading the APK.');
      return;
    }

    setUploading(true);
    setError(null);
    setIsDone(false);

    const calculatedTotalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setTotalChunks(calculatedTotalChunks);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // 1. Upload each 4MB chunk sequentially
      for (let chunkIdx = 0; chunkIdx < calculatedTotalChunks; chunkIdx++) {
        setCurrentChunk(chunkIdx + 1);
        setStatusMessage(`Uploading chunk ${chunkIdx + 1} of ${calculatedTotalChunks} (4MB)...`);

        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIdx.toString());
        formData.append('totalChunks', calculatedTotalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('packageName', packageName.trim());
        formData.append('chunk', chunkBlob);

        const response = await fetch('/api/admin/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Chunk ${chunkIdx + 1} upload failed`);
        }

        const currentPct = Math.round(((chunkIdx + 1) / calculatedTotalChunks) * 90);
        setProgress(currentPct);
      }

      // 2. Trigger Complete & Assembly
      setStatusMessage('Assembling chunks and pushing to WebDAV NAS storage...');
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
        throw new Error(errData.error || 'Failed to assemble and upload APK to WebDAV NAS');
      }

      const result = await completeRes.json();
      setProgress(100);
      setIsDone(true);
      setStatusMessage('APK verified & stored on NAS successfully!');
      onUploadSuccess({
        apkWebDavPath: result.apkWebDavPath,
        sizeBytes: result.sizeBytes || file.size,
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'An error occurred during APK chunked upload.');
    } finally {
      setUploading(false);
    }
  };

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
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {Math.ceil(file.size / CHUNK_SIZE)} chunks of 4MB
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  Click to select or drag & drop Android APK file
                </p>
                <p className="text-xs text-slate-500">Supports all APK binaries (.apk)</p>
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
                <span>Uploading Chunks ({progress}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload APK in 4MB Chunks</span>
              </>
            )}
          </button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>{statusMessage}</span>
            <span className="font-mono text-indigo-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
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
