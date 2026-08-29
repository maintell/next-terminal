import {useEffect, type ReactNode} from 'react';

interface AccessDarkThemeProps {
    children: ReactNode;
}

const AccessDarkTheme = ({children}: AccessDarkThemeProps) => {
    useEffect(() => {
        const root = document.documentElement;
        const wasDark = root.classList.contains('dark');
        const wasLight = root.classList.contains('light');

        root.classList.remove('light');
        root.classList.add('dark');

        return () => {
            root.classList.remove('dark', 'light');
            if (wasDark) {
                root.classList.add('dark');
            }
            if (wasLight) {
                root.classList.add('light');
            }
        };
    }, []);

    return children;
};

export default AccessDarkTheme;
