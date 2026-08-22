import Disabled from "@/components/Disabled";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {useLicense} from "@/hook/LicenseContext";
import {useMutation} from "@tanstack/react-query";
import {Alert, Button, Checkbox, Form, Input, Radio, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useNavigate, useSearchParams} from "react-router-dom";
import accessPolicyApi, {type AccessPolicyGroup} from "../../api/access-policy-api";
import {maybe} from "../../utils/maybe";

const {Title} = Typography;

const AccessPolicyPostPage = () => {
    const [searchParams] = useSearchParams();
    const id = maybe(searchParams.get('groupId'), '');
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const [form] = Form.useForm<AccessPolicyGroup>();
    const navigate = useNavigate();

    const get = async () => {
        if (id) {
            return await accessPolicyApi.getById(id);
        }
        return {
            id: '',
            name: '',
            description: '',
            mode: 'whitelist',
            enabled: false,
            createdAt: 0,
        } as AccessPolicyGroup;
    };

    const mutation = useMutation({
        mutationFn: async (values: AccessPolicyGroup) => {
            if (values.id) {
                await accessPolicyApi.updateById(values.id, values);
                return values;
            }
            return await accessPolicyApi.create(values);
        },
        onSuccess: group => {
            navigate(`/access-policy/${group.id}?activeKey=rules`);
        },
    });

    useFormRequest(form, ["form-request", "access-policy-group", id], get, {
        enabled: hasPremiumFeatures,
    });

    return (
        <div className="px-4">
            <Title level={5} style={{marginTop: 0}}>
                {id ? t('identity.policy.edit_group') : t('identity.policy.new_group')}
            </Title>
            <Disabled disabled={!hasPremiumFeatures}>
                <Form form={form} layout="vertical" onFinish={values => mutation.mutate(values)}>
                    <Form.Item hidden name="id"><Input/></Form.Item>
                    <Alert
                        style={{marginBottom: 24}}
                        type="info"
                        showIcon
                        title={t('identity.policy.group_evaluation_tip')}
                    />
                    <Form.Item name="name" label={t('general.name')} rules={[{required: true}]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item name="description" label={t('general.description')}>
                        <Input.TextArea autoSize={{minRows: 2, maxRows: 6}}/>
                    </Form.Item>
                    <Form.Item
                        name="mode"
                        label={t('identity.policy.mode.label')}
                        extra={t('identity.policy.mode.extra')}
                        rules={[{required: true}]}
                    >
                        <Radio.Group options={[
                            {value: 'whitelist', label: t('identity.policy.mode.whitelist')},
                            {value: 'blacklist', label: t('identity.policy.mode.blacklist')},
                        ]}/>
                    </Form.Item>
                    <Form.Item name="enabled" valuePropName="checked" extra={t('identity.policy.group_enabled_extra')}>
                        <Checkbox>{t('identity.policy.enable_group')}</Checkbox>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                            {t('actions.save')}
                        </Button>
                    </Form.Item>
                </Form>
            </Disabled>
        </div>
    );
};

export default AccessPolicyPostPage;
