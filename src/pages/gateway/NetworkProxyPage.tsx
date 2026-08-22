import networkProxyApi, {NetworkProxy, NetworkProxyReferenceError} from "@/api/network-proxy-api";
import NButton from "@/components/NButton";
import NTable, {NColumn, NTableActionType} from "@/components/NTable";
import NetworkProxyModal from "@/pages/gateway/NetworkProxyModal";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Popconfirm, Space, Tag} from "antd";
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";

const NetworkProxyPage = () => {
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    const actionRef = useRef<NTableActionType>(null);
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string>();

    const saveMutation = useMutation({
        mutationFn: async (values: NetworkProxy) => {
            if (selectedId) {
                await networkProxyApi.updateById(selectedId, values);
                return;
            }
            await networkProxyApi.create(values);
        },
        onSuccess: () => {
            message.success(t('general.success'));
            setOpen(false);
            setSelectedId(undefined);
            actionRef.current?.reload();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => networkProxyApi.deleteById(id),
        onSuccess: () => {
            message.success(t('general.success'));
            actionRef.current?.reload();
        },
        onError: (error: NetworkProxyReferenceError) => {
            const references = [
                {title: t('gateways.gateway_delete_referenced_assets'), names: error.assetNames || []},
                {title: t('gateways.gateway_delete_referenced_websites'), names: error.websiteNames || []},
                {title: t('gateways.gateway_delete_referenced_database_assets'), names: error.databaseAssetNames || []},
            ].filter(item => item.names.length > 0);
            if (references.length > 0) {
                modal.warning({
                    title: t('network_proxy.delete_referenced_title'),
                    content: (
                        <div className="space-y-3">
                            {references.map(reference => (
                                <div key={reference.title}>
                                    <div>{reference.title}</div>
                                    <ul className="m-0 pl-5">
                                        {reference.names.map((name, index) => <li key={`${reference.title}-${index}`}>{name}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ),
                });
                return;
            }
            message.error(error.message || t('general.failed'));
        },
    });

    const columns: NColumn<NetworkProxy>[] = [
        {dataIndex: 'index', valueType: 'indexBorder', width: 48},
        {title: t('general.name'), dataIndex: 'name', hideInSearch: true},
        {
            title: t('network_proxy.protocol'), dataIndex: 'protocol', hideInSearch: true,
            render: protocol => <Tag color={protocol === 'http' ? 'blue' : 'purple'}>{String(protocol).toUpperCase()}</Tag>,
        },
        {title: t('network_proxy.host'), dataIndex: 'host', hideInSearch: true},
        {title: t('network_proxy.port'), dataIndex: 'port', hideInSearch: true},
        {title: t('network_proxy.username'), dataIndex: 'username', hideInSearch: true},
        {title: t('general.created_at'), dataIndex: 'createdAt', valueType: 'dateTime', hideInSearch: true},
        {
            title: t('actions.label'), valueType: 'option', key: 'option',
            render: (_text, record) => (
                <Space>
                    <NButton onClick={() => { setSelectedId(record.id); setOpen(true); }}>
                        {t('actions.edit')}
                    </NButton>
                    <Popconfirm title={t('general.confirm_delete')} onConfirm={() => deleteMutation.mutate(record.id)}>
                        <NButton danger>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <NTable
                columns={columns}
                actionRef={actionRef}
                rowKey="id"
                search={false}
                pagination={{defaultPageSize: 10, showSizeChanger: true}}
                headerTitle={t('menus.gateway.submenus.network_proxy')}
                request={async (params = {}, sort) => {
                    const [sortOrder, sortField] = getSort(sort);
                    const result = await networkProxyApi.getPaging({
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder,
                        sortField,
                        keyword: params.keyword,
                    });
                    return {data: result.items, success: true, total: result.total};
                }}
                toolBarRender={() => [
                    <Button key="new" type="primary" onClick={() => { setSelectedId(undefined); setOpen(true); }}>
                        {t('actions.new')}
                    </Button>,
                ]}
            />
            <NetworkProxyModal
                open={open}
                id={selectedId}
                confirmLoading={saveMutation.isPending}
                onCancel={() => { setOpen(false); setSelectedId(undefined); }}
                onSubmit={values => saveMutation.mutate(values)}
            />
        </>
    );
};

export default NetworkProxyPage;
