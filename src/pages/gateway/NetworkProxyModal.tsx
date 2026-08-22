import {useFormRequest} from "@/hook/use-antd-form-query";
import networkProxyApi, {NetworkProxy, NetworkProxyTestRequest} from "@/api/network-proxy-api";
import {App, Button, Divider, Form, Input, InputNumber, Modal, Radio, Space} from "antd";
import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";

interface Props {
    open: boolean;
    id?: string;
    confirmLoading: boolean;
    onCancel: () => void;
    onSubmit: (values: NetworkProxy) => void;
}

const NetworkProxyModal = ({open, id, confirmLoading, onCancel, onSubmit}: Props) => {
    const [form] = Form.useForm<NetworkProxyTestRequest>();
    const {t} = useTranslation();
    const {message} = App.useApp();

    const get = async () => {
        if (id) {
            return await networkProxyApi.getById(id) as NetworkProxyTestRequest;
        }
        return {
            protocol: 'http',
            port: 8080,
        } as NetworkProxyTestRequest;
    };

    useFormRequest(form, ['form-request', 'network-proxy', open, id], get, {enabled: open});

    const testMutation = useMutation({
        mutationFn: async () => {
            const values = await form.validateFields([
                'name', 'protocol', 'host', 'port', 'username', 'password'
            ]);
            const targetHost = form.getFieldValue('targetHost')?.trim();
            const targetPort = form.getFieldValue('targetPort');
            if (!targetHost || !targetPort) {
                throw new Error(t('network_proxy.target_required'));
            }
            await networkProxyApi.test({...values, id, targetHost, targetPort} as NetworkProxyTestRequest);
        },
        onSuccess: () => message.success(t('network_proxy.test_success')),
        onError: (error: any) => message.error(error?.message || t('network_proxy.test_failed')),
    });

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            destroyOnHidden
            confirmLoading={confirmLoading}
            onCancel={onCancel}
            onOk={() => form.validateFields().then(values => onSubmit(values))}
        >
            <Form form={form} layout="vertical" clearOnDestroy>
                <Form.Item name="id" hidden><Input/></Form.Item>
                <Form.Item name="name" label={t('general.name')} rules={[{required: true}]}>
                    <Input/>
                </Form.Item>
                <Form.Item name="protocol" label={t('network_proxy.protocol')} rules={[{required: true}]}>
                    <Radio.Group options={[
                        {label: 'HTTP', value: 'http'},
                        {label: 'SOCKS5', value: 'socks5'},
                    ]}/>
                </Form.Item>
                <Form.Item label={t('network_proxy.address')} required>
                    <Space.Compact block>
                        <Form.Item name="host" noStyle rules={[{required: true}]}>
                            <Input placeholder="proxy.example.com" style={{width: '70%'}}/>
                        </Form.Item>
                        <Form.Item name="port" noStyle rules={[{required: true}]}>
                            <InputNumber min={1} max={65535} style={{width: '30%'}}/>
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>
                <Form.Item name="username" label={t('network_proxy.username')}>
                    <Input autoComplete="off"/>
                </Form.Item>
                <Form.Item name="password" label={t('network_proxy.password')}>
                    <Input.Password autoComplete="new-password"/>
                </Form.Item>
                <Form.Item name="description" label={t('general.remark')}>
                    <Input.TextArea rows={3}/>
                </Form.Item>

                <Divider>{t('network_proxy.connection_test')}</Divider>
                <Form.Item label={t('network_proxy.target_address')} required>
                    <Space.Compact block>
                        <Form.Item name="targetHost" noStyle>
                            <Input placeholder="10.0.0.15" style={{width: '70%'}}/>
                        </Form.Item>
                        <Form.Item name="targetPort" noStyle>
                            <InputNumber min={1} max={65535} placeholder="22" style={{width: '30%'}}/>
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>
                <Button loading={testMutation.isPending} onClick={() => testMutation.mutate()}>
                    {t('network_proxy.test')}
                </Button>
            </Form>
        </Modal>
    );
};

export default NetworkProxyModal;
