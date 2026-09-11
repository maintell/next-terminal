import React from 'react';
import clsx from 'clsx';
import { getImgColor } from '@/helper/asset-helper';

interface FacadeLogoProps {
    name: string;       // 用于首字母
    logo?: string;      // logo URL
    protocol: string;   // 用于颜色
    className?: string;
    borderless?: boolean;
    size?: 'small' | 'default';
}

/**
 * Facade Logo 组件 - 简洁现代风格
 * 灵感来自 Apple、Notion 的设计
 */
const FacadeLogo: React.FC<FacadeLogoProps> = React.memo(({ name, logo, protocol, className, borderless = false, size = 'default' }) => {
    const containerSize = size === 'small' ? 'h-10 w-10' : 'h-12 w-12';
    const imageRadius = size === 'small' ? 'rounded-md' : 'rounded-lg';
    const textSize = size === 'small' ? 'text-base' : 'text-lg';

    if (logo && logo !== "") {
        return (
            <div className={clsx(containerSize, 'flex-shrink-0', className)}>
                <img
                    className={clsx(
                        containerSize,
                        imageRadius,
                        'object-cover',
                        !borderless && "ring-1 ring-slate-200 dark:ring-slate-700"
                    )}
                    src={logo}
                    alt="logo"
                    loading="eager"
                />
            </div>
        );
    }

    return (
        <div
            className={clsx(
                containerSize,
                imageRadius,
                'flex flex-shrink-0 items-center justify-center font-bold text-white',
                textSize,
                !borderless && 'ring-1 ring-white/10',
                getImgColor(protocol),
                className
            )}
        >
            {name[0].toUpperCase()}
        </div>
    );
});

FacadeLogo.displayName = 'FacadeLogo';

export default FacadeLogo;
