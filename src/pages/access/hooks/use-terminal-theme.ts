import XtermThemes, {XtermTheme} from "@/color-theme/XtermThemes";
import {useSyncExternalStore} from "react";

type ConfigTerminalTheme = {
    selected: string | null,
    theme?: XtermTheme
    fontSize: number,
    fontFamily: string,
    lineHeight: number,
}

const defaultTheme = `Apple System Colors`
const storageKey = 'access-theme';

export const DefaultTerminalTheme = {
    selected: defaultTheme,
    theme: XtermThemes.filter(item => item.name === defaultTheme)[0],
    fontSize: 14,
    fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
    lineHeight: 1.0,
}

type ThemeUpdate = ConfigTerminalTheme | ((current: ConfigTerminalTheme) => ConfigTerminalTheme);
type ThemeListener = () => void;

const listeners = new Set<ThemeListener>();

const readStoredTheme = (): ConfigTerminalTheme => {
    try {
        const storedTheme = localStorage.getItem(storageKey);
        return storedTheme ? JSON.parse(storedTheme) as ConfigTerminalTheme : DefaultTerminalTheme;
    } catch (error) {
        console.warn('Ignoring invalid terminal theme cache', error);
        return DefaultTerminalTheme;
    }
};

let terminalTheme = readStoredTheme();

const subscribe = (listener: ThemeListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = () => terminalTheme;

const setTerminalTheme = (update: ThemeUpdate) => {
    terminalTheme = typeof update === 'function' ? update(terminalTheme) : update;
    try {
        localStorage.setItem(storageKey, JSON.stringify(terminalTheme));
    } catch (error) {
        console.warn('Failed to save terminal theme cache', error);
    }
    listeners.forEach(listener => listener());
};

export function useTerminalTheme() {
    const theme = useSyncExternalStore(subscribe, getSnapshot, () => DefaultTerminalTheme);
    return [theme, setTerminalTheme] as const;
}

export function CleanTheme(theme: ConfigTerminalTheme) {
    const selected = theme.selected || DefaultTerminalTheme.selected;
    return {
        ...theme,
        selected,
        theme: theme.theme ?? XtermThemes.find((item) => item.name === selected) ?? DefaultTerminalTheme.theme,
        fontSize: theme.fontSize > 0 ? theme.fontSize : DefaultTerminalTheme.fontSize,
        fontFamily: theme.fontFamily || DefaultTerminalTheme.fontFamily,
        lineHeight: theme.lineHeight > 0 ? theme.lineHeight : DefaultTerminalTheme.lineHeight,
    };
}
