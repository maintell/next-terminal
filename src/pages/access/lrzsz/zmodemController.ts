import type {Terminal} from "@xterm/xterm";
import {message as staticMessage} from "antd";
import type {MessageInstance} from "antd/es/message/interface";
import {
    Receiver,
    ReceiverEvent,
    Sender,
    SenderEvent,
    type FileRequest,
} from "@/lib/zmodem2";

type TransferDirection = "send" | "receive";
type Bytes = Uint8Array<ArrayBufferLike>;

interface ZmodemControllerOptions {
    terminal: Terminal;
    sendBytes: (data: Uint8Array) => void;
    writeData?: (data: Uint8Array) => void;
    enabled?: boolean;
    disabledMessage?: string;
    texts?: ZmodemControllerTexts;
    messageApi?: MessageInstance;
}

export interface ZmodemControllerTexts {
    saveDialogTitle: string;
    uploadSkippedTitle: string;
    uploadSkippedDescription: (fileName: string) => string;
    downloadCompleteTitle: string;
    progressUploadingTitle: string;
    progressDownloadingTitle: string;
    uploadNoRzResponse: string;
    uploadTransferActive: string;
    uploadNoFiles: string;
}

interface ReceivingFile {
    name: string;
    size: number;
    chunks: Uint8Array[];
    bytes: number;
}

const ZMODEM_MARKER = new Uint8Array([0x2a, 0x2a, 0x18, 0x42]);
const ZRQINIT_HEX = new Uint8Array([0x30, 0x30]);
const ZRINIT_HEX = new Uint8Array([0x30, 0x31]);
const DETECTION_FLUSH_DELAY_MS = 80;
const UPLOAD_RZ_RESPONSE_TIMEOUT_MS = 8000;
const BUFFER_SIZE = 10 * 1024 * 1024;
const PROGRESS_INTERVAL_MS = 600;
const CAN = 0x18;
const DEFAULT_TEXTS: ZmodemControllerTexts = {
    saveDialogTitle: "Save ZMODEM file",
    uploadSkippedTitle: "ZMODEM upload skipped",
    uploadSkippedDescription: (fileName) => `${fileName}: file already exists on the remote`,
    downloadCompleteTitle: "Download complete",
    progressUploadingTitle: "ZMODEM uploading",
    progressDownloadingTitle: "ZMODEM downloading",
    uploadNoRzResponse: "ZMODEM upload did not start. Make sure rz/lrzsz is installed on the remote host.",
    uploadTransferActive: "A ZMODEM transfer is already running.",
    uploadNoFiles: "No files to upload.",
};

function concatBytes(a: Bytes, b: Bytes): Bytes {
    if (a.length === 0) return b;
    if (b.length === 0) return a;
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
}

function copyBytes(data: Bytes): Bytes {
    const out = new Uint8Array(data.length);
    out.set(data);
    return out;
}

function findMarker(data: Uint8Array): number {
    for (let i = 0; i <= data.length - ZMODEM_MARKER.length; i++) {
        if (
            data[i] === ZMODEM_MARKER[0]
            && data[i + 1] === ZMODEM_MARKER[1]
            && data[i + 2] === ZMODEM_MARKER[2]
            && data[i + 3] === ZMODEM_MARKER[3]
        ) {
            return i;
        }
    }
    return -1;
}

function zmodemProbeSuffixLength(data: Uint8Array): number {
    const maxLength = Math.min(data.length, ZMODEM_MARKER.length + 1);
    for (let length = maxLength; length > 0; length--) {
        let matched = true;
        for (let i = 0; i < length; i++) {
            const expected = i < ZMODEM_MARKER.length ? ZMODEM_MARKER[i] : 0x30;
            if (data[data.length - length + i] !== expected) {
                matched = false;
                break;
            }
        }
        if (matched) {
            return length;
        }
    }
    return 0;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function sanitizeFilename(name: string): string {
    // eslint-disable-next-line no-control-regex
    const value = name.trim().replace(/[\\/:*?"<>|\u{0}-\u{1f}]/gu, "_");
    return value || "zmodem-download.bin";
}

function createTransferId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `zmodem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function chooseUploadFile(): Promise<File | null> {
    const picker = window as Window & {
        showOpenFilePicker?: () => Promise<Array<{getFile: () => Promise<File>}>>;
    };
    if (typeof picker.showOpenFilePicker === "function") {
        const handles = await picker.showOpenFilePicker();
        if (handles.length === 0) return null;
        return handles[0].getFile();
    }

    return new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.onchange = () => {
            const file = input.files?.[0] ?? null;
            input.remove();
            resolve(file);
        };
        input.oncancel = () => {
            input.remove();
            resolve(null);
        };
        document.body.appendChild(input);
        input.click();
    });
}

export class ZmodemController {
    private terminal: Terminal;
    private sendBytes: (data: Uint8Array) => void;
    private writeData: (data: Uint8Array) => void;
    private receiver: Receiver | null = null;
    private sender: Sender | null = null;
    private pendingProbe: Bytes = new Uint8Array(0);
    private receivingFile: ReceivingFile | null = null;
    private sendingFile: File | null = null;
    private pendingUploadFiles: File[] = [];
    private sendBuffer: Uint8Array | null = null;
    private sendBufferOffset = 0;
    private readingSendBuffer = false;
    private transferStartTime = 0;
    private bytesTransferred = 0;
    private lastProgressAt = 0;
    private sendQueue: Uint8Array[] = [];
    private senderPumping = false;
    private receiveQueue: Uint8Array[] = [];
    private receiverPumping = false;
    private probeFlushTimer: number | null = null;
    private uploadResponseTimer: number | null = null;
    private progressToastId: string | number | null = null;
    private enabled: boolean;
    private disabledMessage: string;
    private texts: ZmodemControllerTexts;
    private messageApi: MessageInstance;
    private disabledNoticeShown = false;
    private disposed = false;

    constructor(options: ZmodemControllerOptions) {
        this.terminal = options.terminal;
        this.sendBytes = options.sendBytes;
        this.writeData = options.writeData ?? ((data) => this.terminal.write(data));
        this.enabled = options.enabled ?? true;
        this.disabledMessage = options.disabledMessage ?? "ZMODEM is only supported for UTF-8 terminal encoding.";
        this.texts = options.texts ?? DEFAULT_TEXTS;
        this.messageApi = options.messageApi ?? staticMessage;
    }

    dispose(): void {
        this.disposed = true;
        this.clearProbeFlushTimer();
        this.clearUploadResponseTimer();
        this.dismissProgressToast();
        this.pendingProbe = new Uint8Array(0);
        this.receiver = null;
        this.sender = null;
        this.pendingUploadFiles = [];
        this.sendingFile = null;
        this.sendBuffer = null;
        this.sendQueue = [];
        this.receiveQueue = [];
        const file = this.receivingFile;
        this.receivingFile = null;
        file?.chunks.splice(0);
    }

    isActive(): boolean {
        return this.receiver !== null || this.sender !== null;
    }

    prepareUploadFiles(files: File[]): boolean {
        if (this.disposed) return false;
        if (!this.enabled) {
            this.terminal.writeln(`\r\n${this.disabledMessage}`);
            void this.messageApi.error(this.disabledMessage);
            return false;
        }
        if (this.isActive() || this.pendingUploadFiles.length > 0) {
            this.terminal.writeln(`\r\n${this.texts.uploadTransferActive}`);
            void this.messageApi.error(this.texts.uploadTransferActive);
            return false;
        }
        const uploadFiles = files.filter((file) => file.size >= 0);
        if (uploadFiles.length === 0) {
            this.terminal.writeln(`\r\n${this.texts.uploadNoFiles}`);
            void this.messageApi.error(this.texts.uploadNoFiles);
            return false;
        }
        this.pendingUploadFiles = uploadFiles;
        this.scheduleUploadResponseTimeout();
        return true;
    }

    cancelPendingUploadFiles(): void {
        this.pendingUploadFiles = [];
        this.clearUploadResponseTimer();
    }

    consume(data: Uint8Array): void {
        if (this.disposed) return;
        if (data.length === 0) return;
        if (this.receiver) {
            this.receiveQueue.push(data);
            void this.pumpReceiverQueue();
            return;
        }
        if (this.sender) {
            this.sendQueue.push(data);
            void this.pumpSenderQueue();
            return;
        }
        this.consumeIdle(data);
    }

    private consumeIdle(data: Uint8Array): void {
        this.clearProbeFlushTimer();
        const combined = concatBytes(this.pendingProbe, data);
        const markerIndex = findMarker(combined);
        if (markerIndex < 0) {
            const keepLength = zmodemProbeSuffixLength(combined);
            const writableLength = combined.length - keepLength;
            if (writableLength > 0) {
                this.writeData(combined.subarray(0, writableLength));
            }
            this.pendingProbe = keepLength > 0
                ? copyBytes(combined.subarray(writableLength))
                : new Uint8Array(0);
            this.scheduleProbeFlush();
            return;
        }

        if (markerIndex > 0) {
            this.writeData(combined.subarray(0, markerIndex));
        }

        if (markerIndex + 6 > combined.length) {
            this.pendingProbe = copyBytes(combined.subarray(markerIndex));
            this.scheduleProbeFlush();
            return;
        }

        const type1 = combined[markerIndex + 4];
        const type2 = combined[markerIndex + 5];
        const zmodemData = combined.subarray(markerIndex);

        if (type1 === ZRQINIT_HEX[0] && type2 === ZRQINIT_HEX[1]) {
            if (!this.enabled) {
                this.rejectDisabledTransfer();
                return;
            }
            this.startReceiver(zmodemData);
            return;
        }

        if (type1 === ZRINIT_HEX[0] && type2 === ZRINIT_HEX[1]) {
            if (!this.enabled) {
                this.rejectDisabledTransfer();
                return;
            }
            this.startSender(zmodemData);
            return;
        }

        this.writeData(combined.subarray(markerIndex));
        this.pendingProbe = new Uint8Array(0);
    }

    private scheduleProbeFlush(): void {
        if (this.pendingProbe.length === 0 || this.probeFlushTimer !== null) {
            return;
        }
        this.probeFlushTimer = window.setTimeout(() => {
            this.probeFlushTimer = null;
            if (this.pendingProbe.length === 0 || this.isActive() || this.disposed) {
                return;
            }
            this.writeData(this.pendingProbe);
            this.pendingProbe = new Uint8Array(0);
        }, DETECTION_FLUSH_DELAY_MS);
    }

    private clearProbeFlushTimer(): void {
        if (this.probeFlushTimer === null) {
            return;
        }
        window.clearTimeout(this.probeFlushTimer);
        this.probeFlushTimer = null;
    }

    private scheduleUploadResponseTimeout(): void {
        this.clearUploadResponseTimer();
        this.uploadResponseTimer = window.setTimeout(() => {
            this.uploadResponseTimer = null;
            if (this.disposed || this.sender || this.pendingUploadFiles.length === 0) {
                return;
            }
            this.pendingUploadFiles = [];
            this.terminal.writeln(`\r\n${this.texts.uploadNoRzResponse}`);
            void this.messageApi.error(this.texts.uploadNoRzResponse);
        }, UPLOAD_RZ_RESPONSE_TIMEOUT_MS);
    }

    private clearUploadResponseTimer(): void {
        if (this.uploadResponseTimer === null) {
            return;
        }
        window.clearTimeout(this.uploadResponseTimer);
        this.uploadResponseTimer = null;
    }

    private startReceiver(initialData: Uint8Array): void {
        this.pendingProbe = new Uint8Array(0);
        this.receiver = new Receiver();
        this.transferStartTime = Date.now();
        this.bytesTransferred = 0;
        this.lastProgressAt = 0;
        this.receiveQueue.push(initialData);
        this.dismissProgressToast();
        this.terminal.writeln("\r\nZMODEM: detected download.");
        void this.pumpReceiverQueue();
    }

    private startSender(initialData: Uint8Array): void {
        this.clearUploadResponseTimer();
        this.pendingProbe = new Uint8Array(0);
        this.sender = new Sender(false);
        this.transferStartTime = Date.now();
        this.bytesTransferred = 0;
        this.lastProgressAt = 0;
        this.sendQueue.push(initialData);
        this.dismissProgressToast();
        this.terminal.writeln("\r\nZMODEM: detected upload.");
        void this.pumpSenderQueue();
        void this.pickAndSendNextFile();
    }

    private async pickAndSendNextFile(): Promise<void> {
        try {
            const file = this.pendingUploadFiles.shift() ?? await chooseUploadFile();
            if (!file || !this.sender) {
                this.abortSender("ZMODEM: upload cancelled.");
                return;
            }
            this.startSendingFile(file);
        } catch (error) {
            this.abortSender(`ZMODEM: upload failed - ${String(error)}`);
        }
    }

    private startSendingFile(file: File): void {
        if (!this.sender) return;
        this.sendingFile = file;
        this.sendBuffer = null;
        this.sendBufferOffset = 0;
        this.readingSendBuffer = false;
        this.bytesTransferred = 0;
        this.transferStartTime = Date.now();
        this.lastProgressAt = 0;
        this.sender.startFile(file.name, file.size);
        this.terminal.writeln(`\r\nZMODEM: sending ${file.name} (${formatFileSize(file.size)})...`);
        void this.pumpSenderQueue();
    }

    private startNextQueuedFileOrFinish(): void {
        const nextFile = this.pendingUploadFiles.shift();
        if (nextFile) {
            this.startSendingFile(nextFile);
            return;
        }
        this.sender?.finishSession();
    }

    private async pumpSenderQueue(): Promise<void> {
        if (this.senderPumping || !this.sender) return;
        this.senderPumping = true;
        try {
            while (this.sender && !this.disposed) {
                const chunk = this.sendQueue.shift();
                if (!chunk) {
                    await this.pumpSender();
                    break;
                }
                let offset = 0;
                let guard = 0;
                while (this.sender && offset < chunk.length && guard++ < 1000) {
                    const consumed = this.sender.feedIncoming(chunk.subarray(offset));
                    offset += consumed;
                    await this.pumpSender();
                    if (consumed === 0) break;
                }
            }
        } catch (error) {
            this.abortSender(`ZMODEM: sender error - ${String(error)}`);
        } finally {
            this.senderPumping = false;
            if (this.sender && this.sendQueue.length > 0) {
                void this.pumpSenderQueue();
            }
        }
    }

    private async pumpSender(): Promise<boolean> {
        const sender = this.sender;
        if (!sender) return false;
        let didWork = false;

        const outgoing = sender.drainOutgoing();
        if (outgoing.length > 0) {
            this.sendBytes(outgoing);
            didWork = true;
        }

        while (this.sender && !this.disposed) {
            const request = this.sender.pollFile();
            if (request) {
                const fed = await this.feedSenderFileRequest(request);
                if (!fed) break;
                didWork = true;
                const inner = this.sender?.drainOutgoing();
                if (inner && inner.length > 0) {
                    this.sendBytes(inner);
                }
                continue;
            }

            const event = this.sender.pollEvent();
            if (!event) break;
            didWork = true;
            if (event === SenderEvent.FileComplete) {
                this.writeCompletion("sent", this.bytesTransferred);
                this.sendingFile = null;
                this.sendBuffer = null;
                this.sendBufferOffset = 0;
                this.startNextQueuedFileOrFinish();
            } else if (event === SenderEvent.FileSkipped) {
                this.dismissProgressToast();
                const fileName = this.sendingFile?.name ?? "file";
                this.terminal.writeln(`\r\nZMODEM: ${fileName} skipped by receiver (already exists).`);
                void this.messageApi.warning(`${this.texts.uploadSkippedTitle}: ${this.texts.uploadSkippedDescription(fileName)}`);
                this.sendingFile = null;
                this.sendBuffer = null;
                this.sendBufferOffset = 0;
                this.bytesTransferred = 0;
                this.startNextQueuedFileOrFinish();
            } else if (event === SenderEvent.SessionComplete) {
                this.dismissProgressToast();
                this.terminal.writeln("\r\nZMODEM: upload session complete.");
                this.sender = null;
                this.sendingFile = null;
                this.sendBuffer = null;
                this.pendingUploadFiles = [];
                break;
            }
        }

        const finalOutgoing = this.sender?.drainOutgoing();
        if (finalOutgoing && finalOutgoing.length > 0) {
            this.sendBytes(finalOutgoing);
            didWork = true;
        }
        return didWork;
    }

    private async feedSenderFileRequest(request: FileRequest): Promise<boolean> {
        const file = this.sendingFile;
        const sender = this.sender;
        if (!file || !sender || this.readingSendBuffer) return false;

        if (
            this.sendBuffer
            && request.offset >= this.sendBufferOffset
            && request.offset + request.len <= this.sendBufferOffset + this.sendBuffer.length
        ) {
            const start = request.offset - this.sendBufferOffset;
            const chunk = this.sendBuffer.subarray(start, start + request.len);
            sender.feedFile(chunk);
            this.bytesTransferred += chunk.length;
            this.updateProgress("sending", this.bytesTransferred, file.size);
            return true;
        }

        this.readingSendBuffer = true;
        try {
            const readSize = Math.max(request.len, BUFFER_SIZE);
            const end = Math.min(request.offset + readSize, file.size);
            const buffer = await file.slice(request.offset, end).arrayBuffer();
            if (!this.sender) return false;
            this.sendBuffer = new Uint8Array(buffer);
            this.sendBufferOffset = request.offset;
            const chunk = this.sendBuffer.subarray(0, Math.min(request.len, this.sendBuffer.length));
            this.sender.feedFile(chunk);
            this.bytesTransferred += chunk.length;
            this.updateProgress("sending", this.bytesTransferred, file.size);
            return true;
        } finally {
            this.readingSendBuffer = false;
        }
    }

    private async pumpReceiverQueue(): Promise<void> {
        if (this.receiverPumping || !this.receiver) return;
        this.receiverPumping = true;
        try {
            while (this.receiver && !this.disposed) {
                const chunk = this.receiveQueue.shift();
                if (!chunk) {
                    await this.pumpReceiver();
                    break;
                }
                let offset = 0;
                let guard = 0;
                while (this.receiver && offset < chunk.length && guard++ < 1000) {
                    const consumed = this.receiver.feedIncoming(chunk.subarray(offset));
                    offset += consumed;
                    await this.pumpReceiver();
                    if (consumed === 0) break;
                }
            }
        } catch (error) {
            await this.abortReceiver(`ZMODEM: receiver error - ${String(error)}`);
        } finally {
            this.receiverPumping = false;
            if (this.receiver && this.receiveQueue.length > 0) {
                void this.pumpReceiverQueue();
            }
        }
    }

    private async pumpReceiver(): Promise<boolean> {
        const receiver = this.receiver;
        if (!receiver) return false;
        let didWork = false;

        while (this.receiver && !this.disposed) {
            const event = receiver.pollEvent();
            if (!event) break;
            didWork = true;
            if (event === ReceiverEvent.FileStart) {
                const ok = await this.beginReceivingFile(receiver.getFileName(), receiver.getFileSize());
                if (!ok) return false;
            } else if (event === ReceiverEvent.FileComplete) {
                await this.finishReceivingFile();
            } else if (event === ReceiverEvent.SessionComplete) {
                const outgoing = receiver.drainOutgoing();
                if (outgoing.length > 0) {
                    this.sendBytes(outgoing);
                }
                this.dismissProgressToast();
                this.terminal.writeln("\r\nZMODEM: download session complete.");
                this.receiver = null;
                this.receivingFile = null;
                return true;
            }
        }

        const outgoing = receiver.drainOutgoing();
        if (outgoing.length > 0) {
            this.sendBytes(outgoing);
            didWork = true;
        }

        const fileChunk = receiver.drainFile();
        if (fileChunk.length > 0) {
            await this.appendReceivedChunk(fileChunk);
            didWork = true;
            await this.pumpReceiver();
        }

        const finalOutgoing = this.receiver?.drainOutgoing();
        if (finalOutgoing && finalOutgoing.length > 0) {
            this.sendBytes(finalOutgoing);
            didWork = true;
        }

        return didWork;
    }

    private async beginReceivingFile(name: string, size: number): Promise<boolean> {
        const safeName = sanitizeFilename(name);
        this.bytesTransferred = 0;
        this.dismissProgressToast();
        this.terminal.writeln(`\r\nZMODEM: receiving ${safeName} (${formatFileSize(size)})...`);

        this.receivingFile = {
            name: safeName,
            size,
            chunks: [],
            bytes: 0,
        };
        return true;
    }

    private async appendReceivedChunk(chunk: Uint8Array): Promise<void> {
        const file = this.receivingFile;
        if (!file) return;
        file.bytes += chunk.length;
        this.bytesTransferred += chunk.length;
        this.updateProgress("receiving", file.bytes, file.size);

        file.chunks.push(new Uint8Array(chunk));
    }

    private async finishReceivingFile(): Promise<void> {
        const file = this.receivingFile;
        if (!file) return;
        const blob = new Blob(file.chunks as BlobPart[], {type: "application/octet-stream"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.dismissProgressToast();
        void this.messageApi.success(`${this.texts.downloadCompleteTitle}: ${file.name}`);
        this.writeCompletion("received", file.bytes);
        this.receivingFile = null;
    }

    private async abortReceiver(message: string): Promise<void> {
        this.dismissProgressToast();
        this.terminal.writeln(`\r\n${message}`);
        const file = this.receivingFile;
        this.receivingFile = null;
        this.receiver = null;
        this.receiveQueue = [];
        file?.chunks.splice(0);
        this.sendBytes(new Uint8Array([CAN, CAN, CAN, CAN, CAN]));
    }

    private abortSender(message: string): void {
        this.dismissProgressToast();
        this.terminal.writeln(`\r\n${message}`);
        this.sender = null;
        this.pendingUploadFiles = [];
        this.sendingFile = null;
        this.sendQueue = [];
        this.sendBuffer = null;
        this.sendBytes(new Uint8Array([CAN, CAN, CAN, CAN, CAN]));
    }

    private rejectDisabledTransfer(): void {
        this.pendingProbe = new Uint8Array(0);
        if (!this.disabledNoticeShown) {
            this.disabledNoticeShown = true;
            this.terminal.writeln(`\r\n${this.disabledMessage}`);
        }
        this.sendBytes(new Uint8Array([CAN, CAN, CAN, CAN, CAN]));
    }

    private updateProgress(direction: TransferDirection | "sending" | "receiving", current: number, total: number): void {
        const now = Date.now();
        if (now - this.lastProgressAt < PROGRESS_INTERVAL_MS) {
            return;
        }
        this.lastProgressAt = now;
        const percent = total > 0 ? `${((current / total) * 100).toFixed(1)}%` : "0.0%";
        const elapsed = Math.max(0.001, (now - this.transferStartTime) / 1000);
        const speed = formatFileSize(current / elapsed);
        const title = direction === "sending" ? this.texts.progressUploadingTitle : this.texts.progressDownloadingTitle;
        const progressText = `${percent} · ${formatFileSize(current)}/${formatFileSize(total)} · ${speed}/s`;
        if (this.progressToastId === null) {
            this.progressToastId = createTransferId();
        }
        void this.messageApi.open({
            key: this.progressToastId,
            type: "loading",
            content: `${title}: ${progressText}`,
            duration: 0,
        });
    }

    private dismissProgressToast(): void {
        if (this.progressToastId === null) {
            return;
        }
        this.messageApi.destroy(this.progressToastId);
        this.progressToastId = null;
    }

    private writeCompletion(kind: "sent" | "received", bytes: number): void {
        const elapsed = Math.max(0.001, (Date.now() - this.transferStartTime) / 1000);
        const speed = formatFileSize(bytes / elapsed);
        this.terminal.writeln(`\r\nZMODEM: file ${kind}. ${formatFileSize(bytes)} in ${elapsed.toFixed(1)}s (${speed}/s)`);
    }
}
