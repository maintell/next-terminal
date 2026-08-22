import Disabled from "@/components/Disabled";
import times from "@/components/time/times";
import {useLicense} from "@/hook/LicenseContext";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";
import {useQuery} from "@tanstack/react-query";
import {Descriptions, Spin, Tag} from "antd";
import {useTranslation} from "react-i18next";
import accessPolicyApi from "../../api/access-policy-api";

interface AccessPolicyInfoProps {
    active: boolean;
    id: string;
}

const AccessPolicyInfo = ({active, id}: AccessPolicyInfoProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const groupQuery = useQuery({
        queryKey: ['access-policy-group', id],
        queryFn: () => accessPolicyApi.getById(id),
        enabled: active && !!id && hasPremiumFeatures,
    });
    const group = groupQuery.data;

    return (
        <Disabled disabled={!hasPremiumFeatures}>
            <Spin spinning={groupQuery.isLoading}>
                <Descriptions column={1}>
                    <Descriptions.Item label={t('general.name')}>{group?.name}</Descriptions.Item>
                    <Descriptions.Item label={t('general.description')}>{group?.description || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('identity.policy.mode.label')}>
                        {group?.mode === 'whitelist' ? (
                            <Tag icon={<SafetyCertificateOutlined/>} color="blue">
                                {t('identity.policy.mode.whitelist')}
                            </Tag>
                        ) : (
                            <Tag icon={<StopOutlined/>} color="orange">
                                {t('identity.policy.mode.blacklist')}
                            </Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.status')}>
                        <Tag color={group?.enabled ? 'success' : 'default'}>
                            {group?.enabled ? t('general.enabled') : t('general.disabled')}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.created_at')}>
                        {group?.createdAt ? times.format(group.createdAt) : '-'}
                    </Descriptions.Item>
                </Descriptions>
            </Spin>
        </Disabled>
    );
};

export default AccessPolicyInfo;
