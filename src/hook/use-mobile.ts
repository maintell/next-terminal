import {useEffect, useState} from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const MOBILE_QUERY = '(max-width: 768px)';
const TABLET_QUERY = '(min-width: 769px) and (max-width: 1024px)';

const getDeviceType = (): DeviceType => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
        return 'mobile';
    }
    if (window.matchMedia(TABLET_QUERY).matches) {
        return 'tablet';
    }
    return 'desktop';
};

/**
 * 移动端检测 Hook
 * 提供移动端状态管理和响应式断点检测
 */
export const useMobile = () => {
    const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);

    useEffect(() => {
        const mobileQuery = window.matchMedia(MOBILE_QUERY);
        const tabletQuery = window.matchMedia(TABLET_QUERY);
        const handleChange = () => setDeviceType(getDeviceType());

        mobileQuery.addEventListener('change', handleChange);
        tabletQuery.addEventListener('change', handleChange);

        return () => {
            mobileQuery.removeEventListener('change', handleChange);
            tabletQuery.removeEventListener('change', handleChange);
        };
    }, []);

    const isMobile = deviceType === 'mobile';
    const isTablet = deviceType === 'tablet';

    return {
        isMobile,
        isTablet,
        isDesktop: deviceType === 'desktop',
        isMobileOrTablet: isMobile || isTablet,
    };
};
