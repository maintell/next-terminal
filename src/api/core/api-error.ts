export type ApiErrorKind = 'http' | 'network' | 'unknown';

type ApiErrorOptions = {
    status?: number;
    statusText?: string;
    code?: number;
    kind?: ApiErrorKind;
    cause?: unknown;
};

export class ApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly code: number;
    readonly kind: ApiErrorKind;
    readonly cause?: unknown;

    constructor(message: string, options: ApiErrorOptions = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = options.status ?? 0;
        this.statusText = options.statusText ?? '';
        this.code = options.code ?? 0;
        this.kind = options.kind ?? 'unknown';
        this.cause = options.cause;
    }
}

const accessControlErrorCodes = new Set([10010, 10011, 10025, 10026]);

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isAccessControlError = (error: ApiError): boolean => accessControlErrorCodes.has(error.code);

export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return String(error || 'Unknown error');
};
