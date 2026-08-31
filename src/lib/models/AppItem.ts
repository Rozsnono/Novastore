import mongoose, { Schema, Model, Document } from 'mongoose';
import { IAppItem } from '@/types';

export interface IAppItemDocument extends Omit<IAppItem, '_id'>, Document {}

const AppItemSchema = new Schema<IAppItemDocument>(
  {
    title: {
      type: String,
      required: [true, 'App title is required'],
      trim: true,
      index: true,
    },
    packageName: {
      type: String,
      required: [true, 'Package name is required (e.g. com.example.app)'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    versionCode: {
      type: Number,
      required: [true, 'Version code is required'],
      index: true,
    },
    versionName: {
      type: String,
      required: [true, 'Version name is required (e.g. 1.0.0)'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'App description is required'],
    },
    iconUrl: {
      type: String,
      required: [true, 'Icon URL is required'],
    },
    screenshots: {
      type: [String],
      default: [],
    },
    apkWebDavPath: {
      type: String,
      required: [true, 'WebDAV APK path is required'],
    },
    sizeBytes: {
      type: Number,
      required: [true, 'APK size in bytes is required'],
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      index: true,
    },
    isUpdated: {
      type: Boolean,
      default: false,
    },
    accessLevel: {
      type: String,
      enum: ['public', 'registered', 'restricted', 'age_18'],
      default: 'public',
      index: true,
    },
    requiredRoles: {
      type: [String],
      default: [],
    },
    requiredPermissions: {
      type: [String],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AppItem: Model<IAppItemDocument> =
  mongoose.models.AppItem || mongoose.model<IAppItemDocument>('AppItem', AppItemSchema);

export default AppItem;
