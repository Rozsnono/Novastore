'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2, Upload } from 'lucide-react';

interface MediaUploaderProps {
  packageName: string;
  iconUrl: string;
  screenshots: string[];
  onIconChange: (url: string) => void;
  onScreenshotsChange: (urls: string[]) => void;
  disabled?: boolean;
}

export default function MediaUploader({
  packageName,
  iconUrl,
  screenshots,
  onIconChange,
  onScreenshotsChange,
  disabled = false,
}: MediaUploaderProps) {
  const [previewIconUrl, setPreviewIconUrl] = useState<string>(iconUrl);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync iconUrl prop changes
  React.useEffect(() => {
    if (iconUrl && !iconUrl.startsWith('blob:')) {
      setPreviewIconUrl(iconUrl);
    }
  }, [iconUrl]);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!packageName.trim()) {
      setError('Please enter Package Name first.');
      return;
    }

    const file = e.target.files[0];
    // Immediate instant preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewIconUrl(objectUrl);

    setUploadingIcon(true);
    setError(null);

    const formData = new FormData();
    formData.append('type', 'icon');
    formData.append('packageName', packageName.trim());
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload/media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload app icon');
      const data = await res.json();
      const updatedUrl = `${data.url}?t=${Date.now()}`;
      onIconChange(data.url);
      setPreviewIconUrl(updatedUrl);
    } catch (err: any) {
      setError(err.message || 'Error uploading icon');
      setPreviewIconUrl(iconUrl);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!packageName.trim()) {
      setError('Please enter Package Name first.');
      return;
    }

    const file = e.target.files[0];
    setUploadingScreenshot(true);
    setError(null);

    const formData = new FormData();
    formData.append('type', 'screenshot');
    formData.append('packageName', packageName.trim());
    formData.append('index', screenshots.length.toString());
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload/media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload screenshot');
      const data = await res.json();
      onScreenshotsChange([...screenshots, data.url]);
    } catch (err: any) {
      setError(err.message || 'Error uploading screenshot');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const removeScreenshot = (indexToRemove: number) => {
    onScreenshotsChange(screenshots.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Icon Uploader */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          App Icon (Square PNG/JPEG)
        </label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
            {previewIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewIconUrl} alt="App Icon" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-500" />
            )}
            {uploadingIcon && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}
          </div>

          <label className="glow-button px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Upload className="w-3.5 h-3.5" />
            <span>{iconUrl ? 'Replace Icon' : 'Upload Icon'}</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleIconUpload}
              disabled={disabled || uploadingIcon}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Screenshots Uploader */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Screenshots ({screenshots.length} uploaded)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {screenshots.map((url, idx) => (
            <div
              key={idx}
              className="aspect-[9/16] rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Screenshot ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeScreenshot(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <label className="aspect-[9/16] rounded-xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.04] transition-all">
            {uploadingScreenshot ? (
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-400">Add Screenshot</span>
              </>
            )}
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleScreenshotUpload}
              disabled={disabled || uploadingScreenshot}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
