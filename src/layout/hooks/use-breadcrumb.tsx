import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

/** 面包屑是路由和菜单名称的派生数据，直接计算，避免 Effect 回写状态。 */
export function useBreadcrumb(breadcrumbNameMap: Map<string, string>) {
    const {pathname} = useLocation();
    const {t} = useTranslation();
    const pathSnippets = pathname.split('/').filter(Boolean);
    const extraBreadcrumbItems = pathSnippets.flatMap((_, index) => {
        const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
        const label = breadcrumbNameMap.get(url);
        return label ? [{title: <Link to={url}>{label}</Link>}] : [];
    });
    const breakItems = [
        {title: <Link to="/dashboard">{t('general.home')}</Link>},
        ...extraBreadcrumbItems,
    ];

    return {breakItems};
}
