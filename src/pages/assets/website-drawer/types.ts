import type {Dayjs} from "dayjs";
import type {GatewayHop} from "@/api/gateway-chain";

export type WebsiteOriginHostMode = 'origin' | 'service' | 'custom';
export type ConnectionMode = 'direct' | 'gateway' | 'proxy';

type HeaderRewriteMode = 'url_host' | 'regex';

interface HeaderRewriteRule {
    key: string;
    mode: HeaderRewriteMode;
    search?: string;
    replacement: string;
    scheme?: '' | 'http' | 'https';
}

interface WebsiteResponseBodyReplaceRule {
    search: string;
    replace: string;
    is_regex: boolean;
}

export interface WebsiteResponseModifyRule {
    name: string;
    match?: {
        path?: string;
        method?: string;
        headers?: Record<string, string>;
        status?: number;
    };
    actions?: {
        rewrite_headers?: HeaderRewriteRule[];
        set_headers?: Array<{key: string; value: string}>;
        add_headers?: Array<{key: string; value: string}>;
        remove_headers?: string[];
        body_replace?: WebsiteResponseBodyReplaceRule[];
    };
}

export interface WebsiteFormData {
    id?: string;
    name: string;
    domain: string;
    entrance?: string;
    enabled: boolean;
    scheme: string;
    host: string;
    port: number;
    targetUrl: string;
    logo?: string;
    groupId?: string;
    connectionMode: ConnectionMode;
    gatewayChain?: GatewayHop[];
    proxyId?: string;
    gatewaySource?: 'inherit' | 'custom';
    originHostMode?: WebsiteOriginHostMode;
    originHostCustom?: string;
    originTimeout?: number;
    insecureSkipVerify?: boolean;
    disableAccessLog?: boolean;
    headers?: Array<{ name: string; value: string }>;
    basicAuth?: {
        enabled: boolean;
        username?: string;
        password?: string;
    };
    cert?: {
        enabled: boolean;
        certId?: string;
    };
    public?: {
        enabled: boolean;
        expiredAt?: number | Dayjs;
        ip?: string;
		ipWhitelistIds?: string[];
        password?: string;
        timeLimit?: boolean;
        countries?: string[];
        provinces?: string[];
        cities?: string[];
        headerWhitelist?: string[];
        pathWhitelist?: string[];
    };
    tempAllow?: {
        enabled: boolean;
        durationMinutes?: number;
        autoRenew?: boolean;
    };
    modifyRules?: WebsiteResponseModifyRule[];
}
