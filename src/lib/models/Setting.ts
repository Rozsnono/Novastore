import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Admin felületen szerkeszthető beállítás (kulcs-érték).
 * A titkos értékek (API kulcsok) mindig titkosítva kerülnek a `valueEnc` mezőbe (lásd lib/secretBox.ts);
 * a nem titkos értékek (URL-ek) a `value` mezőbe.
 */
export interface ISetting {
  key: string;
  /** Titkosított érték (API kulcsok). */
  valueEnc?: string;
  /** Nem titkos érték (pl. szolgáltatás URL-je), nyílt szövegként. */
  value?: string;
  updatedAt?: Date;
}

export interface ISettingDocument extends ISetting, Document {}

const SettingSchema = new Schema<ISettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    valueEnc: { type: String },
    value: { type: String },
  },
  { timestamps: true }
);

const Setting: Model<ISettingDocument> =
  mongoose.models.Setting || mongoose.model<ISettingDocument>('Setting', SettingSchema);

export default Setting;
