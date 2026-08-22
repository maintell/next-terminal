import {useLicense} from "@/hook/LicenseContext";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, message, Space, Spin, Transfer} from "antd";
import {type Key, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import accessPolicyApi from "../../api/access-policy-api";
import userApi from "../../api/user-api";

interface AccessPolicyUserProps {
    active: boolean;
    id: string;
}

const AccessPolicyUser = ({active, id}: AccessPolicyUserProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    const usersQuery = useQuery({
        queryKey: ['users', 'all'],
        queryFn: userApi.getAll,
        enabled: active && hasPremiumFeatures,
    });

    const bindingsQuery = useQuery({
        queryKey: ['access-policy-group-bindings', 'group', id],
        queryFn: () => accessPolicyApi.getBindings(id),
        enabled: active && hasPremiumFeatures && !!id,
    });

    useEffect(() => {
        if (bindingsQuery.data) {
            setTargetKeys(bindingsQuery.data.userIds);
        }
    }, [bindingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: (userIds: string[]) => accessPolicyApi.setUserIdsByGroupId(id, userIds),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ['access-policy-group-bindings']});
            await queryClient.invalidateQueries({queryKey: ['effective-access-policy-groups']});
            messageApi.success(t('general.success'));
        },
        onError: () => messageApi.error(t('general.error')),
    });

    if (licenseLoading) {
        return <Spin/>;
    }

    const items = (usersQuery.data ?? []).map(item => ({
        key: item.id,
        title: `${item.nickname} (${item.username})`,
    }));

    return (
        <Spin spinning={usersQuery.isLoading || bindingsQuery.isLoading}>
            <Space direction="vertical" size="middle">
                <Transfer
                    dataSource={items}
                    titles={[t('identity.user.available'), t('identity.user.selected')]}
                    targetKeys={targetKeys}
                    onChange={(keys: Key[]) => setTargetKeys(keys.map(String))}
                    render={item => item.title}
                    showSearch
                    disabled={!hasPremiumFeatures || saveMutation.isPending}
                    listStyle={{width: 300, height: 400}}
                />
                <Space>
                    <Button
                        type="primary"
                        loading={saveMutation.isPending}
                        disabled={!hasPremiumFeatures}
                        onClick={() => saveMutation.mutate(targetKeys)}
                    >
                        {t('actions.save')}
                    </Button>
                    <Button
                        disabled={!hasPremiumFeatures || saveMutation.isPending}
                        onClick={() => setTargetKeys(bindingsQuery.data?.userIds ?? [])}
                    >
                        {t('identity.policy.reset_binding')}
                    </Button>
                </Space>
            </Space>
            {contextHolder}
        </Spin>
    );
};

export default AccessPolicyUser;
