import {Button, Descriptions, Modal, Tag, Typography} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import type {ExecCommandLog} from "@/api/exec-command-log-api";
import IPRegion from "@/components/IPRegion";

const {Text} = Typography;

interface Props {
    open: boolean;
    record?: ExecCommandLog;
    onClose: () => void;
}

const RemoteExecCommandDetailModal = ({open, record, onClose}: Props) => {
    const {t} = useTranslation();

    const statusTag = () => {
        if (record?.status === 'success') {
            return <Tag color="success">{t('general.success')}</Tag>;
        }
        if (record?.status === 'forbidden') {
            return <Tag color="warning">{t('audit.exec_command.status.forbidden')}</Tag>;
        }
        return <Tag color="error">{t('general.failed')}</Tag>;
    };

    const riskTag = record?.riskLevel === 1
        ? <Tag color="error">{t('audit.exec_command.risk.high')}</Tag>
        : <Tag>{t('audit.exec_command.risk.normal')}</Tag>;

    return (
        <Modal
            title={t('audit.command_audit.remote_exec_detail')}
            open={open}
            width={720}
            destroyOnHidden
            onCancel={onClose}
            footer={(
                <Button type="primary" onClick={onClose}>
                    {t('actions.close')}
                </Button>
            )}
        >
            {record && (
                <div className="w-full min-w-0">
                    <Descriptions
                        bordered
                        size="small"
                        column={1}
                        items={[
                            {
                                key: 'user',
                                label: t('menus.identity.submenus.user'),
                                children: record.userAccount || '-',
                            },
                            {
                                key: 'asset',
                                label: t('menus.resource.submenus.asset'),
                                children: (
                                    <div>
                                        <div>{record.assetName || '-'}</div>
                                        <Text type="secondary">{record.username}@{record.ip}:{record.port}</Text>
                                    </div>
                                ),
                            },
                            {
                                key: 'clientIp',
                                label: t('audit.client_ip'),
                                children: <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
                            },
                            {
                                key: 'status',
                                label: t('general.status'),
                                children: statusTag(),
                            },
                            {
                                key: 'riskLevel',
                                label: t('audit.exec_command.risk_level'),
                                children: riskTag,
                            },
                            {
                                key: 'exitCode',
                                label: t('audit.exec_command.exit_code'),
                                children: record.exitCode,
                            },
                            {
                                key: 'durationMs',
                                label: t('audit.exec_command.duration_ms'),
                                children: record.durationMs,
                            },
                            {
                                key: 'startedAt',
                                label: t('audit.exec_command.started_at'),
                                children: record.startedAt ? dayjs(record.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                            },
                        ]}
                    />
                    <div className="mt-4 min-w-0">
                        <Text strong>{t('audit.exec_command.command')}</Text>
                        <pre className="mt-2 max-h-28 w-full max-w-full overflow-auto whitespace-pre-wrap break-all rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-black/20">{record.command || '-'}</pre>
                    </div>
                    <div className="mt-4 min-w-0">
                        <Text strong>{t('audit.exec_command.result')}</Text>
                        <pre className="mt-2 max-h-80 w-full max-w-full overflow-auto whitespace-pre rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-black/20">{record.result || '-'}</pre>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default RemoteExecCommandDetailModal;
