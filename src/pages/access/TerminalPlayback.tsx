import { useEffect,useRef,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { baseUrl } from "@/api/core/requests";
import sessionApi,{ SessionCommand } from "@/api/session-api";
import IPRegion from "@/components/IPRegion";
import sessionCommandApi from "@/api/session-command-api";
import times from "@/components/time/times";
import { maybe } from "@/utils/maybe";
import { renderSize } from "@/utils/utils";
import { StyleProvider } from '@ant-design/cssinjs';
import { useQuery } from "@tanstack/react-query";
import { Button,ConfigProvider,Descriptions,Drawer,Table,Tabs,TabsProps,theme,type TableColumnsType } from "antd";
import * as AsciinemaPlayer from 'asciinema-player';
import 'asciinema-player/dist/bundle/asciinema-player.css';
import { TerminalSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import './TerminalPlayback.css';

const TerminalPlayback = () => {

    let {t} = useTranslation();

    const [searchParams] = useSearchParams();
    const sessionId = maybe(searchParams.get('sessionId'), '');

    let [open, setOpen] = useState(false);
    const playerRef = useRef<ReturnType<typeof AsciinemaPlayer.create>>(null);
    const playerElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let url = `${baseUrl()}/admin/sessions/${sessionId}/recording`;
        const player = AsciinemaPlayer.create(url, playerElementRef.current, {
            fit: 'both',
            autoPlay: true,
            terminalFontFamily: 'monaco, Consolas, "Lucida Console", monospace'
        });
        playerRef.current = player;
        return () => {
            playerRef.current = null;
            player.dispose();
        }
    }, [sessionId]);

    let sessionQuery = useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => sessionApi.getById(sessionId),
        enabled: !!sessionId,
    });

    let cmdQuery = useQuery({
        queryKey: ['session-commands', sessionId],
        queryFn: () => {
            return sessionCommandApi.getPaging({
                pageIndex: 1,
                pageSize: 1000,
                sessionId: sessionId,
                sortField: "createdAt",
                sortOrder: "asc",
            })
        },
        enabled: !!sessionId,
    });
    const session = sessionQuery.data;
    const cmds = cmdQuery.data?.items ?? [];

    const cmdColumns: TableColumnsType<SessionCommand> = [
        {
            title: t('sysops.logs.exec_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            width: 170,
            render: (text) => {
                return times.format(text);
            }
        },
        {
            title: t('sysops.command'),
            dataIndex: 'command',
            ellipsis: true,
        },
    ];

    const items: TabsProps['items'] = [
        {
            key: 'cmd',
            label: t('sysops.command'),
            children: <Table
                // virtual
                rowKey={'path'}
                columns={cmdColumns}
                // scroll={{y: window.innerHeight - 210, x: 'auto'}}
                dataSource={cmds}
                size={'small'}
                pagination={false}
                loading={cmdQuery.isFetching}
                onRow={(cmd, _index) => {
                    return {
                        onClick: () => {
                            let connected = session?.connectedAt ? session?.connectedAt : 0;
                            let pos = (cmd.createdAt - connected) / 1000;
                            playerRef.current?.seek(Math.max(0, pos - 0.5));
                        }
                    }
                }}
            />,
        },
        {
            key: 'info',
            label: t('actions.detail'),
            children: <Descriptions
                column={1}
                items={[
                    {
                        key: 'clientIp',
                        label: t('audit.client_ip'),
                        children: <IPRegion ip={session?.clientIp} regionInfo={session?.regionInfo}/>,
                    },
                    {
                        key: 'userAccount',
                        label: t('menus.identity.submenus.user'),
                        children: session?.userAccount,
                    },
                    {
                        key: 'assetName',
                        label: t('menus.resource.submenus.asset'),
                        children: session?.assetName,
                    },
                    {
                        key: 'addr',
                        label: t('assets.addr'),
                        children: `${session?.protocol} ${session?.username}@${session?.ip}:${session?.port}`,
                    },
                    {
                        key: 'connectedAt',
                        label: t('audit.connected_at'),
                        children: times.format(session?.connectedAt),
                    },
                    {
                        key: 'disconnectedAt',
                        label: t('audit.disconnected_at'),
                        children: times.format(session?.disconnectedAt),
                    },
                    {
                        key: 'connectionDuration',
                        label: t('audit.connection_duration'),
                        children: session?.connectionDuration,
                    },
                    {
                        key: 'recordingSize',
                        label: t('audit.recording_size'),
                        children: renderSize(session?.recordingSize),
                    },
                ]}/>,
        },
    ];

    return (
        <div className={'fixed inset-0 flex items-center justify-center overflow-hidden bg-[#191919]'}>
            <div
                ref={playerElementRef}
                className={'w-full h-full overflow-hidden'}
            />

            <div className={'absolute top-5 right-5 z-10'}>
                <Button
                        type={'link'}
                        size={'small'}
                        onClick={() => setOpen(true)}>
                    <TerminalSquare className="h-4 w-4"/>
                </Button>
            </div>

            <ConfigProvider theme={{
                algorithm: theme.darkAlgorithm,
                components: {
                    Drawer: {
                        paddingLG: 16
                    },
                    Table: {
                        cellPaddingBlockSM: 6,
                        headerBorderRadius: 4,
                    }
                }
            }}>
                <StyleProvider hashPriority="high">
                    <Drawer title={t('actions.detail')}
                            placement="right"
                            onClose={() => setOpen(false)}
                            open={open}
                            mask={false}
                            size={400}
                    >
                        <Tabs defaultActiveKey="cmd" items={items}/>
                    </Drawer>
                </StyleProvider>
            </ConfigProvider>
        </div>

    );
};

export default TerminalPlayback;
