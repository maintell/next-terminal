import Disabled from "@/components/Disabled";
import NLink from "@/components/NLink";
import NTable, {type NColumn, type NTableActionType} from "@/components/NTable";
import {useLicense} from "@/hook/LicenseContext";
import {getSort} from "@/utils/sort";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";
import {Alert, Button, Dropdown, Popconfirm, Space, Tag} from "antd";
import {useRef} from "react";
import {useTranslation} from "react-i18next";
import {Link, useNavigate} from "react-router-dom";
import accessPolicyApi, {type AccessPolicyGroup} from "../../api/access-policy-api";
import NButton from "../../components/NButton";

const AccessPolicyPage = () => {
    const {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    const actionRef = useRef<NTableActionType>(null);
    const navigate = useNavigate();

    const columns: NColumn<AccessPolicyGroup>[] = [
        {dataIndex: 'index', valueType: 'indexBorder', width: 48},
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (text, record) => <NLink to={`/access-policy/${record.id}?activeKey=rules`}>{text}</NLink>,
        },
        {
            title: t('general.description'),
            dataIndex: 'description',
            hideInSearch: true,
            ellipsis: true,
        },
        {
            title: t('identity.policy.mode.label'),
            dataIndex: 'mode',
            hideInSearch: true,
            width: 130,
            render: mode => mode === 'whitelist' ? (
                <Tag icon={<SafetyCertificateOutlined/>} color="blue">
                    {t('identity.policy.mode.whitelist')}
                </Tag>
            ) : (
                <Tag icon={<StopOutlined/>} color="orange">
                    {t('identity.policy.mode.blacklist')}
                </Tag>
            ),
        },
        {
            title: t('general.status'),
            dataIndex: 'enabled',
            hideInSearch: true,
            width: 100,
            valueEnum: {
                true: {text: t('general.enabled'), status: 'success'},
                false: {text: t('general.disabled'), status: 'default'},
            },
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            hideInSearch: true,
            sorter: true,
            valueType: 'dateTime',
            width: 191,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 190,
            render: (_text, record) => (
                <Space>
                    <Link to={`/access-policy/new?groupId=${record.id}`}>
                        <NButton>{t('actions.edit')}</NButton>
                    </Link>
                    <Popconfirm
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await accessPolicyApi.deleteById(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton danger>{t('actions.delete')}</NButton>
                    </Popconfirm>
                    <Dropdown
                        menu={{
                            items: [
                                {key: 'rules', label: t('identity.policy.rules')},
                                {key: 'bindings', label: t('identity.policy.binding_targets')},
                                {key: 'detail', label: t('actions.detail')},
                            ],
                            onClick: ({key}) => navigate(`/access-policy/${record.id}?activeKey=${key}`),
                        }}
                    >
                        <Button type="link" size="small" style={{padding: 0}}>{t('actions.more')}</Button>
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <Disabled disabled={!hasPremiumFeatures}>
            <Alert
                type="info"
                showIcon
                title={t('identity.policy.super_admin_bypass_tip')}
                style={{marginBottom: 16}}
            />
            <NTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    if (!hasPremiumFeatures) {
                        return {data: [], success: true, total: 0};
                    }
                    const [sortOrder, sortField] = getSort(sort);
                    const result = await accessPolicyApi.getPaging({
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder,
                        sortField,
                        name: params.name,
                    });
                    return {data: result.items, success: true, total: result.total};
                }}
                rowKey="id"
                search={{labelWidth: 'auto'}}
                pagination={{defaultPageSize: 10, showSizeChanger: true}}
                dateFormatter="string"
                headerTitle={t('identity.policy.groups')}
                toolBarRender={() => [
                    <Link key="new" to="/access-policy/new">
                        <Button type="primary">{t('identity.policy.new_group')}</Button>
                    </Link>,
                ]}
            />
        </Disabled>
    );
};

export default AccessPolicyPage;
