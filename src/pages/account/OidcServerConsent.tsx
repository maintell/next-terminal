import React, {useEffect, useState} from 'react';
import {Alert, Avatar, Button, Card, Checkbox, Space, Spin, Typography} from 'antd';
import {CheckCircleOutlined, CloseCircleOutlined, UserOutlined} from '@ant-design/icons';
import {useNavigate, useSearchParams} from 'react-router-dom';
import accountApi from '@/api/account-api';
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from '@tanstack/react-query';

const {Title, Text} = Typography;

const OidcServerConsent: React.FC = () => {
    const {t} = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const clientId = searchParams.get('client_id') || '';
    const scopes = searchParams.get('scopes') || '';
    const returnUrl = searchParams.get('return_url') || '';
    const hasRequiredParams = !!clientId && !!scopes && !!returnUrl;

    const scopeDescriptions: Record<string, string> = {
        'openid': t('account.oidc_consent.scope.openid'),
        'profile': t('account.oidc_consent.scope.profile'),
        'email': t('account.oidc_consent.scope.email'),
        'phone': t('account.oidc_consent.scope.phone'),
        'offline_access': t('account.oidc_consent.scope.offline_access'),
    };

    const consentQuery = useQuery({
        queryKey: ['oidc-server-consent', clientId, scopes, returnUrl],
        queryFn: async () => {
            const [data, userInfo] = await Promise.all([
                accountApi.getOidcConsentPage(clientId, scopes, returnUrl, undefined),
                accountApi.getUserInfo(),
            ]);
            return {data, userInfo};
        },
        enabled: hasRequiredParams,
    });

    useEffect(() => {
        if (consentQuery.data) {
            setSelectedScopes(consentQuery.data.data.scopes);
        }
    }, [consentQuery.data]);

    const submitMutation = useMutation({
        mutationFn: () => accountApi.submitOidcConsent(clientId, returnUrl, true, selectedScopes),
        onSuccess: (result) => {
            if (result && result.return_url) {
                window.location.replace(result.return_url);
            } else {
                navigate('/');
            }
        },
    });

    const data = consentQuery.data?.data;
    const userInfo = consentQuery.data?.userInfo;

    const handleDeny = () => {
        // 拒绝授权，返回错误
        if (data && data.redirectURI) {
            const errorUrl = new URL(data.redirectURI);
            errorUrl.searchParams.set('error', 'access_denied');
            errorUrl.searchParams.set('error_description', 'User denied consent');
            if (data.state) {
                errorUrl.searchParams.set('state', data.state);
            }
            window.location.replace(errorUrl.toString());
        } else {
            navigate('/');
        }
    };

    if (consentQuery.isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '16px',
            }}>
                <Spin size="large" description={t('general.loading')}/>
            </div>
        );
    }

    if (!hasRequiredParams || consentQuery.isError || !data) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '16px',
            }}>
                <Alert
                    title={t('general.error')}
                    description={t('account.oidc_consent.load_error')}
                    type="error"
                    showIcon
                    style={{maxWidth: 400, width: '100%'}}
                />
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
            <Card
                className="w-full shadow-md"
                style={{maxWidth: 460}}
                styles={{
                    body: {
                        padding: '24px',
                    }
                }}
            >
                {/* 标题区域 */}
                <div className="text-center mb-5">
                    <Title level={3} className="mt-3 mb-1">{t('account.oidc_consent.title')}</Title>
                    <Text type="secondary" className="text-[13px]">{t('account.oidc_consent.subtitle')}</Text>
                </div>

                <div className={'flex flex-col gap-4'}>
                    {/* 当前用户信息 */}
                    {userInfo && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                            <div className="flex items-center gap-2.5">
                                <Avatar
                                    size={40}
                                    icon={<UserOutlined/>}
                                    className="bg-blue-500 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <Text type="secondary" className="text-xs block mb-0.5">
                                        {t('account.oidc_consent.current_account')}
                                    </Text>
                                    <Text strong className="text-sm block">
                                        {userInfo.nickname || userInfo.username}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 应用信息 */}
                    <Alert
                        title={
                            <span className="text-[13px]">
                            <strong>{data.clientID}</strong> {t('account.oidc_consent.request_access')}
                        </span>
                        }
                        description={<span className="text-xs">{t('account.oidc_consent.request_access_desc')}</span>}
                        type="info"
                        showIcon
                    />

                    {/* 权限列表 */}
                    <div>
                        <Text strong className="block mb-3 text-sm">
                            {t('account.oidc_consent.requested_scopes')}
                        </Text>
                        <Checkbox.Group
                            value={selectedScopes}
                            onChange={(values) => setSelectedScopes(values as string[])}
                            className="w-full"
                        >
                            <Space orientation="vertical" className="w-full" size={8}>
                                {data.scopes.map((scope) => (
                                    <Checkbox
                                        key={scope}
                                        value={scope}
                                    >
                                        <div className="ml-2">
                                            <div className="font-medium text-[13px] mb-0.5">{scope}</div>
                                            <div className="text-xs text-gray-500">
                                                {scopeDescriptions[scope] || t('account.oidc_consent.scope.default')}
                                            </div>
                                        </div>
                                    </Checkbox>
                                ))}
                            </Space>
                        </Checkbox.Group>
                    </div>

                    {/* 提示信息 */}
                    <Alert
                        title={
                            <span className="text-xs">
                            {t('account.oidc_consent.warning', {clientId: data.clientID})}
                        </span>
                        }
                        type="warning"
                        showIcon={false}
                        className="px-3 py-2"
                    />

                    {/* 操作按钮 */}
                    <Space className="w-full justify-end" size="middle">
                        <Button
                            icon={<CloseCircleOutlined/>}
                            onClick={handleDeny}
                            disabled={submitMutation.isPending}
                        >
                            {t('identity.policy.action.reject')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined/>}
                            onClick={() => submitMutation.mutate()}
                            loading={submitMutation.isPending}
                            disabled={selectedScopes.length === 0}
                        >
                            {t('actions.authorized')}
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default OidcServerConsent;
