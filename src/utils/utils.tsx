import i18n from "@/react-i18next/i18n";

interface LocalFontData {
    family: string;
}

interface WindowWithLocalFonts extends Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
}

export function renderSize(value: number | undefined, places?: number) {
    if (undefined == value || value === 0) {
        return "0 B";
    }
    const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let srcSize = value;
    let index = Math.floor(Math.log(srcSize) / Math.log(1024));
    let size = srcSize / Math.pow(1024, index);
    if (places == undefined) {
        places = 2
    }
    let sizeStr = size.toFixed(places);
    return sizeStr + ' ' + unitArr[index];
}

export function requestFullScreen(element: HTMLElement) {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        element.requestFullscreen();
    }
}

export const generateRandomId = (): string => {
    const array = new Uint8Array(16); // 16 bytes = 128 bits
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

function isFontAvailable(fontName: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        return false;
    }
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789';

    context.font = '72px monospace';
    const baselineSize = context.measureText(text).width;

    context.font = '72px ' + fontName + ', monospace';
    const newSize = context.measureText(text).width;
    return newSize !== baselineSize;
}

/**
 * 获取系统可用字体列表
 * 优先使用 Local Font Access API，如果不支持则使用预定义列表检测
 */
export async function getAvailableFonts(): Promise<string[]> {
    try {
        const queryLocalFonts = (window as WindowWithLocalFonts).queryLocalFonts;
        if (queryLocalFonts) {
            const fonts = await queryLocalFonts();
            const fontFamilies = new Set<string>();

            fonts.forEach((font) => {
                fontFamilies.add(font.family);
            });

            // 转换为数组并排序
            const fontList = Array.from(fontFamilies).sort();

            if (fontList.length > 0) {
                return fontList;
            }
        }
    } catch (error) {
        console.warn('Local Font Access API not available or permission denied:', error);
    }

    // 回退到预定义列表检测
    return getCommonFonts();
}

/**
 * 获取常见字体列表并检测可用性
 */
function getCommonFonts(): string[] {
    const commonFonts = [
        // Windows 常见终端字体
        'Consolas',
        'Cascadia Code',
        'Cascadia Mono',
        'Courier New',
        'Lucida Console',
        'MS Gothic',

        // macOS 常见终端字体
        'Menlo',
        'Monaco',
        'SF Mono',
        'Courier',

        // Linux 常见终端字体
        'DejaVu Sans Mono',
        'Liberation Mono',
        'Ubuntu Mono',
        'Noto Mono',
        'Droid Sans Mono',

        // 跨平台开发字体
        'Fira Code',
        'Fira Mono',
        'JetBrains Mono',
        'Source Code Pro',
        'Roboto Mono',
        'IBM Plex Mono',
        'Hack',
        'Inconsolata',
        'Anonymous Pro',
        'Victor Mono',
        'Monoid',
        'Iosevka',

        // 通用字体
        'Monospace',
        'monospace'
    ];

    // 过滤出可用的字体
    return commonFonts.filter(font => isFontAvailable(font));
}

export function isMobileByMediaQuery() {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    return mediaQuery.matches;
}

function isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

export function isMac() {
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

// 1、在IE中这个事件你只要去关闭窗口就触发。
// 2、谷歌、火狐等在F12调试模式中也会起效
// 3、谷歌、火狐、QQ等浏览器中被优化了，需要用户在页面有过任何操作才会出现提示！（坑）。
export const beforeUnload = function (event: BeforeUnloadEvent) {
    // 一些浏览器可能需要设置 returnValue 属性
    event.preventDefault();
    event.returnValue = i18n.t('general.leave_confirm');
}

export const browserDownload = (url: string) => {
    window.removeEventListener('beforeunload', beforeUnload, true);
    const a = document.createElement('a');
    a.href = url;
    if (isFirefox()) {
        a.target = '_blank';
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.addEventListener('beforeunload', beforeUnload, true);
}

export const formatUptime = (seconds: number | undefined | null): string => {
    if (seconds === undefined || seconds === null) return '-';
    if (seconds <= 0) return `0 ${i18n.t('general.second')}`;

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];

    // 智能显示：只显示最重要的两个单位，避免文本过长
    if (days > 0) {
        parts.push(`${days} ${i18n.t('general.days')}`);
        if (hours > 0) parts.push(`${hours} ${i18n.t('general.hour')}`);
    } else if (hours > 0) {
        parts.push(`${hours} ${i18n.t('general.hour')}`);
        if (minutes > 0) parts.push(`${minutes} ${i18n.t('general.minute')}`);
    } else if (minutes > 0) {
        parts.push(`${minutes} ${i18n.t('general.minute')}`);
    }

    return parts.length > 0 ? parts.join(' ') : i18n.t('general.less_than_one_minute');
};

export function getColor(percent: number): string {
    if (percent < 60) return "#06DF73";
    if (percent < 85) return "#FF8905";
    return "#FF6467";
}
