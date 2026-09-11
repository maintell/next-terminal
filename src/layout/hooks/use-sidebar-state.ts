import {useEffect, useState} from 'react';
import type {MenuProps} from 'antd';
import {useMobile} from '@/hook/use-mobile.ts';

/** 侧边栏只展开一个分组，路由变化或展开侧边栏时定位当前页面。 */
export function useSidebarState(menus: MenuProps['items'], pathname: string) {
    const {isMobile} = useMobile();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
    const [stateOpenKeys, setStateOpenKeys] = useState<string[]>([]);
    const current = pathname.split('/')[1] ?? '';
    const groups = (menus ?? []).filter(item => item && 'children' in item && item.children?.length);
    const activeGroup = groups.find(item => item && 'children' in item && item.children?.some(child => child?.key === current));
    const activeGroupKey = activeGroup?.key === undefined ? '' : String(activeGroup.key);

    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [isMobile]);

    useEffect(() => {
        setStateOpenKeys(activeGroupKey && (!collapsed || isMobile) ? [activeGroupKey] : []);
    }, [pathname, activeGroupKey, collapsed, isMobile, mobileMenuVisible]);

    const subMenuChange = (openKeys: string[]) => {
        const validKeys = openKeys.filter(key => groups.some(item => String(item?.key) === key));
        const newlyOpened = validKeys.find(key => !stateOpenKeys.includes(key));
        setStateOpenKeys(newlyOpened ? [newlyOpened] : validKeys.slice(-1));
    };

    return {
        collapsed,
        setCollapsed,
        mobileMenuVisible,
        setMobileMenuVisible,
        stateOpenKeys: stateOpenKeys.filter(key => groups.some(item => String(item?.key) === key)),
        subMenuChange,
    };
}
