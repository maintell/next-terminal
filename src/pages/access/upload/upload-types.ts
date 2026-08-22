export type UploadTaskStatus =
    | 'queued'
    | 'retrying'
    | 'initializing'
    | 'uploading'
    | 'transmitting'
    | 'success'
    | 'error'
    | 'cancelled'
    | 'interrupted';

export interface UploadTaskRecord {
    id: string;
    accountId: string;
    fsId: string;
    directory: string;
    filename: string;
    path: string;
    name: string;
    size: number;
    clientLoaded: number;
    clientTotal: number;
    clientPercent: number;
    remoteWritten: number;
    remoteTotal: number;
    remotePercent: number;
    percent: number;
    speed: number;
    status: UploadTaskStatus;
    error: string;
    createdAt: number;
    updatedAt: number;
    finishedAt?: number;
    expiresAt?: number;
    retryable: boolean;
    serverInitialized: boolean;
}

export interface EnqueueUploadFile {
    file: File;
    directory: string;
    displayName?: string;
}

export interface EnqueueUploadInput {
    fsId: string;
    files: EnqueueUploadFile[];
}
