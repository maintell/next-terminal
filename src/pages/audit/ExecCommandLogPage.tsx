import {useRef, useState} from 'react';
import {App, Button, DatePicker, Tabs, Tag, Tooltip, Typography} from "antd";
import {InfoCircleOutlined} from "@ant-design/icons";
import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import dayjs from "dayjs";
import NTable, {type NColumn, type NTableActionType} from "@/components/NTable";
import execCommandLogApi, {type ExecCommandLog} from "@/api/exec-command-log-api";
import sessionCommandApi, {type SessionCommandAudit} from "@/api/session-command-api";
import {AssetSelect, UserSelect} from "@/components/shared/QuerySelects";
import {getSort} from "@/utils/sort";
import IPRegion from "@/components/IPRegion";
import RemoteExecCommandDetailModal from "@/pages/audit/RemoteExecCommandDetailModal";

const {Text} = Typography;

const SessionCommandLogTable = () => {
    const {t} = useTranslation();

    const columns: NColumn<SessionCommandAudit>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'userAccount',
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <UserSelect {...rest} />;
            },
            formItemProps: {
                name: 'userId',
            },
            width: 160,
        },
        {
            title: t('menus.resource.submenus.asset'),
            dataIndex: 'assetName',
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <AssetSelect {...rest} />;
            },
            formItemProps: {
                name: 'assetId',
            },
            render: (_, record) => (
                <div>
                    <div>{record.assetName}</div>
                    <Text type="secondary">{record.username}@{record.ip}:{record.port}</Text>
                </div>
            ),
            width: 220,
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            hideInSearch: true,
            render: (_, record) => <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
            width: 150,
        },
        {
            title: t('audit.exec_command.command'),
            dataIndex: 'command',
            render: (_, record) => (
                <Tooltip title={record.command} placement="topLeft">
                    <Text code ellipsis style={{maxWidth: 420}}>{record.command || '-'}</Text>
                </Tooltip>
            ),
            width: 460,
        },
        {
            title: t('audit.exec_command.risk_level'),
            dataIndex: 'riskLevel',
            valueEnum: {
                1: {text: t('audit.exec_command.risk.high')},
                3: {text: t('audit.exec_command.risk.normal')},
            },
            render: (_, record) => record.riskLevel === 1
                ? <Tag color="error">{t('audit.exec_command.risk.high')}</Tag>
                : <Tag>{t('audit.exec_command.risk.normal')}</Tag>,
            width: 100,
        },
        {
            title: t('audit.command_audit.input_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            sorter: true,
            renderFormItem: () => <DatePicker.RangePicker showTime/>,
            formItemProps: {
                name: 'createdAtRange',
            },
            width: 180,
        },
        {
            title: t('actions.label'),
            key: 'option',
            valueType: 'option',
            width: 110,
            render: (_, record) => {
                if (record.recordingSize <= 0) {
                    return '-';
                }
                const position = Math.max(0, (record.createdAt - record.connectedAt) / 1000 - 0.5);
                const url = `/terminal-playback?sessionId=${encodeURIComponent(record.sessionId)}&at=${position}`;
                return (
                    <Button type="link" size="small" onClick={() => window.open(url, '_blank')}>
                        {t('audit.command_audit.locate_playback')}
                    </Button>
                );
            },
        },
    ];

    return (
        <NTable
            columns={columns}
            request={async (params = {}, sort) => {
                const [sortOrder, sortField] = getSort(sort);
                const range = params.createdAtRange || [];
                const result = await sessionCommandApi.getPaging({
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder,
                    sortField,
                    userId: params.userId,
                    assetId: params.assetId,
                    riskLevel: params.riskLevel,
                    command: params.command,
                    startAt: range[0] ? dayjs(range[0]).valueOf() : undefined,
                    endAt: range[1] ? dayjs(range[1]).valueOf() : undefined,
                    protocol: 'ssh',
                    status: 'disconnected',
                });
                return {
                    data: result.items,
                    success: true,
                    total: result.total,
                };
            }}
            rowKey="id"
            search={{
                labelWidth: 'auto',
            }}
            scroll={{
                x: 'max-content'
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
            }}
            dateFormatter="string"
            headerTitle={false}
        />
    );
};

const RemoteExecCommandLogTable = () => {
    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);
    const [detailRecord, setDetailRecord] = useState<ExecCommandLog>();
    const {modal} = App.useApp();

    const clearMutation = useMutation({
        mutationFn: execCommandLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const statusTag = (record: ExecCommandLog) => {
        if (record.status === 'success') {
            return <Tag color="success">{t('general.success')}</Tag>;
        }
        if (record.status === 'forbidden') {
            return <Tag color="warning">{t('audit.exec_command.status.forbidden')}</Tag>;
        }
        return (
            <Tooltip title={record.result}>
                <Tag color="error">{t('general.failed')}</Tag>
            </Tooltip>
        );
    };

    const riskTag = (record: ExecCommandLog) => record.riskLevel === 1
        ? <Tag color="error">{t('audit.exec_command.risk.high')}</Tag>
        : <Tag>{t('audit.exec_command.risk.normal')}</Tag>;

    const columns: NColumn<ExecCommandLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'userAccount',
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <UserSelect {...rest} />;
            },
            formItemProps: {
                name: 'userId',
            },
            width: 160,
        },
        {
            title: t('menus.resource.submenus.asset'),
            dataIndex: 'assetName',
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <AssetSelect {...rest} />;
            },
            formItemProps: {
                name: 'assetId',
            },
            render: (_, record) => (
                <div>
                    <div>{record.assetName}</div>
                    <Text type="secondary">{record.username}@{record.ip}:{record.port}</Text>
                </div>
            ),
            width: 220,
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            hideInSearch: true,
            render: (_, record) => <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
            width: 150,
        },
        {
            title: t('audit.exec_command.command'),
            dataIndex: 'command',
            render: (_, record) => (
                <Tooltip title={record.command} placement="topLeft">
                    <Text code ellipsis style={{maxWidth: 320}}>{record.command || '-'}</Text>
                </Tooltip>
            ),
            width: 360,
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            valueEnum: {
                success: {text: t('general.success')},
                failed: {text: t('general.failed')},
                forbidden: {text: t('audit.exec_command.status.forbidden')},
            },
            render: (_, record) => statusTag(record),
            width: 100,
        },
        {
            title: t('audit.exec_command.risk_level'),
            dataIndex: 'riskLevel',
            valueEnum: {
                1: {text: t('audit.exec_command.risk.high')},
                3: {text: t('audit.exec_command.risk.normal')},
            },
            render: (_, record) => riskTag(record),
            width: 100,
        },
        {
            title: t('audit.exec_command.started_at'),
            dataIndex: 'startedAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 180,
        },
        {
            title: t('actions.label'),
            key: 'option',
            valueType: 'option',
            width: 80,
            render: (_, record) => (
                <Button type="link" size="small" onClick={() => setDetailRecord(record)}>
                    {t('actions.detail')}
                </Button>
            ),
        },
    ];

    return (
        <>
            <NTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    const [sortOrder, sortField] = getSort(sort);
                    const result = await execCommandLogApi.paging({
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder,
                        sortField,
                        userId: params.userId,
                        assetId: params.assetId,
                        status: params.status,
                        riskLevel: params.riskLevel,
                        command: params.command,
                    });
                    return {
                        data: result.items,
                        success: true,
                        total: result.total,
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                scroll={{
                    x: 'max-content'
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                }}
                dateFormatter="string"
                headerTitle={false}
                toolBarRender={() => [
                    <Button
                        key="clear"
                        type="primary"
                        danger
                        loading={clearMutation.isPending}
                        onClick={() => {
                            modal.confirm({
                                title: t('audit.command_audit.clear_remote_exec_confirm'),
                                onOk: async () => clearMutation.mutateAsync(),
                            });
                        }}
                    >
                        {t('audit.command_audit.clear_remote_exec')}
                    </Button>
                ]}
            />
            <RemoteExecCommandDetailModal
                open={!!detailRecord}
                record={detailRecord}
                onClose={() => setDetailRecord(undefined)}
            />
        </>
    );
};

const ExecCommandLogPage = () => {
    const {t} = useTranslation();

    return (
        <Tabs
            defaultActiveKey="session"
            items={[
                {
                    key: 'session',
                    label: (
                        <span className="inline-flex items-center gap-1">
                            {t('audit.command_audit.session_commands')}
                            <Tooltip title={t('audit.command_audit.session_scope_tip')}>
                                <InfoCircleOutlined className="text-gray-400"/>
                            </Tooltip>
                        </span>
                    ),
                    children: <SessionCommandLogTable/>,
                },
                {
                    key: 'remote-exec',
                    label: (
                        <span className="inline-flex items-center gap-1">
                            {t('audit.command_audit.remote_exec_commands')}
                            <Tooltip title={t('audit.exec_command.scope_tip')}>
                                <InfoCircleOutlined className="text-gray-400"/>
                            </Tooltip>
                        </span>
                    ),
                    children: <RemoteExecCommandLogTable/>,
                },
            ]}
        />
    );
};

export default ExecCommandLogPage;
