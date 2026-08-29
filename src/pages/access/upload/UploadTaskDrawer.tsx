import {ReloadOutlined} from '@ant-design/icons';
import type {DrawerProps, TableColumnsType} from 'antd';
import {Button, Drawer, Progress, Table, Tag, Tooltip} from 'antd';
import {X, XCircle} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {renderSize} from '@/utils/utils';
import {useUploadManager} from './UploadManagerProvider';
import {UploadTaskRecord} from './upload-types';

interface Props {
    fsId: string;
    open: boolean;
    onClose: () => void;
    getContainer?: DrawerProps['getContainer'];
}

export default function UploadTaskDrawer({fsId, open, onClose, getContainer}: Props) {
    const {t} = useTranslation();
    const {manager, tasks} = useUploadManager();
    const records = tasks.filter(task => task.fsId === fsId);
    const completedRecords = records.filter(task => task.status === 'success').length;
    const errorRecords = records.filter(task => task.status === 'error' || task.status === 'interrupted').length;

    const columns: TableColumnsType<UploadTaskRecord> = [
        {
            title: t('audit.filename'),
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text, record) => <Tooltip title={record.path}>{text}</Tooltip>,
        },
        {
            title: t('fs.attributes.size'),
            dataIndex: 'size',
            key: 'size',
            render: value => renderSize(value),
            width: 90,
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                switch (status) {
                    case 'queued':
                    case 'retrying':
                    case 'initializing':
                        return <Tag>{t('fs.transmission.options.preparing')}</Tag>;
                    case 'uploading':
                        return <Tag color="processing">{t('fs.transmission.options.uploading')}</Tag>;
                    case 'transmitting':
                        return <Tag color="processing">{t('fs.transmission.options.transmitting')}</Tag>;
                    case 'success':
                        return <Tag color="success">{t('fs.transmission.options.upload_success')}</Tag>;
                    case 'cancelled':
                        return <Tag color="warning">{t('fs.transmission.options.cancelled')}</Tag>;
                    case 'interrupted':
                        return <Tooltip title={record.error}>
                            <Tag color="warning">{t('fs.transmission.options.interrupted')}</Tag>
                        </Tooltip>;
                    case 'error':
                        return <Tooltip title={record.error}>
                            <Tag color="error">{t('fs.transmission.options.upload_failed')}</Tag>
                        </Tooltip>;
                }
            },
            width: 110,
        },
        {
            title: t('fs.transmission.progress'),
            dataIndex: 'percent',
            key: 'percent',
            render: (_value, record) => <div>
                <Progress
                    percent={record.percent}
                    size="small"
                    status={record.status === 'error' ? 'exception' : record.status === 'success' ? 'success' : 'active'}
                    format={percent => `${percent?.toFixed(1)}%`}
                    style={{width: 110}}
                />
                {(record.status === 'uploading' || record.status === 'transmitting') && (
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                        {record.status === 'uploading'
                            ? `${t('fs.transmission.client_stage')} ${record.clientPercent.toFixed(1)}%`
                            : `${t('fs.transmission.remote_stage')} ${record.remotePercent.toFixed(1)}%`}
                    </div>
                )}
            </div>,
            width: 150,
        },
        {
            title: t('fs.transmission.speed'),
            dataIndex: 'speed',
            key: 'speed',
            render: value => <span className="text-xs whitespace-nowrap">
                {value > 0 ? `${renderSize(value, 0)}/s` : '-'}
            </span>,
            width: 100,
        },
        {
            title: t('actions.label'),
            key: 'actions',
            width: 96,
            render: (_, record) => <div className="flex gap-1">
                {['queued', 'initializing', 'uploading', 'transmitting'].includes(record.status) && (
                    <Tooltip title={t('actions.cancel')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<XCircle className="h-3 w-3"/>}
                            onClick={() => void manager.cancel(record.id)}
                        />
                    </Tooltip>
                )}
                {(record.status === 'error' || record.status === 'cancelled' || record.status === 'interrupted') && record.retryable && (
                    <Tooltip title={t('actions.retry')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<ReloadOutlined/>}
                            onClick={() => void manager.retry(record.id)}
                        />
                    </Tooltip>
                )}
                {['success', 'error', 'cancelled', 'interrupted'].includes(record.status) && (
                    <Tooltip title={t('actions.delete')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<X className="h-3 w-3"/>}
                            onClick={() => void manager.remove(record.id)}
                        />
                    </Tooltip>
                )}
            </div>,
        },
    ];

    return <Drawer
        title={<div className="flex items-center justify-between">
            <span>{t('fs.navigation.file_tran')}</span>
            {records.length > 0 && (
                <div className="mr-4 text-sm text-gray-500">
                    {t('fs.transmission.completed_summary', {completed: completedRecords, total: records.length})}
                    {errorRecords > 0 && (
                        <span className="ml-1 text-red-500">
                            {t('fs.transmission.failed_summary', {failed: errorRecords})}
                        </span>
                    )}
                </div>
            )}
        </div>}
        placement="bottom"
        onClose={onClose}
        open={open}
        getContainer={getContainer}
        mask={false}
        extra={<Button danger onClick={() => void manager.clearFinished(fsId)}>
            {t('actions.clear')}
        </Button>}
    >
        <Table
            rowKey="id"
            columns={columns}
            dataSource={records}
            size="small"
            pagination={false}
        />
    </Drawer>;
}
