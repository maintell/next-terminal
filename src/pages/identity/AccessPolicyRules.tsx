import {useLicense} from "@/hook/LicenseContext";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Popconfirm, Space, Table, Tag, type TableColumnsType} from "antd";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import accessPolicyApi, {type AccessPolicyRule} from "../../api/access-policy-api";
import NButton from "../../components/NButton";

interface AccessPolicyRulesProps {
    active: boolean;
    groupId: string;
}

const AccessPolicyRules = ({active, groupId}: AccessPolicyRulesProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const queryClient = useQueryClient();
    const rulesQuery = useQuery({
        queryKey: ['access-policy-rules', groupId],
        queryFn: () => accessPolicyApi.getRules(groupId),
        enabled: active && hasPremiumFeatures && !!groupId,
    });
    const deleteMutation = useMutation({
        mutationFn: (ruleId: string) => accessPolicyApi.deleteRuleById(groupId, ruleId),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['access-policy-rules', groupId]}),
    });

    const columns: TableColumnsType<AccessPolicyRule> = [
        {title: t('identity.policy.priority'), dataIndex: 'priority', width: 90},
        {title: t('general.name'), dataIndex: 'name'},
        {
            title: t('identity.policy.ip_group'),
            dataIndex: 'ipGroup',
            render: value => value || '-',
        },
        {
            title: t('identity.policy.geo'),
            key: 'geo',
            render: (_, rule) => [rule.countries, rule.provinces, rule.cities].flat().filter(Boolean).join(', ') || '-',
        },
        {
            title: t('identity.policy.action.label'),
            dataIndex: 'action',
            width: 130,
            render: action => action === 'allow' ? (
                <Tag icon={<SafetyCertificateOutlined/>} color="success" variant="filled">
                    {t('identity.policy.action.allow')}
                </Tag>
            ) : (
                <Tag icon={<StopOutlined/>} color="error" variant="filled">
                    {t('identity.policy.action.reject')}
                </Tag>
            ),
        },
        {
            title: t('general.status'),
            dataIndex: 'enabled',
            width: 90,
            render: enabled => <Tag color={enabled ? 'success' : 'default'}>
                {enabled ? t('general.enabled') : t('general.disabled')}
            </Tag>,
        },
        {
            title: t('actions.label'),
            key: 'actions',
            width: 150,
            render: (_, rule) => (
                <Space>
                    <Link to={`/access-policy/${groupId}/rules/new?ruleId=${rule.id}`}>
                        <NButton>{t('actions.edit')}</NButton>
                    </Link>
                    <Popconfirm
                        title={t('general.confirm_delete')}
                        onConfirm={() => deleteMutation.mutate(rule.id)}
                    >
                        <NButton danger>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{width: '100%'}}>
            <div>
                <Link to={`/access-policy/${groupId}/rules/new`}>
                    <Button type="primary">{t('identity.policy.new_rule')}</Button>
                </Link>
            </div>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={rulesQuery.data ?? []}
                loading={rulesQuery.isLoading || deleteMutation.isPending}
                pagination={false}
            />
        </Space>
    );
};

export default AccessPolicyRules;
