import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Modal, Form, Input, Select, InputNumber, Switch, Radio, Row, Col, Alert, Space} from 'antd';
import assetApi from '@/api/asset-api';
import credentialApi from '@/api/credential-api';
import credentialRotationApi, {RotationPolicy} from '@/api/credential-rotation-api';
import ProFormTreeSelect from '@/components/ProFormTreeSelect';
import {useFormRequest} from '@/hook/use-antd-form-query';

const RotationPolicyModal = ({
    open,
    handleOk,
    handleCancel,
    confirmLoading,
    id,
}: Props) => {
    const {t} = useTranslation();
    const cronPresets = [
        {label: t('assets.rotation.cron_presets.daily', {time: '03:00'}), value: '0 0 3 * * *'},
        {label: t('assets.rotation.cron_presets.daily', {time: '12:00'}), value: '0 0 12 * * *'},
        {label: t('assets.rotation.cron_presets.monday', {time: '03:00'}), value: '0 0 3 ? * MON'},
        {label: t('assets.rotation.cron_presets.monthly', {time: '03:00'}), value: '0 0 3 1 * ?'},
        {label: t('assets.rotation.cron_presets.every_six_hours'), value: '0 0 0/6 * * ?'},
    ];
    const [form] = Form.useForm();
    const scopeType = Form.useWatch('scopeType', form);
    const rotateType = Form.useWatch('rotateType', form);

    const {data: credentials = []} = useQuery({
        queryKey: ['rotation-policy-credentials'],
        queryFn: () => credentialApi.getAll(),
        enabled: open,
    });

    const get = async () => {
        if (id) {
            return await credentialRotationApi.getById(id);
        }
        return {
            scopeType: 'asset',
            rotateType: 'password',
            pwdLength: 16,
            pwdSymbol: false,
            keepOldKey: true,
            cron: '0 0 3 * * *',
        } as RotationPolicy;
    };
    useFormRequest(form, ['rotation-policy-form', 'RotationPolicyModal', open, id], get, {enabled: open});

    return <Modal
        title={id ? t('actions.edit') : t('actions.new')}
        open={open}
        mask={{closable: false}}
        destroyOnHidden={true}
        width={640}
        onOk={() => {
            form.validateFields().then(async values => {
                handleOk(values);
            });
        }}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
    >
        <Alert
            title={t('assets.rotation.policy_warning')}
            type="warning"
            showIcon
        />
        <div className="h-3"/>
        <Form form={form} clearOnDestroy={true} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input/>
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label={t('general.name')} name={'name'} rules={[{required: true, whitespace: true}]}>
                        <Input/>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label={t('assets.rotation.type_label')} name={'rotateType'} required={true}>
                        <Select options={[
                            {label: t('assets.rotation.type.password'), value: 'password'},
                            {label: t('assets.rotation.type.private_key'), value: 'private-key'},
                        ]}/>
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item label={t('sysops.spec')} required tooltip={t('sysops.spec_tooltip')}>
                <Space.Compact block>
                    <Form.Item name="cron" noStyle rules={[{required: true}]}>
                        <Input placeholder="0 0 3 * * *"/>
                    </Form.Item>
                    <Select
                        style={{width: 200}}
                        placeholder={t('assets.rotation.cron_preset')}
                        allowClear={false}
                        options={cronPresets}
                        onChange={(value) => form.setFieldValue('cron', value)}
                    />
                </Space.Compact>
            </Form.Item>

            <Form.Item label={t('assets.rotation.scope')} name={'scopeType'} required={true}>
                <Radio.Group onChange={() => form.setFieldValue('scopeIds', [])} options={[
                    {label: t('menus.resource.submenus.asset'), value: 'asset'},
                    {label: t('menus.resource.submenus.credential'), value: 'credential'},
                ]}/>
            </Form.Item>

            {scopeType === 'asset' && <ProFormTreeSelect
                label={t('menus.resource.submenus.asset')}
                name={'scopeIds'}
                extra={t('assets.rotation.scope_empty_tip')}
                queryKey={['rotation-policy-assets']}
                fieldProps={{
                    multiple: true,
                    showSearch: true,
                    treeDefaultExpandAll: true,
                }}
                request={async () => {
                    const items = await assetApi.tree('ssh');
                    const map = (item: any) => {
                        item.value = item.key;
                        if (item.children) {
                            item.children.forEach(map);
                        } else {
                            item.title = item.title + ' (' + item.extra?.network + ')';
                        }
                    };
                    items.forEach(map);
                    return items;
                }}
            />}

            {scopeType === 'credential' && <Form.Item
                label={t('menus.resource.submenus.credential')}
                name={'scopeIds'}
                rules={[{required: true}]}
            >
                <Select
                    mode="multiple"
                    showSearch={{optionFilterProp: 'label'}}
                    options={credentials.map((item) => ({
                        label: `${item.name} (${item.username})`,
                        value: item.id,
                    }))}
                />
            </Form.Item>}

            {rotateType === 'password' && <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label={t('assets.rotation.pwd_length')}
                        name={'pwdLength'}
                        tooltip={t('assets.rotation.pwd_length_tip')}
                    >
                        <InputNumber min={8} max={64} style={{width: '100%'}}/>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label={t('assets.rotation.pwd_symbol')} name={'pwdSymbol'} valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                </Col>
            </Row>}

            {rotateType === 'private-key' && <Form.Item
                label={t('assets.rotation.keep_old_key')}
                name={'keepOldKey'}
                valuePropName="checked"
                tooltip={t('assets.rotation.keep_old_key_tip')}
            >
                <Switch/>
            </Form.Item>}
        </Form>
    </Modal>;
};

interface Props {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    id: string | undefined;
}

export default RotationPolicyModal;
