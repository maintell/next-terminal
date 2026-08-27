import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, message, Space, Spin, Transfer} from "antd";
import {type Key, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import accessPolicyApi from "../../api/access-policy-api";

interface AccessPolicyBindingEditorProps {
    active: boolean;
    subjectType: 'user' | 'department';
    subjectId: string;
}

const AccessPolicyBindingEditor = ({active, subjectType, subjectId}: AccessPolicyBindingEditorProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    const accessPolicyQuery = useQuery({
        queryKey: ['access-policy-groups', 'all'],
        queryFn: accessPolicyApi.getAll,
        enabled: active && hasPremiumFeatures,
    });

    const selectedKeysQuery = useQuery({
        queryKey: ['access-policy-group-bindings', subjectType, subjectId],
        queryFn: () => subjectType === 'user'
            ? accessPolicyApi.getGroupIdsByUserId(subjectId)
            : accessPolicyApi.getGroupIdsByDepartmentId(subjectId),
        enabled: active && hasPremiumFeatures && !!subjectId,
    });

    useEffect(() => {
        if (selectedKeysQuery.data) {
            setTargetKeys(selectedKeysQuery.data);
        }
    }, [selectedKeysQuery.data]);

    const saveMutation = useMutation({
        mutationFn: (groupIds: string[]) => subjectType === 'user'
            ? accessPolicyApi.setGroupIdsByUserId(subjectId, groupIds)
            : accessPolicyApi.setGroupIdsByDepartmentId(subjectId, groupIds),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ['access-policy-group-bindings']});
            if (subjectType === 'user') {
                await queryClient.invalidateQueries({queryKey: ['effective-access-policy-groups', subjectId]});
            }
            messageApi.success(t('general.success'));
        },
        onError: () => {
            messageApi.error(t('general.error'));
        },
    });

    if (licenseLoading) {
        return <Spin/>;
    }
    if (!hasPremiumFeatures) {
        return <Disabled disabled><div/></Disabled>;
    }

    const items = (accessPolicyQuery.data ?? [])
        .map(item => ({
            key: item.id,
            title: item.name,
            mode: item.mode,
        }));

    const handleChange = (nextTargetKeys: Key[]) => {
        setTargetKeys(nextTargetKeys.map(String));
    };

    const reset = () => {
        setTargetKeys(selectedKeysQuery.data ?? []);
    };

    return (
        <Spin spinning={accessPolicyQuery.isLoading || selectedKeysQuery.isLoading}>
            <Space orientation="vertical" size="middle">
                <Transfer
                    dataSource={items}
                    titles={[t('general.unbound'), t('general.bound')]}
                    actions={[t('actions.binding'), t('actions.unbind')]}
                    showSearch
                    styles={{section: {width: 300, height: 400}}}
                    targetKeys={targetKeys}
                    onChange={handleChange}
                    disabled={saveMutation.isPending}
                    render={item => `${item.title} (${t(`identity.policy.mode.${item.mode}`)})`}
                />
                <Space>
                    <Button
                        type="primary"
                        loading={saveMutation.isPending}
                        onClick={() => saveMutation.mutate(targetKeys)}
                    >
                        {t('actions.save')}
                    </Button>
                    <Button disabled={saveMutation.isPending} onClick={reset}>
                        {t('identity.policy.reset_binding')}
                    </Button>
                </Space>
            </Space>
            {contextHolder}
        </Spin>
    );
};

export default AccessPolicyBindingEditor;
