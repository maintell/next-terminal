import {Alert, message, Result, Spin} from 'antd';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useSearchParams} from 'react-router-dom';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import MultiFactorAuthentication from '@/pages/account/MultiFactorAuthentication';
import portalApi from '@/api/portal-api';

const AssetAuthorizationPage = () => {
    const {t} = useTranslation();
    const [searchParams] = useSearchParams();
    const authorizeId = searchParams.get('authorize_id') ?? '';
    const [open, setOpen] = useState(true);

    const authorizationQuery = useQuery({
        queryKey: ['asset-authorization', authorizeId],
        queryFn: () => portalApi.getAssetAuthorization(authorizeId),
        enabled: authorizeId !== '',
        retry: false,
    });

    const completeMutation = useMutation({
        mutationFn: (securityToken: string) => portalApi.completeAssetAuthorization(authorizeId, securityToken),
        onSuccess: (result) => window.location.replace(result.redirectUrl),
        onError: (error: Error) => {
            sessionStorage.removeItem('securityToken');
            message.error(error.message || t('general.failed'));
            setOpen(true);
        },
    });

    const cancelMutation = useMutation({
        mutationFn: () => portalApi.cancelAssetAuthorization(authorizeId),
        onSuccess: (result) => window.location.replace(result.redirectUrl),
        onError: (error: Error) => {
            message.error(error.message || t('general.failed'));
            setOpen(true);
        },
    });

    if (!authorizeId || authorizationQuery.isError) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <Alert type="error" showIcon title={t('general.error')} description={t('general.failed')}/>
                </div>
            </div>
        );
    }

    if (authorizationQuery.isLoading) {
        return <div className="flex min-h-screen items-center justify-center"><Spin size="large"/></div>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Result
                status="info"
                title={t('account.mfa')}
                subTitle={authorizationQuery.data?.protocol.toUpperCase()}
                extra={(completeMutation.isPending || cancelMutation.isPending) && <Spin/>}
            />
            <MultiFactorAuthentication
                open={open}
                handleOk={(securityToken) => {
                    setOpen(false);
                    completeMutation.mutate(securityToken);
                }}
                handleCancel={() => {
                    setOpen(false);
                    cancelMutation.mutate();
                }}
            />
        </div>
    );
};

export default AssetAuthorizationPage;
