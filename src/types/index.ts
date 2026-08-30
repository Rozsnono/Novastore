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
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  }>;
}
