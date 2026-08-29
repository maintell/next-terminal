import React, {useEffect, useState} from 'react';
import {Alert, Button, Modal, Space, Typography} from 'antd';
import {useTranslation} from 'react-i18next';
import portalApi from '@/api/portal-api';
import {useMutation} from '@tanstack/react-query';

const {Text} = Typography;

interface AccessWolDialogProps {
    open: boolean;
    assetId: string;
    assetName: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const AccessWolDialog: React.FC<AccessWolDialogProps> = ({
                                                             open,
                                                             assetId,
                                                             assetName,
                                                             onSuccess,
                                                             onCancel,
                                                         }) => {
    const {t} = useTranslation();
    const [status, setStatus] = useState<'idle' | 'waking' | 'countdown' | 'checking' | 'online' | 'offline' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    const wakeMutation = useMutation({
        mutationFn: () => portalApi.wakeOnLan(assetId),
        onMutate: () => {
            setStatus('waking');
            setErrorMessage('');
        },
        onSuccess: (result) => {
            if (result.error) {
                setStatus('failed');
                setErrorMessage(result.error);
                return;
            }
            setCountdown(result.delay);
            setStatus('countdown');
        },
        onError: (error) => {
            setStatus('failed');
            setErrorMessage(error instanceof Error ? error.message : t('access.wol.failed'));
        },
    });

    const checkMutation = useMutation({
        mutationFn: () => portalApi.pingAsset(assetId),
        onMutate: () => setStatus('checking'),
        onSuccess: (result) => setStatus(result.active ? 'online' : 'offline'),
        onError: () => setStatus('offline'),
    });

    useEffect(() => {
        if (open) {
            setStatus('idle');
            setErrorMessage('');
            setCountdown(0);
        }
    }, [open]);

    useEffect(() => {
        if (status !== 'countdown') {
            return;
        }

        const timer = window.setTimeout(() => {
            if (countdown <= 1) {
                checkMutation.mutate();
                return;
            }
            setCountdown(countdown - 1);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [countdown, status]);

    const handleWakeUp = () => wakeMutation.mutate();
    const handleCheck = () => checkMutation.mutate();

    const handleConnect = () => {
        onSuccess();
    };

    const handleCancel = () => {
        onCancel();
    };

    const renderContent = () => {
        switch (status) {
            case 'idle':
                return (
                    <Text>{t('access.wol.message', {name: assetName})}</Text>
                );
            case 'waking':
                return (
                    <Text>{t('access.wol.waking')}</Text>
                );
            case 'countdown':
                return (
                    <Space orientation="vertical" style={{width: '100%', alignItems: 'center'}} size="large">
                        <Text>{t('access.wol.countdown_message')}</Text>
                        <div style={{textAlign: 'center', fontSize: 48, fontWeight: 'bold', color: '#1890ff'}}>
                            {countdown} {t('general.second')}
                        </div>
                    </Space>
                );
            case 'checking':
                return (
                    <Text>{t('access.wol.checking')}</Text>
                );
            case 'online':
                return (
                    <Alert
                        title={t('access.wol.online')}
                        description={t('access.wol.online_desc')}
                        type="success"
                        showIcon
                    />
                );
            case 'offline':
                return (
                    <Alert
                        title={t('access.wol.offline')}
                        description={t('access.wol.offline_desc')}
                        type="warning"
                        showIcon
                    />
                );
            case 'failed':
                return (
                    <Alert
                        title={t('access.wol.failed')}
                        description={errorMessage}
                        type="error"
                        showIcon
                    />
                );
            default:
                return null;
        }
    };

    const renderFooter = () => {
        if (status === 'idle') {
            return [
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions.cancel')}
                </Button>,
                <Button key="ok" type="primary" onClick={handleWakeUp} loading={wakeMutation.isPending}>
                    {t('access.wol.confirm')}
                </Button>,
            ];
        }

        if (status === 'countdown' || status === 'checking' || status === 'online' || status === 'offline') {
            return [
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions.cancel')}
                </Button>,
                <Button
                    key="check"
                    onClick={handleCheck}
                    loading={checkMutation.isPending}
                    disabled={status === 'checking' || (status === 'countdown' && countdown > 5)}
                >
                    {t('access.wol.check_now')}
                </Button>,
                status === 'online' && (
                    <Button key="connect" type="primary" onClick={handleConnect}>
                        {t('access.wol.connect')}
                    </Button>
                ),
            ].filter(Boolean);
        }

        return [
            <Button key="close" onClick={handleCancel}>
                {t('actions.cancel')}
            </Button>,
        ];
    };

    return (
        <Modal
            title={t('access.wol.title')}
            open={open}
            onCancel={handleCancel}
            footer={renderFooter()}
            mask={{closable: false}}
        >
            {renderContent()}
        </Modal>
    );
};

export default AccessWolDialog;
