export type AppAccessLevel = 'public' | 'registered' | 'restricted' | 'age_18';
export type UserRole = 'user' | 'vip' | 'tester' | 'developer' | 'admin';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  dateOfBirth: string | Date;
  customPermissions: string[];
  avatarUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAppItem {
  _id?: string;
  title: string;
  packageName: string;
  versionCode: number;
  versionName: string;
  description: string;
  iconUrl: string;
  screenshots: string[];
  apkWebDavPath: string;
  sizeBytes: number;
  downloadCount: number;
  isUpdated: boolean;
  accessLevel?: AppAccessLevel;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  averageRating?: number;
  ratingCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IReview {
  _id?: string;
  packageName: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  isVerifiedDownload: boolean;
  developerResponse?: {
    message: string;
    respondedAt: string | Date;
  };
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ChunkUploadMetadata {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  packageName: string;
}

export interface UpdateCheckRequest {
  packages: Array<{
    packageName: string;
    versionCode: number;
  }>;
}

export interface UpdateCheckResponse {
  updates: Array<{
    packageName: string;
    currentVersionCode: number;
    latestVersionCode: number;
    latestVersionName: string;
    title: string;
    description: string;
    iconUrl: string;
    sizeBytes: number;
    apkDownloadUrl: string;
    updatedAt?: string | Date;
  }>;
}
