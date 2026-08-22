import Disabled from "@/components/Disabled";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {useLicense} from "@/hook/LicenseContext";
import {useMutation} from "@tanstack/react-query";
import {Alert, Button, Checkbox, DatePicker, Form, Input, InputNumber, Radio, Select, Typography} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import accessPolicyApi, {type AccessPolicyRule} from "../../api/access-policy-api";
import DragWeekTime from "../../components/drag-weektime/DragWeekTime";
import {maybe} from "../../utils/maybe";

const {Title} = Typography;

const hasRuleMatchCondition = (values: Partial<AccessPolicyRule>) => {
    return Boolean(
        values.ipGroup?.trim()
        || values.countries?.length
        || values.provinces?.length
        || values.cities?.length
        || values.timePeriod?.some(period => period.value.trim()),
    );
};

const AccessPolicyRulePostPage = () => {
    const {groupId = ''} = useParams();
    const [searchParams] = useSearchParams();
    const ruleId = maybe(searchParams.get('ruleId'), '');
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const get = async () => {
        if (ruleId) {
            const data: any = await accessPolicyApi.getRuleById(groupId, ruleId);
            data.expirationAt = data.expirationAt ? dayjs(data.expirationAt) : undefined;
            return data;
        }
        return {
            id: '',
            groupId,
            name: '',
            ipGroup: '',
            priority: 50,
            action: 'reject',
            enabled: false,
            expirationAt: undefined,
            timePeriod: [],
            countries: [],
            provinces: [],
            cities: [],
            createdAt: 0,
        } as AccessPolicyRule;
    };

    const mutation = useMutation({
        mutationFn: async (values: any) => {
            const data = {
                ...values,
                expirationAt: values.expirationAt ? dayjs(values.expirationAt).valueOf() : 0,
            } as AccessPolicyRule;
            if (ruleId) {
                return await accessPolicyApi.updateRuleById(groupId, ruleId, data);
            }
            return await accessPolicyApi.createRule(groupId, data);
        },
        onSuccess: () => navigate(`/access-policy/${groupId}?activeKey=rules`),
    });

    const formQuery = useFormRequest(form, ['form-request', 'access-policy-rule', groupId, ruleId], get, {
        enabled: hasPremiumFeatures && !!groupId,
    });

    return (
        <div className="px-4">
            <Title level={5} style={{marginTop: 0}}>
                {ruleId ? t('identity.policy.edit_rule') : t('identity.policy.new_rule')}
            </Title>
            <Disabled disabled={!hasPremiumFeatures}>
                <Form form={form} layout="vertical" onFinish={values => mutation.mutate(values)}>
                    <Form.Item hidden name="id"><Input/></Form.Item>
                    <Form.Item hidden name="groupId"><Input/></Form.Item>
                    <Alert
                        style={{marginBottom: 24}}
                        type="info"
                        showIcon
                        title={t('identity.policy.rule_match_tip')}
                    />
                    <Form.Item name="name" label={t('general.name')} rules={[{required: true}]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item
                        name="priority"
                        label={t('identity.policy.priority')}
                        extra={t('identity.policy.priority_extra')}
                        rules={[{required: true}]}
                    >
                        <InputNumber min={1} max={100} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item name="ipGroup" label={t('identity.policy.ip_group')} extra={t('identity.policy.ip_group_extra')}>
                        <Input.TextArea
                            autoSize={{minRows: 3, maxRows: 8}}
                            placeholder={t('identity.policy.ip_group_placeholder')}
                        />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Form.Item name="countries" label={t('identity.policy.country')} extra={t('identity.policy.country_extra')}>
                            <Select
                                mode="tags"
                                tokenSeparators={[',', '，']}
                                placeholder={t('assets.limit_country_placeholder')}
                            />
                        </Form.Item>
                        <Form.Item name="provinces" label={t('identity.policy.province')} extra={t('identity.policy.province_extra')}>
                            <Select
                                mode="tags"
                                tokenSeparators={[',', '，']}
                                placeholder={t('assets.limit_province_placeholder')}
                            />
                        </Form.Item>
                        <Form.Item name="cities" label={t('identity.policy.city')} extra={t('identity.policy.city_extra')}>
                            <Select
                                mode="tags"
                                tokenSeparators={[',', '，']}
                                placeholder={t('assets.limit_city_placeholder')}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item name="timePeriod" label={t('identity.policy.time_period')} extra={t('identity.policy.time_period_extra')}>
                        <DragWeekTime/>
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(previous, current) => (
                            previous.ipGroup !== current.ipGroup
                            || previous.countries !== current.countries
                            || previous.provinces !== current.provinces
                            || previous.cities !== current.cities
                            || previous.timePeriod !== current.timePeriod
                        )}
                    >
                        {({getFieldsValue}) => {
                            const values = getFieldsValue();
                            return formQuery.isFetched && values.id !== undefined && !hasRuleMatchCondition(values) ? (
                                <Alert
                                    style={{marginBottom: 24}}
                                    type="warning"
                                    showIcon
                                    title={t('identity.policy.rule_match_all_warning')}
                                />
                            ) : null;
                        }}
                    </Form.Item>
                    <Form.Item name="action" label={t('identity.policy.action.label')} rules={[{required: true}]}>
                        <Radio.Group options={[
                            {value: 'allow', label: t('identity.policy.action.allow')},
                            {value: 'reject', label: t('identity.policy.action.reject')},
                        ]}/>
                    </Form.Item>
                    <Form.Item name="expirationAt" label={t('identity.policy.expiration_at')}>
                        <DatePicker format="YYYY-MM-DD HH:mm:ss" showTime/>
                    </Form.Item>
                    <Form.Item name="enabled" valuePropName="checked" extra={t('identity.policy.rule_enabled_extra')}>
                        <Checkbox>{t('identity.policy.enable_rule')}</Checkbox>
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

export default AccessPolicyRulePostPage;
