import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Admin felületen szerkeszthető beállítás (kulcs-érték).
 * A titkos értékek (API kulcsok) mindig titkosítva kerülnek a `valueEnc` mezőbe (lásd lib/secretBox.ts).
 */
export interface ISetting {
  key: string;
  valueEnc: string;
  updatedAt?: Date;
}

export interface ISettingDocument extends ISetting, Document {}

const SettingSchema = new Schema<ISettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    valueEnc: { type: String, required: true },
  },
  { timestamps: true }
);

const Setting: Model<ISettingDocument> =
  mongoose.models.Setting || mongoose.model<ISettingDocument>('Setting', SettingSchema);

export default Setting;
