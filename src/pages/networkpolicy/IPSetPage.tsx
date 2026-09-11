import ipSetApi, {type IPSet} from "@/api/ip-set-api";
import NButton from "@/components/NButton";
import NTable, {type NColumn, type NTableActionType} from "@/components/NTable";
import IPSetModal from "@/pages/networkpolicy/IPSetModal";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {App, Button, Popconfirm, Space, Tag} from "antd";
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";

const IPSetPage = () => {
    const {t} = useTranslation(); const {message} = App.useApp(); const actionRef = useRef<NTableActionType>(null); const [open, setOpen] = useState(false); const [id, setId] = useState<string>();
    const queryClient = useQueryClient();
    const refresh = () => {
        actionRef.current?.reload();
        void queryClient.invalidateQueries({queryKey: ['ip-set-options']});
    };
    const save = useMutation({mutationFn: async (values: IPSet) => id ? await ipSetApi.updateById(id, values) : await ipSetApi.create(values), onSuccess: () => { message.success(t('general.success')); setOpen(false); setId(undefined); refresh(); }});
    const remove = useMutation({mutationFn: (value: string) => ipSetApi.deleteById(value), onSuccess: () => {message.success(t('general.success')); refresh();}});
    const sync = useMutation({mutationFn: (value: string) => ipSetApi.sync(value), onSuccess: () => {message.success(t('general.success')); refresh();}});
    const columns: NColumn<IPSet>[] = [
        {dataIndex: 'index', valueType: 'indexBorder', width: 48}, {title: t('general.name'), dataIndex: 'name', hideInSearch: true},
        {title: t('ip_set.source'), dataIndex: 'sourceType', hideInSearch: true, render: value => <Tag>{value === 'url' ? t('ip_set.source_url') : t('ip_set.source_manual')}</Tag>},
        {title: t('general.status'), dataIndex: 'enabled', valueType: 'status', hideInSearch: true}, {title: t('ip_set.last_synced_at'), dataIndex: 'lastSyncedAt', valueType: 'dateTime', hideInSearch: true},
        {title: t('actions.label'), valueType: 'option', render: (_, item) => <Space>{item.sourceType === 'url' && <NButton loading={sync.isPending} onClick={() => sync.mutate(item.id)}>{t('ip_set.sync')}</NButton>}<NButton onClick={() => {setId(item.id); setOpen(true);}}>{t('actions.edit')}</NButton><Popconfirm title={t('general.confirm_delete')} onConfirm={() => remove.mutate(item.id)}><NButton danger>{t('actions.delete')}</NButton></Popconfirm></Space>},
    ];
    return <><NTable columns={columns} actionRef={actionRef} rowKey="id" search={false} headerTitle={t('menus.resource.submenus.ip_set')} request={async () => { const data = await ipSetApi.all(); return {data, success: true, total: data.length}; }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => {setId(undefined); setOpen(true);}}>{t('actions.new')}</Button>]}/><IPSetModal open={open} id={id} confirmLoading={save.isPending} onCancel={() => {setOpen(false); setId(undefined);}} onSubmit={values => save.mutate(values)}/></>;
};
export default IPSetPage;
