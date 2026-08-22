import QuerySelect from "@/components/QuerySelect";
import networkProxyApi from "@/api/network-proxy-api";
import GatewayChainEditor from "@/pages/assets/components/GatewayChainEditor";
import {Form, Radio} from "antd";
import {useTranslation} from "react-i18next";

interface Props {
    allowInheritedGateway?: boolean;
    gatewayDisabled?: boolean;
    proxyDisabled?: boolean;
    proxyTip?: string;
}

const ConnectionModeFields = ({
                                  allowInheritedGateway = false,
                                  gatewayDisabled = false,
                                  proxyDisabled = false,
                                  proxyTip
                              }: Props) => {
    const {t} = useTranslation();
    const form = Form.useFormInstance();
    const connectionMode = Form.useWatch('connectionMode', form);
    const gatewaySource = Form.useWatch('gatewaySource', form);

    return (
        <>
            <Form.Item label={t('assets.connection_mode')} name="connectionMode" rules={[{required: true}]}>
                <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                        {label: t('assets.connection_direct'), value: 'direct'},
                        {label: t('assets.connection_gateway'), value: 'gateway', disabled: gatewayDisabled},
                        {
                            label: t('assets.connection_proxy'),
                            value: 'proxy',
                            disabled: proxyDisabled,
                            title: proxyDisabled ? proxyTip : undefined
                        }
                    ]}
                    onChange={event => {
                        const mode = event.target.value;
                        if (mode === 'direct') {
                            form.setFieldsValue({gatewayChain: [], proxyId: undefined});
                        } else if (mode === 'gateway') {
                            form.setFieldValue('proxyId', undefined);
                        } else {
                            form.setFieldsValue({gatewayChain: [], gatewaySource: 'inherit'});
                        }
                    }}
                />
            </Form.Item>

            {connectionMode === 'direct' && (
                <div className="mb-4 text-gray-500">{t('assets.connection_direct_tip')}</div>
            )}

            {connectionMode === 'gateway' && (
                <>
                    {allowInheritedGateway && (
                        <Form.Item label={t('assets.gateway_source')} name="gatewaySource" rules={[{required: true}]}>
                            <Radio.Group
                                options={[
                                    {label: t('assets.group_default_gateway'), value: 'inherit'},
                                    {label: t('assets.gateway_custom'), value: 'custom'}
                                ]}
                                onChange={event => {
                                    if (event.target.value === 'inherit') {
                                        form.setFieldValue('gatewayChain', []);
                                    }
                                }}
                            />
                        </Form.Item>
                    )}
                    {(!allowInheritedGateway || gatewaySource === 'custom') && (
                        <GatewayChainEditor disabled={gatewayDisabled}/>
                    )}
                </>
            )}

            {connectionMode === 'proxy' && (
                <>
                    <Form.Item
                        label={t('network_proxy.setting')}
                        name="proxyId"
                        rules={[{required: true, message: t('assets.proxy_required')}]}
                    >
                        <QuerySelect
                            showSearch
                            request={async () => {
                                const items = await networkProxyApi.getAll();
                                return items.map(item => ({label: item.name, value: item.id}));
                            }}
                        />
                    </Form.Item>
                    <div className="mb-4 text-gray-500">{proxyTip || t('assets.proxy_tcp_tip')}</div>
                </>
            )}
        </>
    );
};

export default ConnectionModeFields;
