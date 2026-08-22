import ipWhitelistApi, {type IPWhitelist} from "@/api/ip-whitelist-api";
import NButton from "@/components/NButton";
import NTable, {type NColumn, type NTableActionType} from "@/components/NTable";
import IPWhitelistModal from "@/pages/assets/IPWhitelistModal";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Popconfirm, Space, Tag} from "antd";
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";

const IPWhitelistPage = () => {
    const {t} = useTranslation(); const {message} = App.useApp(); const actionRef = useRef<NTableActionType>(null); const [open, setOpen] = useState(false); const [id, setId] = useState<string>();
    const save = useMutation({mutationFn: async (values: IPWhitelist) => id ? await ipWhitelistApi.updateById(id, values) : await ipWhitelistApi.create(values), onSuccess: () => { message.success(t('general.success')); setOpen(false); setId(undefined); actionRef.current?.reload(); }});
    const remove = useMutation({mutationFn: (value: string) => ipWhitelistApi.deleteById(value), onSuccess: () => {message.success(t('general.success')); actionRef.current?.reload();}});
    const sync = useMutation({mutationFn: (value: string) => ipWhitelistApi.sync(value), onSuccess: () => {message.success(t('general.success')); actionRef.current?.reload();}});
    const columns: NColumn<IPWhitelist>[] = [
        {dataIndex: 'index', valueType: 'indexBorder', width: 48}, {title: t('general.name'), dataIndex: 'name', hideInSearch: true},
        {title: t('ip_whitelist.source'), dataIndex: 'sourceType', hideInSearch: true, render: value => <Tag>{value === 'url' ? t('ip_whitelist.source_url') : t('ip_whitelist.source_manual')}</Tag>},
        {title: t('general.status'), dataIndex: 'enabled', valueType: 'status', hideInSearch: true}, {title: t('ip_whitelist.last_synced_at'), dataIndex: 'lastSyncedAt', valueType: 'dateTime', hideInSearch: true},
        {title: t('actions.label'), valueType: 'option', render: (_, item) => <Space>{item.sourceType === 'url' && <NButton loading={sync.isPending} onClick={() => sync.mutate(item.id)}>{t('ip_whitelist.sync')}</NButton>}<NButton onClick={() => {setId(item.id); setOpen(true);}}>{t('actions.edit')}</NButton><Popconfirm title={t('general.confirm_delete')} onConfirm={() => remove.mutate(item.id)}><NButton danger>{t('actions.delete')}</NButton></Popconfirm></Space>},
    ];
    return <><NTable columns={columns} actionRef={actionRef} rowKey="id" search={false} headerTitle={t('menus.resource.submenus.ip_whitelist')} request={async () => { const data = await ipWhitelistApi.all(); return {data, success: true, total: data.length}; }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => {setId(undefined); setOpen(true);}}>{t('actions.new')}</Button>]}/><IPWhitelistModal open={open} id={id} confirmLoading={save.isPending} onCancel={() => {setOpen(false); setId(undefined);}} onSubmit={values => save.mutate(values)}/></>;
};
export default IPWhitelistPage;
