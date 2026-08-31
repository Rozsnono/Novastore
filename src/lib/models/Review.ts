import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IReviewDocument extends Document {
  packageName: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  isVerifiedDownload: boolean;
  developerResponse?: {
    message: string;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    packageName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      required: [true, 'Az értékelés megadása kötelező (1-5 csillag)'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'A vélemény szövegének megadása kötelező'],
      trim: true,
      maxlength: 1000,
    },
    isVerifiedDownload: {
      type: Boolean,
      default: false,
    },
    developerResponse: {
      message: { type: String, trim: true },
      respondedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user can only have one review per package
ReviewSchema.index({ packageName: 1, userId: 1 }, { unique: true });

const Review: Model<IReviewDocument> =
  mongoose.models.Review || mongoose.model<IReviewDocument>('Review', ReviewSchema);

export default Review;
