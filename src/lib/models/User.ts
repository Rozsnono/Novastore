import mongoose, { Schema, Model, Document } from 'mongoose';
import { UserRole } from '@/types';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  dateOfBirth: Date;
  role: UserRole;
  customPermissions: string[];
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'A név megadása kötelező'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Az email cím megadása kötelező'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'A jelszó megadása kötelező'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'A születési dátum megadása kötelező'],
    },
    role: {
      type: String,
      enum: ['user', 'vip', 'tester', 'developer', 'admin'],
      default: 'user',
      index: true,
    },
    customPermissions: {
      type: [String],
      default: [],
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
