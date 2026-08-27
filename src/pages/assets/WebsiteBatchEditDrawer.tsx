import type {BatchUpdateWebsiteRequest} from "@/api/website-api";
import websiteApi from "@/api/website-api";
import type {GatewayHop} from "@/api/gateway-chain";
import {useLicense} from "@/hook/LicenseContext";
import ConnectionModeFields from "@/pages/assets/components/ConnectionModeFields";
import {DEFAULT_ORIGIN_TIMEOUT} from "@/pages/assets/website-drawer/basic";
import type {ConnectionMode, WebsiteOriginHostMode} from "@/pages/assets/website-drawer/types";
import {useMutation} from "@tanstack/react-query";
import {Alert, App, Button, Checkbox, Divider, Drawer, Form, Input, InputNumber, Radio, Space, Switch} from "antd";
import {useEffect} from "react";
import {useTranslation} from "react-i18next";

interface Props {
    websiteIds: string[];
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface BatchEditFormValues {
    updateEnabled: boolean;
    enabled: boolean;
    updateOriginHost: boolean;
    originHostMode: WebsiteOriginHostMode;
    originHostCustom: string;
    updateOriginTimeout: boolean;
    originTimeout: number;
    updateInsecureSkipVerify: boolean;
    insecureSkipVerify: boolean;
    updateConnection: boolean;
    connectionMode: ConnectionMode;
    gatewaySource: 'inherit' | 'custom';
    gatewayChain: GatewayHop[];
    proxyId?: string;
}

const initialValues: BatchEditFormValues = {
    updateEnabled: false,
    enabled: true,
    updateOriginHost: false,
    originHostMode: 'origin',
    originHostCustom: '',
    updateOriginTimeout: false,
    originTimeout: DEFAULT_ORIGIN_TIMEOUT,
    updateInsecureSkipVerify: false,
    insecureSkipVerify: false,
    updateConnection: false,
    connectionMode: 'direct',
    gatewaySource: 'inherit',
    gatewayChain: [],
    proxyId: undefined,
};

const WebsiteBatchEditDrawer = ({websiteIds, open, onClose, onSuccess}: Props) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<BatchEditFormValues>();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();

    const updateEnabled = Form.useWatch('updateEnabled', form);
    const updateOriginHost = Form.useWatch('updateOriginHost', form);
    const originHostMode = Form.useWatch('originHostMode', form);
    const updateOriginTimeout = Form.useWatch('updateOriginTimeout', form);
    const updateInsecureSkipVerify = Form.useWatch('updateInsecureSkipVerify', form);
    const updateConnection = Form.useWatch('updateConnection', form);
    const hasChanges = updateEnabled || updateOriginHost || updateOriginTimeout ||
        updateInsecureSkipVerify || updateConnection;

    useEffect(() => {
        if (open) {
            form.setFieldsValue(initialValues);
        }
    }, [form, open]);

    const mutation = useMutation({
        mutationFn: (request: BatchUpdateWebsiteRequest) => websiteApi.batchUpdate(request),
        onSuccess: (result) => {
            message.success(t('assets.website_batch_edit.success', {count: result.updatedCount}));
            onSuccess();
        },
    });

    const handleSubmit = async () => {
        const values = await form.validateFields();
        const changes: BatchUpdateWebsiteRequest['changes'] = {};
        if (updateEnabled || updateOriginHost || updateOriginTimeout || updateInsecureSkipVerify) {
            const basicChanges: NonNullable<BatchUpdateWebsiteRequest['changes']['basic']> = {};
            if (values.updateEnabled) {
                basicChanges.enabled = values.enabled;
            }
            if (values.updateOriginHost) {
                basicChanges.originHostMode = values.originHostMode;
                basicChanges.originHostCustom = values.originHostMode === 'custom'
                    ? values.originHostCustom.trim()
                    : '';
            }
            if (values.updateOriginTimeout) {
                basicChanges.originTimeout = values.originTimeout;
            }
            if (values.updateInsecureSkipVerify) {
                basicChanges.insecureSkipVerify = values.insecureSkipVerify;
            }
            changes.basic = basicChanges;
        }
        if (values.updateConnection) {
            changes.connection = {
                connectionMode: values.connectionMode,
                gatewayChain: values.connectionMode === 'gateway' && values.gatewaySource === 'custom'
                    ? values.gatewayChain || []
                    : [],
                proxyId: values.connectionMode === 'proxy' ? values.proxyId : undefined,
            };
        }
        mutation.mutate({websiteIds, changes});
    };

    const drawerExtra = (
        <Space size={8}>
            <Button onClick={onClose}>{t('actions.cancel')}</Button>
            <Button
                type="primary"
                disabled={!hasChanges}
                loading={mutation.isPending}
                onClick={handleSubmit}
            >
                {t('actions.confirm')}
            </Button>
        </Space>
    );

    return (
        <Drawer
            title={t('assets.website_batch_edit.title')}
            open={open}
            onClose={onClose}
            size={520}
            extra={drawerExtra}
        >
            <div className="mb-5">
                <Alert
                    type="info"
                    showIcon
                    title={t('assets.website_batch_edit.scope_tip')}
                />
            </div>

            <Form form={form} layout="vertical" initialValues={initialValues}>
                <div className="mb-3 font-medium">{t('assets.general')}</div>
                <Space orientation="vertical" size="middle" className="w-full">
                    <div className="flex items-center justify-between gap-4">
                        <Form.Item name="updateEnabled" valuePropName="checked" noStyle>
                            <Checkbox>{t('general.enabled')}</Checkbox>
                        </Form.Item>
                        <Form.Item name="enabled" valuePropName="checked" noStyle>
                            <Switch
                                disabled={!updateEnabled}
                                checkedChildren={t('general.yes')}
                                unCheckedChildren={t('general.no')}
                            />
                        </Form.Item>
                    </div>

                    <div>
                        <Form.Item name="updateOriginHost" valuePropName="checked">
                            <Checkbox>{t('assets.origin_host')}</Checkbox>
                        </Form.Item>
                        <Form.Item name="originHostMode" noStyle>
                            <Radio.Group
                                disabled={!updateOriginHost}
                                optionType="button"
                                buttonStyle="solid"
                                options={[
                                    {label: t('assets.origin_host_follow_service'), value: 'service'},
                                    {label: t('assets.origin_host_follow_origin'), value: 'origin'},
                                    {label: t('assets.origin_host_custom'), value: 'custom'},
                                ]}
                            />
                        </Form.Item>
                        {originHostMode === 'custom' && (
                            <Form.Item
                                name="originHostCustom"
                                className="mt-3 mb-0"
                                rules={[{
                                    required: updateOriginHost,
                                    whitespace: true,
                                    message: t('general.required'),
                                }]}
                            >
                                <Input
                                    disabled={!updateOriginHost}
                                    placeholder={t('assets.origin_host_custom_name')}
                                />
                            </Form.Item>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <Form.Item name="updateOriginTimeout" valuePropName="checked" noStyle>
                            <Checkbox>{t('assets.origin_timeout')}</Checkbox>
                        </Form.Item>
                        <Space.Compact className="w-48">
                            <Form.Item
                                name="originTimeout"
                                noStyle
                                rules={[{required: updateOriginTimeout, type: 'number', min: 1, max: 3600}]}
                            >
                                <InputNumber
                                    disabled={!updateOriginTimeout}
                                    precision={0}
                                    min={1}
                                    max={3600}
                                    className="flex-1"
                                />
                            </Form.Item>
                            <Space.Addon>{t('general.second')}</Space.Addon>
                        </Space.Compact>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <Form.Item name="updateInsecureSkipVerify" valuePropName="checked" noStyle>
                            <Checkbox>{t('assets.insecure_skip_verify')}</Checkbox>
                        </Form.Item>
                        <Form.Item name="insecureSkipVerify" valuePropName="checked" noStyle>
                            <Switch
                                disabled={!updateInsecureSkipVerify}
                                checkedChildren={t('general.enabled')}
                                unCheckedChildren={t('general.disabled')}
                            />
                        </Form.Item>
                    </div>
                </Space>

                <Divider/>
                <Form.Item name="updateConnection" valuePropName="checked">
                    <Checkbox>{t('assets.batch_edit.update_connection')}</Checkbox>
                </Form.Item>
                {updateConnection && (
                    <ConnectionModeFields
                        allowInheritedGateway
                        gatewayDisabled={!hasPremiumFeatures}
                    />
                )}
            </Form>
        </Drawer>
    );
};

export default WebsiteBatchEditDrawer;
