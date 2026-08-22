import {atom} from "jotai/index";
import {useAtom} from "jotai/index";
import type {MapToken, SeedToken} from "antd/es/theme/interface";
import {theme} from "antd";

type ConfigTheme = {
    isDark: boolean
    algorithm: (token: SeedToken) => MapToken,
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

const isDarkAtom = atom(getInitialIsDark());

const configAtom = atom(
    (get) => get(isDarkAtom) ? DarkTheme : DefaultTheme,
    (get, set, update: ConfigTheme | ((previousTheme: ConfigTheme) => ConfigTheme)) => {
        const previousTheme = get(isDarkAtom) ? DarkTheme : DefaultTheme;
        const nextTheme = typeof update === 'function' ? update(previousTheme) : update;
        set(isDarkAtom, nextTheme.isDark);
        localStorage.setItem(themeStorageKey, JSON.stringify({isDark: nextTheme.isDark}));
    },
);

export function useNTTheme() {
    return useAtom(configAtom)
}
