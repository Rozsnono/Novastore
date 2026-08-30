import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IAppLog {
  _id?: string;
  level: 'error' | 'warn' | 'info';
  source: 'mobile-app' | 'backend-api' | 'admin-dashboard';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAppLogDocument extends Omit<IAppLog, '_id'>, Document {}

const AppLogSchema = new Schema<IAppLogDocument>(
  {
    level: {
      type: String,
      enum: ['error', 'warn', 'info'],
      default: 'error',
      index: true,
    },
    source: {
      type: String,
      enum: ['mobile-app', 'backend-api', 'admin-dashboard'],
      default: 'mobile-app',
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Log message is required'],
      index: true,
    },
    stack: {
      type: String,
      default: '',
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Expire logs automatically after 30 days to keep DB clean
AppLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const AppLog: Model<IAppLogDocument> =
  mongoose.models.AppLog || mongoose.model<IAppLogDocument>('AppLog', AppLogSchema);

export default AppLog;
