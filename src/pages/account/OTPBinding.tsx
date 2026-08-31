import {useMutation, useQuery} from "@tanstack/react-query";
import {CopyOutlined} from '@ant-design/icons';
import {App, Button, Form, Input, QRCode, Space, Spin, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import accountApi from "../../api/account-api";

const {Title, Paragraph, Text} = Typography;

const authenticatorApps = [
    'Google Authenticator',
    'Microsoft Authenticator',
    'Authy',
    '1Password',
    'LastPass Authenticator',
];

interface OTPBindingProps {
    refetch: () => void
}

interface ConfirmTotpValues {
    totp: string
}

interface ConfirmTotpRequest extends ConfirmTotpValues {
    secret: string
}

const OTPBinding = ({refetch}: OTPBindingProps) => {
    const [form] = Form.useForm<ConfirmTotpValues>();
    const {t} = useTranslation();
    const {message} = App.useApp();
    const hostname = window.location.hostname;

    const totpQuery = useQuery({
        queryKey: ['account', 'totp', hostname],
        queryFn: () => accountApi.reloadTotp(hostname),
        refetchOnWindowFocus: false,
    });

    const confirmMutation = useMutation({
        mutationFn: (values: ConfirmTotpRequest) => accountApi.confirmTotp(values),
        onSuccess: () => {
            message.success(t('general.success'));
            refetch();
        },
    });

    const copySecret = () => {
        const secret = totpQuery.data?.secret;
        if (!secret) {
            return;
        }
        void navigator.clipboard.writeText(secret);
        message.success(t('general.copy_success'));
    };

    const confirmTOTP = (values: ConfirmTotpValues) => {
        const secret = totpQuery.data?.secret;
        if (!secret) {
            return;
        }
        confirmMutation.mutate({...values, secret});
    };

    const stepTitle = (step: number, title: string) => (
        <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                {step}
            </span>
            <Title level={5} style={{margin: 0, marginTop: 2}}>{title}</Title>
        </div>
    );

    const renderQRCode = () => {
        if (totpQuery.data?.url) {
            return (
                <QRCode
                    value={totpQuery.data.url}
                    errorLevel="M"
                    size={200}
                />
            );
        }

        return (
            <div className="flex h-[200px] w-[200px] items-center justify-center">
                {totpQuery.isError ? (
                    <Button
                        type="link"
                        loading={totpQuery.isFetching}
                        onClick={() => void totpQuery.refetch()}
                    >
                        {t('actions.retry')}
                    </Button>
                ) : (
                    <Spin size="large"/>
                )}
            </div>
        );
    };

    return (
        <div>
            <section className="mb-8 border-b border-gray-200 pb-8 dark:border-gray-800">
                {stepTitle(1, t('account.otp_authenticator_app_description'))}

                <div className="ml-10 mt-4">
                    <Space wrap size={[8, 8]}>
                        {authenticatorApps.map((app) => (
                            <Tag key={app}>{app}</Tag>
                        ))}
                    </Space>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{t('account.otp_features.offline_access')}</span>
                        <span>{t('account.otp_features.time_based')}</span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2">
                <section className="pb-8 lg:pr-10 lg:pb-0">
                    {stepTitle(2, t('account.otp_scan_qr'))}

                    <div className="mt-6 flex justify-center">
                        {renderQRCode()}
                    </div>

                    <Paragraph
                        type="secondary"
                        style={{marginTop: 16, marginBottom: 0, textAlign: 'center'}}
                    >
                        {t('account.otp_scan_instruction')}
                    </Paragraph>

                    <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.04]">
                        <Text strong>{t('account.otp_manual_setup')}</Text>
                        <Paragraph type="secondary" style={{marginTop: 4, marginBottom: 12}}>
                            {t('account.otp_manual_setup_desc')}
                        </Paragraph>
                        <Space.Compact block>
                            <Input
                                value={totpQuery.data?.secret ?? ''}
                                readOnly
                                className="font-mono"
                            />
                            <Button
                                icon={<CopyOutlined/>}
                                onClick={copySecret}
                                disabled={!totpQuery.data?.secret}
                            />
                        </Space.Compact>
                    </div>
                </section>

                <section className="border-t border-gray-200 pt-8 dark:border-gray-800 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                    {stepTitle(3, t('account.otp_verification_title'))}

                    <Paragraph type="secondary" style={{marginTop: 8, marginBottom: 0, marginLeft: 40}}>
                        {t('account.otp_verification_instruction')}
                    </Paragraph>

                    <Form
                        form={form}
                        onFinish={confirmTOTP}
                        layout="vertical"
                        style={{marginTop: 24}}
                    >
                        <Form.Item
                            name="totp"
                            rules={[
                                {required: true, message: t('account.otp_code_required')},
                                {pattern: /^\d{6}$/, message: t('account.otp_code_format')},
                            ]}
                        >
                            <Input.OTP
                                size="large"
                                length={6}
                                type="text"
                                inputMode="numeric"
                                formatter={(value) => value.replace(/\D/g, '')}
                                disabled={!totpQuery.data?.secret || confirmMutation.isPending}
                            />
                        </Form.Item>

                        <Form.Item style={{marginBottom: 0}}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={confirmMutation.isPending}
                                disabled={!totpQuery.data?.secret}
                            >
                                {t('actions.confirm')}
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <Text strong>{t('account.otp_security_tip')}</Text>
                        <Paragraph type="secondary" style={{marginTop: 4, marginBottom: 0}}>
                            {t('account.otp_security_description')}
                        </Paragraph>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default OTPBinding;
