import ipWhitelistApi, {type IPWhitelist} from "@/api/ip-whitelist-api";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {Button, Form, Input, InputNumber, Modal, Radio, Space, Switch} from "antd";
import {useTranslation} from "react-i18next";

interface Props { open: boolean; id?: string; confirmLoading: boolean; onCancel: () => void; onSubmit: (values: IPWhitelist) => void; }

const IPWhitelistModal = ({open, id, confirmLoading, onCancel, onSubmit}: Props) => {
    const {t} = useTranslation();
    const [form] = Form.useForm<IPWhitelist>();
    const sourceType = Form.useWatch('sourceType', form);
    const get = async () => id ? await ipWhitelistApi.getById(id) : ({
        id: '', name: '', description: '', sourceType: 'manual', sourceUrl: '', sourceHeaders: [], rules: '', refreshMinutes: 10,
        lastSyncedAt: 0, lastSyncError: '', contentHash: '', enabled: true, createdAt: 0, updatedAt: 0,
    } as IPWhitelist);
    useFormRequest(form, ['form-request', 'ip-whitelist', open, id], get, {enabled: open});

    return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} destroyOnHidden confirmLoading={confirmLoading} onCancel={onCancel} onOk={() => form.validateFields().then(onSubmit)}>
        <Form form={form} layout="vertical" clearOnDestroy>
            <Form.Item name="name" label={t('general.name')} rules={[{required: true}]}><Input/></Form.Item>
            <Form.Item name="description" label={t('general.remark')}><Input.TextArea rows={2}/></Form.Item>
            <Form.Item name="sourceType" label={t('ip_whitelist.source')} rules={[{required: true}]}><Radio.Group options={[{value: 'manual', label: t('ip_whitelist.source_manual')}, {value: 'url', label: t('ip_whitelist.source_url')}]}/></Form.Item>
            {sourceType === 'url' ? <>
                <Form.Item name="sourceUrl" label={t('ip_whitelist.source_url_label')} extra={t('ip_whitelist.source_url_tip')} rules={[{required: true, type: 'url'}]}><Input placeholder="https://example.com/ips.txt"/></Form.Item>
                <Form.List name="sourceHeaders">
                    {(fields, {add, remove}) => <Form.Item label={t('ip_whitelist.source_headers')} extra={t('ip_whitelist.source_headers_tip')}>
                        <div className="flex flex-col gap-2">
                            {fields.map(field => <Space.Compact key={field.key} block>
                                <Form.Item {...field} name={[field.name, 'name']} noStyle rules={[{required: true}]}><Input placeholder={t('ip_whitelist.header_name')}/></Form.Item>
                                <Form.Item {...field} name={[field.name, 'value']} noStyle rules={[{required: true}]}><Input placeholder={t('ip_whitelist.header_value')}/></Form.Item>
                                <Button danger onClick={() => remove(field.name)}>{t('actions.delete')}</Button>
                            </Space.Compact>)}
                            <Button onClick={() => add({name: '', value: ''})}>{t('ip_whitelist.add_header')}</Button>
                        </div>
                    </Form.Item>}
                </Form.List>
                <Form.Item name="refreshMinutes" label={t('ip_whitelist.refresh_minutes')} extra={t('ip_whitelist.refresh_minutes_tip')} rules={[{required: true}]}><InputNumber min={5} style={{width: '100%'}}/></Form.Item>
            </> : <Form.Item name="rules" label={t('ip_whitelist.rules')} extra={t('ip_whitelist.rules_tip')} rules={[{required: true}]}><Input.TextArea autoSize={{minRows: 5, maxRows: 12}} placeholder={'192.168.1.0/24\n10.0.0.1\n172.16.0.1-172.16.0.255'}/></Form.Item>}
            <Form.Item name="enabled" label={t('general.status')} valuePropName="checked"><Switch/></Form.Item>
        </Form>
    </Modal>;
};
export default IPWhitelistModal;
