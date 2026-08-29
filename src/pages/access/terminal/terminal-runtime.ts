import {Message, MessageTypeData, MessageTypePing, MessageTypeResize} from '@/pages/access/Terminal';
import {FitAddon} from '@xterm/addon-fit';
import {Terminal, type ITerminalOptions, type ITerminalInitOnlyOptions} from '@xterm/xterm';

interface TerminalConnectionHandlers {
    onOpen?: (event: Event) => void;
    onMessage?: (event: MessageEvent) => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
}

interface TerminalRuntimeOptions {
    container: HTMLDivElement;
    terminalOptions?: ITerminalOptions & ITerminalInitOnlyOptions;
    readOnly?: boolean;
    sendResize?: boolean;
    pingInterval?: number;
    configureTerminal?: (terminal: Terminal) => void;
}

type TerminalInputHandler = (data: string, runtime: TerminalRuntime) => void;

/**
 * SSH/Telnet 终端唯一的底层运行时。
 *
 * 负责 Xterm、FitAddon、容器尺寸观察、WebSocket、输入、resize、ping 和资源销毁。
 * 页面组件只负责会话获取、业务消息处理和 UI。
 */
export class TerminalRuntime {
    readonly terminal: Terminal;
    readonly fitAddon: FitAddon;

    private websocket: WebSocket | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeAnimationFrame = 0;
    private pingTimer = 0;
    private disposed = false;
    private inputHandler: TerminalInputHandler | undefined;
    private sendResize: boolean;

    constructor(options: TerminalRuntimeOptions) {
        this.sendResize = options.sendResize !== false;
        this.terminal = new Terminal(options.terminalOptions);
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.open(options.container);
        options.configureTerminal?.(this.terminal);

        if (!options.readOnly) {
            this.terminal.onData((data) => {
                if (this.inputHandler) {
                    this.inputHandler(data, this);
                    return;
                }
                this.sendMessage(MessageTypeData, data);
            });
        }

        this.terminal.onResize(({cols, rows}) => {
            if (this.sendResize) {
                this.sendMessage(MessageTypeResize, `${cols},${rows}`);
            }
        });

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
            this.resizeObserver.observe(options.container);
        }
        this.scheduleFit();

        const pingInterval = options.pingInterval ?? 5000;
        if (pingInterval > 0) {
            this.pingTimer = window.setInterval(() => {
                this.sendMessage(MessageTypePing, Date.now().toString());
            }, pingInterval);
        }
    }

    get socket() {
        return this.websocket;
    }

    get connected() {
        return this.websocket?.readyState === WebSocket.OPEN;
    }

    setInputHandler(handler?: TerminalInputHandler) {
        this.inputHandler = handler;
    }

    connect(url: string, handlers: TerminalConnectionHandlers = {}) {
        if (this.disposed) {
            return null;
        }
        this.closeSocket();

        const websocket = new WebSocket(url);
        this.websocket = websocket;
        websocket.onopen = (event) => handlers.onOpen?.(event);
        websocket.onmessage = (event) => handlers.onMessage?.(event);
        websocket.onerror = (event) => handlers.onError?.(event);
        websocket.onclose = (event) => {
            if (this.websocket === websocket) {
                this.websocket = null;
            }
            if (!this.disposed) {
                handlers.onClose?.(event);
            }
        };
        return websocket;
    }

    sendMessage(type: number, content: string) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(new Message(type, content).toString());
            return true;
        }
        return false;
    }

    fit() {
        if (!this.disposed) {
            this.fitAddon.fit();
        }
    }

    focus() {
        this.terminal.focus();
    }

    closeSocket(code = 3886, reason = 'client quit') {
        const websocket = this.websocket;
        this.websocket = null;
        if (websocket) {
            websocket.onopen = null;
            websocket.onmessage = null;
            websocket.onerror = null;
            websocket.onclose = null;
            if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
                websocket.close(code, reason);
            }
        }
    }

    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.closeSocket();
        this.resizeObserver?.disconnect();
        cancelAnimationFrame(this.resizeAnimationFrame);
        clearInterval(this.pingTimer);
        this.terminal.dispose();
    }

    private scheduleFit() {
        cancelAnimationFrame(this.resizeAnimationFrame);
        this.resizeAnimationFrame = requestAnimationFrame(() => this.fit());
    }
}
