/** 显式指定功能，避免通过路由猜测弹窗或局部设置的介绍内容。 */
export const disabledFeatures = [
    'sql_work_order', 'credential_rotation', 'access_policy', 'agent_gateway', 'gateway_group',
    'authorization_strategy', 'command_filter', 'oidc', 'ldap', 'wechat_work',
    'branding', 'session_sharing', 'website_geo',
    'response_rewrite', 'geodata', 'recording_conversion', 'access_request',
] as const;

export type DisabledFeature = typeof disabledFeatures[number];
