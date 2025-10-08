import {
    ApartmentOutlined,
    ApiOutlined,
    AuditOutlined,
    BarChartOutlined,
    BlockOutlined,
    CloudServerOutlined,
    ClusterOutlined,
    CodeOutlined,
    CoffeeOutlined,
    ControlOutlined,
    DashboardOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    FileTextOutlined,
    ForkOutlined,
    GlobalOutlined,
    HddOutlined,
    IdcardOutlined,
    InsuranceOutlined,
    LinkOutlined,
    LoginOutlined,
    MonitorOutlined,
    SettingOutlined,
    SolutionOutlined,
    TeamOutlined, ToolOutlined,
    UserOutlined,
    UserSwitchOutlined,
    WarningOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";
import React from "react";

export const getMenus = (t: any) => {
    return [
        {
            key: 'dashboard',
            label: t('menus.dashboard.label'),
            icon: <DashboardOutlined/>,
        },
        {
            key: 'resource',
            label: t('menus.resource.label'),
            icon: <CloudServerOutlined/>,
            children: [
                {
                    key: 'asset',
                    label: t('menus.resource.submenus.asset'),
                    icon: <DesktopOutlined/>,
                },
                {
                    key: 'credential',
                    label: t('menus.resource.submenus.credential'),
                    icon: <IdcardOutlined/>,
                },
                {
                    key: 'snippet',
                    label: t('menus.resource.submenus.snippet'),
                    icon: <CodeOutlined/>,
                },
                {
                    key: 'storage',
                    label: t('menus.resource.submenus.storage'),
                    icon: <HddOutlined/>,
                },
                {
                    key: 'website',
                    label: t('menus.resource.submenus.website'),
                    icon: <GlobalOutlined/>,
                },
                {
                    key: 'certificate',
                    label: t('menus.resource.submenus.certificate'),
                    icon: <SafetyCertificateOutlined />,
                },
            ]
        },
        {
            key: 'gateway',
            label: t('menus.gateway.label'),
            icon: <CloudServerOutlined/>,
            children: [
                {
                    key: 'ssh-gateway',
                    label: t('menus.gateway.submenus.ssh_gateway'),
                    icon: <ApiOutlined/>,
                },
                {
                    key: 'agent-gateway',
                    label: t('menus.gateway.submenus.agent_gateway'),
                    icon: <ClusterOutlined/>,
                },
            ]
        },
        {
            key: 'log-audit',
            label: t('menus.log_audit.label'),
            icon: <AuditOutlined/>,
            children: [
                {
                    key: 'online-session',
                    label: t('menus.log_audit.submenus.online_session'),
                    icon: <LinkOutlined/>,
                },
                {
                    key: 'offline-session',
                    label: t('menus.log_audit.submenus.offline_session'),
                    icon: <DisconnectOutlined/>,
                },
                {
                    key: 'filesystem-log',
                    label: t('menus.log_audit.submenus.filesystem_log'),
                    icon: <FileTextOutlined/>,
                },
                {
                    key: 'access-log',
                    label: t('menus.log_audit.submenus.access_log'),
                    icon: <GlobalOutlined/>,
                },
                {
                    key: 'access-log-stats',
                    label: t('menus.log_audit.submenus.access_log_stats'),
                    icon: <BarChartOutlined/>,
                },
                {
                    key: 'login-log',
                    label: t('menus.log_audit.submenus.login_log'),
                    icon: <LoginOutlined/>,
                },
                {
                    key: 'operation-log',
                    label: t('menus.log_audit.submenus.operation_log'),
                    icon: <CoffeeOutlined/>,
                },
            ]
        },
        {
            key: 'sysops',
            label: t('menus.sysops.label'),
            icon: <ControlOutlined/>,
            children: [
                {
                    key: 'scheduled-task',
                    label: t('menus.sysops.submenus.scheduled_task'),
                    icon: <BlockOutlined/>,
                },
                {
                    key: 'tools',
                    label: t('menus.sysops.submenus.tools'),
                    icon: <ToolOutlined />,
                },
                {
                    key: 'monitoring',
                    label: t('menus.sysops.submenus.monitoring'),
                    icon: <MonitorOutlined/>,
                },
            ]
        },
        {
            key: 'identity',
            label: t('menus.identity.label'),
            icon: <UserSwitchOutlined/>,
            children: [
                {
                    key: 'user',
                    label: t('menus.identity.submenus.user'),
                    icon: <UserOutlined/>,
                },
                {
                    key: 'role',
                    label: t('menus.identity.submenus.role'),
                    icon: <SolutionOutlined/>,
                },
                {
                    key: 'department',
                    label: t('menus.identity.submenus.department'),
                    icon: <ApartmentOutlined/>,
                },
                {
                    key: 'login-policy',
                    label: t('menus.identity.submenus.login_policy'),
                    icon: <ForkOutlined/>,
                },
                {
                    key: 'login-locked',
                    label: t('menus.identity.submenus.login_locked'),
                    icon: <WarningOutlined/>,
                },
            ]
        },
        {
            key: 'authorised',
            label: t('menus.authorised.label'),
            icon: <UserSwitchOutlined/>,
            children: [
                {
                    key: 'command-filter',
                    label: t('menus.authorised.submenus.command_filter'),
                    icon: <CodeOutlined/>,
                },
                {
                    key: 'strategy',
                    label: t('menus.authorised.submenus.strategy'),
                    icon: <InsuranceOutlined/>,
                },
                {
                    key: 'authorised-asset',
                    label: t('menus.authorised.submenus.authorised_asset'),
                    icon: <DesktopOutlined/>,
                },
                {
                    key: 'authorised-website',
                    label: t('menus.authorised.submenus.authorised_website'),
                    icon: <GlobalOutlined/>,
                },
            ]
        },
        {
            key: 'setting',
            label: t('menus.setting.label'),
            icon: <SettingOutlined/>,
        },
    ]
}