import {theme, type ThemeConfig} from "antd";
import {useSyncExternalStore} from "react";

export type ConfigTheme = {
    isDark: boolean
    algorithm: NonNullable<ThemeConfig['algorithm']>,
    backgroundColor?: string,
}

export const DefaultTheme: ConfigTheme = {
    isDark: false,
    algorithm: theme.defaultAlgorithm,
    backgroundColor: '#fff',
}

export const DarkTheme: ConfigTheme = {
    isDark: true,
    algorithm: theme.darkAlgorithm,
    backgroundColor: '#141414',
    // backgroundColor: '#101217',
}

const themeStorageKey = 'nt-theme';

const getInitialIsDark = () => {
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === null) {
        return DefaultTheme.isDark;
    }

    try {
        const parsedTheme = JSON.parse(storedTheme) as ConfigTheme | boolean | 'dark' | 'light';
        if (typeof parsedTheme === 'boolean') {
            return parsedTheme;
        }
        if (parsedTheme === 'dark' || parsedTheme === 'light') {
            return parsedTheme === 'dark';
        }
        return parsedTheme.isDark === true;
    } catch {
        return DefaultTheme.isDark;
    }
};

let currentIsDark = getInitialIsDark();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = () => currentIsDark;

export function useNTTheme() {
    const isDark = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const config = isDark ? DarkTheme : DefaultTheme;

    const setTheme = (update: ConfigTheme | ((previousTheme: ConfigTheme) => ConfigTheme)) => {
        const previousTheme = currentIsDark ? DarkTheme : DefaultTheme;
        const nextTheme = typeof update === 'function' ? update(previousTheme) : update;
        if (currentIsDark === nextTheme.isDark) {
            return;
        }

        currentIsDark = nextTheme.isDark;
        localStorage.setItem(themeStorageKey, JSON.stringify({isDark: currentIsDark}));
        listeners.forEach(listener => listener());
    };

    return [config, setTheme] as const;
}
