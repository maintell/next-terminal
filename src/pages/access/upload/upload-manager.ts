import {baseUrl} from '@/api/core/requests';
import fileSystemApi, {UploadTask as ServerUploadTask, UploadTaskCreate} from '@/api/filesystem-api';
import {getCurrentUser} from '@/utils/permission';
import {LocalStorage} from '@/utils/storage';
import {EnqueueUploadInput, UploadTaskRecord, UploadTaskStatus} from './upload-types';

const MAX_CONCURRENT_UPLOADS = 3;
const HISTORY_RETENTION_MS = 30 * 60 * 1000;
const HISTORY_MAX_RECORDS = 200;
const STORAGE_KEY_PREFIX = 'filesystem-upload-tasks-';

interface UploadRuntime {
    file?: File;
    xhr?: XMLHttpRequest;
    cancelRequested: boolean;
    running: boolean;
}

interface UploadManagerGateway {
    createTask: (fsId: string, input: UploadTaskCreate) => Promise<ServerUploadTask>;
    cancelTask: (fsId: string, taskId: string) => Promise<void>;
    deleteTask: (fsId: string, taskId: string) => Promise<void>;
    uploadSucceeded: (fsId: string) => void;
}

type Listener = (tasks: UploadTaskRecord[]) => void;

const terminalStatuses = new Set<UploadTaskStatus>(['success', 'error', 'cancelled', 'interrupted']);
const activeStatuses = new Set<UploadTaskStatus>(['queued', 'retrying', 'initializing', 'uploading', 'transmitting']);

export function calculateOverallPercent(clientPercent: number, remotePercent: number) {
    const normalizedClient = Math.min(Math.max(clientPercent, 0), 100);
    const normalizedRemote = Math.min(Math.max(remotePercent, 0), 100);
    return Number((normalizedClient * 0.5 + normalizedRemote * 0.5).toFixed(2));
}

function createTaskId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function parseUploadError(xhr: XMLHttpRequest) {
    let message = `Upload failed with status code: ${xhr.status}`;
    try {
        const result = JSON.parse(xhr.responseText);
        if (typeof result?.message === 'string' && result.message) {
            message = result.message;
        }
    } catch {
        // 非 JSON 响应使用状态码提示。
    }
    return message;
}

export class UploadManager {
    private tasks: UploadTaskRecord[] = [];
    private runtimes = new Map<string, UploadRuntime>();
    private queue: string[] = [];
    private listeners = new Set<Listener>();
    private retryingTaskIds = new Set<string>();
    private accountId = '';
    private gateway?: UploadManagerGateway;
    private runningCount = 0;

    configure(gateway: UploadManagerGateway) {
        this.gateway = gateway;
        this.drainQueue();
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        listener([...this.tasks]);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getTasks() {
        this.syncAccount();
        return [...this.tasks];
    }

    syncAccount() {
        const nextAccountId = getCurrentUser()?.id ?? '';
        if (!nextAccountId || nextAccountId === this.accountId) {
            return false;
        }

        for (const runtime of this.runtimes.values()) {
            runtime.xhr?.abort();
        }
        this.runtimes.clear();
        this.queue = [];
        this.runningCount = 0;
        this.accountId = nextAccountId;

        const stored = LocalStorage.get<UploadTaskRecord[]>(STORAGE_KEY_PREFIX + nextAccountId, []) ?? [];
        const now = Date.now();
        this.tasks = stored
            .filter(task => !task.expiresAt || task.expiresAt > now)
            .map(task => task.status === 'transmitting' && task.serverInitialized
                ? {...task, retryable: false}
                : activeStatuses.has(task.status)
                    ? {
                    ...task,
                    status: 'interrupted' as const,
                    error: task.error || 'Upload interrupted by page reload',
                    speed: 0,
                    retryable: false,
                    finishedAt: now,
                    expiresAt: now + HISTORY_RETENTION_MS,
                }
                    : {...task, retryable: false});
        this.persist();
        this.emit();
        return true;
    }

    enqueue(input: EnqueueUploadInput) {
        this.syncAccount();
        if (!this.accountId) {
            return [];
        }
        const now = Date.now();
        const ids: string[] = [];

        for (const item of input.files) {
            const id = createTaskId();
            const displayName = item.displayName || item.file.name;
            const record: UploadTaskRecord = {
                id,
                accountId: this.accountId,
                fsId: input.fsId,
                directory: item.directory,
                filename: item.file.name,
                path: displayName,
                name: displayName,
                size: item.file.size,
                clientLoaded: 0,
                clientTotal: item.file.size,
                clientPercent: 0,
                remoteWritten: 0,
                remoteTotal: item.file.size,
                remotePercent: 0,
                percent: 0,
                speed: 0,
                status: 'queued',
                error: '',
                createdAt: now,
                updatedAt: now,
                retryable: true,
                serverInitialized: false,
            };
            this.tasks.push(record);
            this.runtimes.set(id, {
                file: item.file,
                cancelRequested: false,
                running: false,
            });
            this.queue.push(id);
            ids.push(id);
        }

        this.trimHistory();
        this.persist();
        this.emit();
        this.drainQueue();
        return ids;
    }

    async cancel(taskId: string) {
        const task = this.find(taskId);
        const runtime = this.runtimes.get(taskId);
        if (!task || terminalStatuses.has(task.status)) {
            return;
        }

        if (runtime) {
            runtime.cancelRequested = true;
        }
        this.queue = this.queue.filter(id => id !== taskId);
        this.finish(taskId, 'cancelled', 'Upload cancelled');

        if (runtime?.xhr) {
            runtime.xhr.abort();
        } else if (runtime?.running) {
            this.releaseRuntime(taskId);
        }

        if (task.serverInitialized && this.gateway) {
            try {
                await this.gateway.cancelTask(task.fsId, task.id);
            } catch {
                // XHR 中断仍会取消请求上下文；取消接口失败不覆盖本地取消状态。
            }
        }
    }

    async retry(taskId: string) {
        const task = this.find(taskId);
        const runtime = this.runtimes.get(taskId);
        if (!task || !terminalStatuses.has(task.status) || !runtime?.file || this.retryingTaskIds.has(taskId)) {
            return;
        }
        this.retryingTaskIds.add(taskId);
        this.patch(taskId, {status: 'retrying', error: '', speed: 0}, true);

        try {
            if (task.serverInitialized && this.gateway) {
                try {
                    await this.gateway.deleteTask(task.fsId, task.id);
                } catch {
                    // 任务可能已经由后端 TTL 清理。
                }
            }

            if (this.find(taskId) !== task || task.status !== 'retrying') {
                return;
            }

            const oldId = task.id;
            const nextId = createTaskId();
            task.id = nextId;
            task.clientLoaded = 0;
            task.clientPercent = 0;
            task.remoteWritten = 0;
            task.remotePercent = 0;
            task.percent = 0;
            task.speed = 0;
            task.status = 'queued';
            task.error = '';
            task.createdAt = Date.now();
            task.updatedAt = task.createdAt;
            task.finishedAt = undefined;
            task.expiresAt = undefined;
            task.serverInitialized = false;
            this.runtimes.delete(oldId);
            runtime.cancelRequested = false;
            runtime.running = false;
            runtime.xhr = undefined;
            this.runtimes.set(nextId, runtime);
            this.queue.push(nextId);
            this.persist();
            this.emit();
            this.drainQueue();
        } finally {
            this.retryingTaskIds.delete(taskId);
        }
    }

    async remove(taskId: string) {
        const task = this.find(taskId);
        if (!task || !terminalStatuses.has(task.status)) {
            return;
        }

        this.tasks = this.tasks.filter(item => item.id !== taskId);
        this.runtimes.delete(taskId);
        this.persist();
        this.emit();

        if (task.serverInitialized && this.gateway) {
            try {
                await this.gateway.deleteTask(task.fsId, task.id);
            } catch {
                // 本地历史已删除；后端记录会由 TTL 自动清理。
            }
        }
    }

    async clearFinished(fsId?: string) {
        const removable = this.tasks.filter(task => terminalStatuses.has(task.status) && (!fsId || task.fsId === fsId));
        const removableIds = new Set(removable.map(task => task.id));
        this.tasks = this.tasks.filter(task => !removableIds.has(task.id));
        for (const task of removable) {
            this.runtimes.delete(task.id);
        }
        this.persist();
        this.emit();

        if (this.gateway) {
            await Promise.allSettled(removable
                .filter(task => task.serverInitialized)
                .map(task => this.gateway!.deleteTask(task.fsId, task.id)));
        }
    }

    cleanupExpired() {
        this.syncAccount();
        const now = Date.now();
        const expiredIds = new Set(this.tasks
            .filter(task => terminalStatuses.has(task.status) && task.expiresAt && task.expiresAt <= now)
            .map(task => task.id));
        if (expiredIds.size === 0) {
            return;
        }
        this.tasks = this.tasks.filter(task => !expiredIds.has(task.id));
        for (const id of expiredIds) {
            this.runtimes.delete(id);
        }
        this.persist();
        this.emit();
    }

    applyRemoteTask(taskId: string, remote: ServerUploadTask) {
        const task = this.find(taskId);
        if (!task || terminalStatuses.has(task.status)) {
            return;
        }

        task.remoteWritten = remote.written;
        task.remoteTotal = remote.total;
        task.remotePercent = remote.status === 'success' ? 100 : Math.min(Math.max(remote.percent || 0, 0), 100);
        task.percent = Math.max(task.percent, calculateOverallPercent(task.clientPercent, task.remotePercent));
        task.speed = remote.speed || 0;
        task.updatedAt = Date.now();
        if (remote.status === 'success' && !this.runtimes.has(taskId)) {
            this.finish(taskId, 'success', '');
            this.gateway?.uploadSucceeded(task.fsId);
            return;
        }
        if (remote.status === 'error') {
            if (!this.runtimes.has(taskId)) {
                this.finish(taskId, 'error', remote.error || 'Remote transfer failed');
                return;
            }
            task.error = remote.error || task.error;
        }
        if (remote.status === 'cancelled') {
            this.finish(taskId, 'cancelled', remote.error || 'Upload cancelled');
            return;
        }
        this.emit();
    }

    markRecoveredTaskInterrupted(taskId: string) {
        const task = this.find(taskId);
        if (task?.status === 'transmitting' && !task.retryable && !this.runtimes.has(taskId)) {
            this.finish(taskId, 'interrupted', 'Upload progress is no longer available');
        }
    }

    private drainQueue() {
        if (!this.gateway) {
            return;
        }
        while (this.runningCount < MAX_CONCURRENT_UPLOADS && this.queue.length > 0) {
            const taskId = this.queue.shift()!;
            const task = this.find(taskId);
            const runtime = this.runtimes.get(taskId);
            if (!task || task.status !== 'queued' || !runtime?.file) {
                continue;
            }
            runtime.running = true;
            this.runningCount += 1;
            void this.start(taskId);
        }
    }

    private async start(taskId: string) {
        const task = this.find(taskId);
        const runtime = this.runtimes.get(taskId);
        if (!task || !runtime?.file || !this.gateway) {
            this.releaseRuntime(taskId);
            return;
        }

        this.patch(taskId, {status: 'initializing', error: '', speed: 0}, true);
        try {
            await this.gateway.createTask(task.fsId, {
                id: task.id,
                directory: task.directory,
                filename: task.filename,
                size: task.size,
            });
            task.serverInitialized = true;
            if (runtime.cancelRequested) {
                await this.gateway.cancelTask(task.fsId, task.id).catch(() => undefined);
                this.releaseRuntime(taskId);
                return;
            }
            this.startXhr(task, runtime);
        } catch (error) {
            const message = error instanceof Error ? error.message : String((error as {message?: string})?.message || error);
            this.finish(taskId, 'error', message);
            this.releaseRuntime(taskId);
        }
    }

    private startXhr(task: UploadTaskRecord, runtime: UploadRuntime) {
        const file = runtime.file!;
        const xhr = new XMLHttpRequest();
        runtime.xhr = xhr;
        let previousTime = Date.now();
        let previousLoaded = 0;
        let settled = false;

        const settle = () => {
            if (settled) {
                return;
            }
            settled = true;
            this.releaseRuntime(task.id);
        };

        this.patch(task.id, {status: 'uploading'}, true);

        xhr.upload.onprogress = event => {
            if (!event.lengthComputable || terminalStatuses.has(task.status)) {
                return;
            }
            const now = Date.now();
            const elapsedSeconds = Math.max((now - previousTime) / 1000, 0.1);
            const clientPercent = event.total > 0 ? event.loaded / event.total * 100 : 0;
            task.clientLoaded = event.loaded;
            task.clientTotal = event.total;
            task.clientPercent = Math.min(Math.max(clientPercent, 0), 100);
            task.percent = Math.max(task.percent, calculateOverallPercent(task.clientPercent, task.remotePercent));
            task.speed = Math.max((event.loaded - previousLoaded) / elapsedSeconds, 0);
            task.status = event.loaded >= event.total ? 'transmitting' : 'uploading';
            task.updatedAt = now;
            previousTime = now;
            previousLoaded = event.loaded;
            this.emit();
        };

        xhr.upload.onload = () => {
            if (terminalStatuses.has(task.status)) {
                return;
            }
            task.clientLoaded = task.clientTotal;
            task.clientPercent = 100;
            task.percent = Math.max(task.percent, calculateOverallPercent(100, task.remotePercent));
            task.speed = 0;
            task.status = 'transmitting';
            task.updatedAt = Date.now();
            this.persist();
            this.emit();
        };

        xhr.onload = () => {
            if (runtime.cancelRequested) {
                this.finish(task.id, 'cancelled', 'Upload cancelled');
            } else if (xhr.status >= 200 && xhr.status < 300) {
                task.clientPercent = 100;
                task.remotePercent = 100;
                task.remoteWritten = task.size;
                task.percent = 100;
                this.finish(task.id, 'success', '');
                this.gateway?.uploadSucceeded(task.fsId);
            } else {
                this.finish(task.id, 'error', parseUploadError(xhr));
            }
            settle();
        };

        xhr.onerror = () => {
            this.finish(task.id, 'error', 'Upload failed due to a network error');
            settle();
        };

        xhr.onabort = () => {
            if (runtime.cancelRequested) {
                this.finish(task.id, 'cancelled', 'Upload cancelled');
            } else {
                this.finish(task.id, 'error', 'Upload request was aborted');
            }
            settle();
        };

        const url = `${baseUrl()}/${fileSystemApi.group}/${encodeURIComponent(task.fsId)}/upload?dir=${encodeURIComponent(task.directory)}&taskId=${encodeURIComponent(task.id)}`;
        xhr.open('POST', url, true);
        const formData = new FormData();
        formData.append('file', file, task.filename);
        xhr.send(formData);
    }

    private releaseRuntime(taskId: string) {
        const runtime = this.runtimes.get(taskId);
        if (runtime?.running) {
            runtime.running = false;
            runtime.xhr = undefined;
            this.runningCount = Math.max(0, this.runningCount - 1);
        }
        if (this.find(taskId)?.status === 'success') {
            this.runtimes.delete(taskId);
        }
        this.drainQueue();
    }

    private finish(taskId: string, status: Extract<UploadTaskStatus, 'success' | 'error' | 'cancelled' | 'interrupted'>, error: string) {
        const task = this.find(taskId);
        if (!task || terminalStatuses.has(task.status)) {
            return;
        }
        const now = Date.now();
        task.status = status;
        task.error = error;
        task.speed = 0;
        task.updatedAt = now;
        task.finishedAt = now;
        task.expiresAt = now + HISTORY_RETENTION_MS;
        if (status === 'success') {
            task.percent = 100;
        }
        this.persist();
        this.emit();
    }

    private patch(taskId: string, updates: Partial<UploadTaskRecord>, persist = false) {
        const task = this.find(taskId);
        if (!task) {
            return;
        }
        Object.assign(task, updates, {updatedAt: Date.now()});
        if (persist) {
            this.persist();
        }
        this.emit();
    }

    private find(taskId: string) {
        return this.tasks.find(task => task.id === taskId);
    }

    private trimHistory() {
        if (this.tasks.length <= HISTORY_MAX_RECORDS) {
            return;
        }
        const terminal = this.tasks
            .filter(task => terminalStatuses.has(task.status))
            .sort((left, right) => left.updatedAt - right.updatedAt);
        const removeCount = Math.min(this.tasks.length - HISTORY_MAX_RECORDS, terminal.length);
        const removeIds = new Set(terminal.slice(0, removeCount).map(task => task.id));
        this.tasks = this.tasks.filter(task => !removeIds.has(task.id));
        for (const id of removeIds) {
            this.runtimes.delete(id);
        }
    }

    private persist() {
        if (!this.accountId) {
            return;
        }
        LocalStorage.set(STORAGE_KEY_PREFIX + this.accountId, this.tasks);
    }

    private emit() {
        const snapshot = [...this.tasks];
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
