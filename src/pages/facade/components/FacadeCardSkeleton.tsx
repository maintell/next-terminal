import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FacadeCardSkeletonProps {
    count?: number; // 显示几个骨架卡片
}

/**
 * Facade 卡片骨架屏组件 - 简洁现代风格
 */
const FacadeCardSkeleton: React.FC<FacadeCardSkeletonProps> = React.memo(({ count = 8 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="animate-in fade-in duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="relative flex min-h-32 flex-col rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-[#141414] dark:ring-slate-700/60">
                        <Skeleton className="absolute right-4 top-4 h-4 w-9 rounded" />
                        <div className="flex gap-3">
                            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-md" />
                            <div className="min-w-0 flex-1 space-y-2 pr-12">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                        <div className="flex-1" />
                        <div className="mt-5 flex items-center justify-between">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
});

FacadeCardSkeleton.displayName = 'FacadeCardSkeleton';

export default FacadeCardSkeleton;
