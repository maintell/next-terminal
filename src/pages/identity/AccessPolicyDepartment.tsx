import departmentApi from "@/api/department-api";
import {useLicense} from "@/hook/LicenseContext";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, message, Space, Spin, Tree} from "antd";
import {type Key, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import accessPolicyApi from "../../api/access-policy-api";

interface AccessPolicyDepartmentProps {
    active: boolean;
    id: string;
}

const AccessPolicyDepartment = ({active, id}: AccessPolicyDepartmentProps) => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);

    const departmentTreeQuery = useQuery({
        queryKey: ['department-tree'],
        queryFn: departmentApi.getTree,
        enabled: active && hasPremiumFeatures,
    });

    const bindingsQuery = useQuery({
        queryKey: ['access-policy-group-bindings', 'group', id],
        queryFn: () => accessPolicyApi.getBindings(id),
        enabled: active && hasPremiumFeatures && !!id,
    });

    useEffect(() => {
        if (bindingsQuery.data) {
            setCheckedKeys(bindingsQuery.data.departmentIds);
        }
    }, [bindingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: (departmentIds: string[]) => accessPolicyApi.setDepartmentIdsByGroupId(id, departmentIds),
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

    return (
        <Spin spinning={departmentTreeQuery.isLoading || bindingsQuery.isLoading}>
            <Space direction="vertical" size="middle" style={{width: '100%'}}>
                <div style={{border: '1px solid #f0f0f0', borderRadius: 6, padding: 16, minHeight: 300}}>
                    <Tree
                        checkable
                        checkStrictly
                        showLine
                        defaultExpandAll
                        treeData={departmentTreeQuery.data ?? []}
                        checkedKeys={checkedKeys}
                        disabled={!hasPremiumFeatures || saveMutation.isPending}
                        onCheck={keys => setCheckedKeys(Array.isArray(keys) ? keys : keys.checked)}
                    />
                </div>
                <Space>
                    <Button
                        type="primary"
                        loading={saveMutation.isPending}
                        disabled={!hasPremiumFeatures}
                        onClick={() => saveMutation.mutate(checkedKeys.map(String))}
                    >
                        {t('actions.save')}
                    </Button>
                    <Button
                        disabled={!hasPremiumFeatures || saveMutation.isPending}
                        onClick={() => setCheckedKeys(bindingsQuery.data?.departmentIds ?? [])}
                    >
                        {t('identity.policy.reset_binding')}
                    </Button>
                </Space>
            </Space>
            {contextHolder}
        </Spin>
    );
};

export default AccessPolicyDepartment;
