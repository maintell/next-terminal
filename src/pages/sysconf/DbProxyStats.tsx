import {useQuery} from "@tanstack/react-query";
import {Alert, Tag} from "antd";
import {useTranslation} from "react-i18next";
import requests from "@/api/core/requests";

export interface ProxyStats {
    mysql: { sessions: number; queries: number; blocked: number; running: boolean; addr: string; publicAddr: string; tlsMode: string };
    pg: { sessions: number; queries: number; blocked: number; running: boolean; addr: string; publicAddr: string; tlsMode: string; policy: string };
    mysqlConfig?: {desiredVersion: number; appliedVersion: number; state: string; lastError: string};
    pgConfig?: {desiredVersion: number; appliedVersion: number; state: string; lastError: string};
    audit: { drops: number; saveErrors: number; queueLength: number };
}

export const useDbProxyStats = (enabled: boolean) => useQuery({
    queryKey: ['db-proxy-stats'],
    queryFn: async () => await requests.get('/admin/db-proxy-stats') as ProxyStats,
    enabled,
    refetchInterval: 5000,
});

interface DbProxyStatsProps {
    type: 'mysql' | 'pg';
    enabled: boolean;
}

// 代理运行统计条：展示活动会话、查询数、拦截数与审计异常，5 秒自动刷新。
// 计数为进程启动以来的累计值。
const DbProxyStats = ({type, enabled}: DbProxyStatsProps) => {
    const {t} = useTranslation();

    const {data} = useDbProxyStats(enabled);

    if (!enabled || !data) {
        return null;
    }

    // 兼容异常响应（如网关返回的 HTML），避免渲染崩溃
    const proxyStats = data?.[type] as ProxyStats['mysql'] | undefined;
    const auditStats = data?.audit as ProxyStats['audit'] | undefined;
    if (!proxyStats || !auditStats) {
        return null;
    }

    const applyStatus = type === 'mysql' ? data.mysqlConfig : data.pgConfig;
    const items = [
        {label: t('db.proxy.stats.sessions'), value: proxyStats.sessions, color: 'blue'},
        {label: t('db.proxy.stats.queries'), value: proxyStats.queries, color: 'default'},
        {label: t('db.proxy.stats.blocked'), value: proxyStats.blocked, color: proxyStats.blocked > 0 ? 'red' : 'default'},
    ];
    if (auditStats.drops > 0) {
        items.push({label: t('db.proxy.stats.audit_drops'), value: auditStats.drops, color: 'orange'});
    }
    if (auditStats.saveErrors > 0) {
        items.push({label: t('db.proxy.stats.audit_errors'), value: auditStats.saveErrors, color: 'orange'});
    }

    return (
        <div className="mb-3">
            <div className="flex flex-wrap items-center gap-2">
				<Tag color={proxyStats.running ? 'green' : 'default'}>{t(proxyStats.running ? 'db.proxy.pg_running' : 'db.proxy.pg_stopped')}</Tag>
				<span className={'text-xs text-slate-500 dark:text-slate-400'}>{t('db.proxy.stats.title')}</span>
				{items.map(item => (
					<Tag key={item.label} color={item.color} className={'m-0'}>
						{item.label}: {item.value}
					</Tag>
				))}
            </div>
            {applyStatus?.state === 'applying' && <div className="mt-2"><Alert type="info" title={t('db.proxy.pg_applying')}/></div>}
            {applyStatus?.lastError && <div className="mt-2"><Alert type="error" title={t('db.proxy.pg_apply_error')} description={applyStatus.lastError}/></div>}
        </div>
    );
};

export default DbProxyStats;
