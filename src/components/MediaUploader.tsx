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
      setError('Előbb add meg a csomagnevet.');
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
      if (!res.ok) throw new Error('Az ikon feltöltése nem sikerült');
      const data = await res.json();
      const updatedUrl = `${data.url}?t=${Date.now()}`;
      onIconChange(data.url);
      setPreviewIconUrl(updatedUrl);
    } catch (err: any) {
      setError(err.message || 'Hiba az ikon feltöltésekor');
      setPreviewIconUrl(iconUrl);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!packageName.trim()) {
      setError('Előbb add meg a csomagnevet.');
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
      if (!res.ok) throw new Error('A képernyőkép feltöltése nem sikerült');
      const data = await res.json();
      onScreenshotsChange([...screenshots, data.url]);
    } catch (err: any) {
      setError(err.message || 'Hiba a képernyőkép feltöltésekor');
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
        <label className="block text-xs font-medium text-ink-300 mb-2">
          Alkalmazás ikon (négyzet alakú PNG/JPEG)
        </label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-[#242020] border border-surface-line flex items-center justify-center overflow-hidden shrink-0 relative group">
            {previewIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewIconUrl} alt="Alkalmazás ikon" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-ink-500" />
            )}
            {uploadingIcon && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-acc-400 animate-spin" />
              </div>
            )}
          </div>

          <label className="glow-button px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Upload className="w-3.5 h-3.5" />
            <span>{iconUrl ? 'Ikon cseréje' : 'Ikon feltöltése'}</span>
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
        <label className="block text-xs font-medium text-ink-300 mb-2">
          Képernyőképek ({screenshots.length} feltöltve)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {screenshots.map((url, idx) => (
            <div
              key={idx}
              className="aspect-[9/16] rounded-xl bg-[#242020] border border-surface-line overflow-hidden relative group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Képernyőkép ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeScreenshot(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-amber-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <label className="aspect-[9/16] rounded-xl border-2 border-dashed border-ink-600 hover:border-acc-500/60 flex flex-col items-center justify-center gap-2 px-2 text-center cursor-pointer hover:bg-white/[0.03] transition-colors">
            {uploadingScreenshot ? (
              <Loader2 className="w-6 h-6 text-acc-400 animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-ink-400" />
                <span className="text-[11px] font-medium text-ink-400">Képernyőkép hozzáadása</span>
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

      {error && <p className="text-xs text-amber-400">{error}</p>}
    </div>
  );
}
