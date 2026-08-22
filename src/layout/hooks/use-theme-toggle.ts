import {useLayoutEffect} from 'react';
import {flushSync} from 'react-dom';
import {DarkTheme, DefaultTheme, useNTTheme} from '@/hook/use-theme.ts';
import {setThemeColor} from '@/utils/theme.ts';

/**
 * 主题切换 Hook
 * 封装主题切换逻辑和 View Transition 动画效果
 */
export function useThemeToggle() {
    const [ntTheme, setNTTheme] = useNTTheme();
    const isDarkMode = ntTheme.isDark;

    const applyDarkMode = (isDark: boolean) => {
        document.documentElement.classList.toggle('dark', isDark);
        setThemeColor(isDark ? '#09090B' : '#fff');
        setNTTheme(isDark ? DarkTheme : DefaultTheme);
    };

    // 首次渲染时同步本地保存的主题状态
    useLayoutEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        setThemeColor(isDarkMode ? '#09090B' : '#fff');
    }, [isDarkMode]);

    // 主题切换函数（包含动画效果）
    const toggleDarkMode = async (isDark: boolean) => {
        // 如果不支持 View Transition API 或用户偏好减少动画，直接切换
        if (
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            applyDarkMode(isDark);
            return;
        }

        // 在 View Transition 更新回调中一次性应用完整主题，确保新快照内容一致
        const transition = document.startViewTransition(() => {
            flushSync(() => {
                applyDarkMode(isDark);
            });
        });

        await transition.finished;
    };

    return {isDarkMode, toggleDarkMode};
}
