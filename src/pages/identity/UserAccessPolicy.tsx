import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {useQuery} from "@tanstack/react-query";
import {Space, Spin, Table, Tag} from "antd";
import {useTranslation} from "react-i18next";
import accessPolicyApi, {type EffectiveAccessPolicyGroup} from "../../api/access-policy-api";
import AccessPolicyBindingEditor from "./AccessPolicyBindingEditor";

interface UserAccessPolicyProps {
    active: boolean;
    userId: string;
}

const UserAccessPolicy = ({active, userId}: UserAccessPolicyProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();

    const effectivePolicyQuery = useQuery({
        queryKey: ['effective-access-policy-groups', userId],
        queryFn: () => accessPolicyApi.getEffectiveGroups(userId),
        enabled: active && hasPremiumFeatures && !!userId,
    });

    if (licenseLoading) {
        return <Spin/>;
    }
    if (!hasPremiumFeatures) {
        return <Disabled disabled><div/></Disabled>;
    }

    const columns = [
        {
            title: t('general.name'),
            dataIndex: 'name',
        },
        {
            title: t('identity.policy.mode.label'),
            dataIndex: 'mode',
            width: 130,
            render: (mode: string) => (
                <Tag color={mode === 'whitelist' ? 'blue' : 'orange'}>
                    {t(`identity.policy.mode.${mode}`)}
                </Tag>
            ),
        },
        {
            title: t('general.status'),
            dataIndex: 'enabled',
            width: 100,
            render: (enabled: boolean) => <Tag color={enabled ? 'success' : 'default'}>
                {enabled ? t('general.enabled') : t('general.disabled')}
            </Tag>,
        },
        {
            title: t('identity.policy.source'),
            dataIndex: 'sources',
            render: (sources: EffectiveAccessPolicyGroup['sources']) => (
                <Space size={[4, 4]} wrap>
                    {sources.map((source, index) => source.type === 'user' ? (
                        <Tag key={`user-${index}`} color="blue">{t('identity.policy.direct_binding')}</Tag>
                    ) : (
                        <Tag key={`${source.id}-${index}`} color="purple">
                            {source.name || source.id}
                        </Tag>
                    ))}
                </Space>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{width: '100%'}}>
            <div className={'space-y-2'}>
                <h3>{t('identity.policy.effective_policies')}</h3>
                <Table<EffectiveAccessPolicyGroup>
                    rowKey="id"
                    columns={columns}
                    dataSource={effectivePolicyQuery.data ?? []}
                    loading={effectivePolicyQuery.isLoading}
                    pagination={false}
                    size="small"
                />
            </div>
            <div className={'space-y-2'}>
                <h3>{t('identity.policy.direct_bindings')}</h3>
                <AccessPolicyBindingEditor active={active} subjectType="user" subjectId={userId}/>
            </div>
        </Space>
    );
};

export default UserAccessPolicy;
