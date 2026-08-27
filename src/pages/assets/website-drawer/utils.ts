export const parseURL = (url: string) => {
    const parsedURL = new URL(url);
    const scheme = parsedURL.protocol.replace(':', '');
    const host = parsedURL.hostname;
    const port = parsedURL.port || (scheme === 'http' ? '80' : scheme === 'https' ? '443' : '');

    return { scheme, host, port };
};

export const normalizePublicIPRules = (ipRules?: string): string => {
    if (!ipRules) {
        return '';
    }

    return ipRules
        .split(/[,;\r\n]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .join('\n');
};
