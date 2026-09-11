import {useEffect, useState, type Key} from 'react';
import {useMutation, useQuery} from "@tanstack/react-query";
import portalApi, {AssetAccessMode, AssetUser} from "@/api/portal-api";
import strings from "@/utils/strings";
import {useTranslation} from "react-i18next";
import {safeEncode} from "@/utils/codec";
import {checkItemInGroups, findNode, getAllKeys, getGroupAndChildIds} from './utils/facade-utils';
import FacadeCompactSearch from './components/FacadeCompactSearch';
import FacadeGroupTree from './components/FacadeGroupTree';
import FacadeCardSkeleton from './components/FacadeCardSkeleton';
import FacadeResourceDetailModal from './components/FacadeResourceDetailModal';
import {App, Button, Empty, Segmented, Tooltip} from "antd";
import {getProtocolColor} from "@/helper/asset-helper";
import FacadeLogo from "@/pages/facade/components/FacadeLogo";
import {ArrowUpRight, ExternalLink, Eye, FileDown, LayoutGrid, List} from "lucide-react";
import {browserDownload} from "@/utils/utils";
import MultiFactorAuthentication from '@/pages/account/MultiFactorAuthentication';

type AssetViewMode = 'list' | 'card';

const ASSET_VIEW_MODE_STORAGE_KEY = 'facade.asset.viewMode';

const getInitialAssetViewMode = (): AssetViewMode => {
    try {
        const value = localStorage.getItem(ASSET_VIEW_MODE_STORAGE_KEY);
        if (value === 'list' || value === 'card') {
            return value;
        }
    } catch {
    }
    return 'list';
};

const AssetFacadePage = () => {

    let {t} = useTranslation();
    const {message} = App.useApp();
    let [search, setSearch] = useState<string>('');
    let [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    let [viewMode, setViewMode] = useState<AssetViewMode>(getInitialAssetViewMode);
    const [rdpMfaOpen, setRdpMfaOpen] = useState(false);
    const [pendingRdpAssetId, setPendingRdpAssetId] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetUser>();

    let queryAssets = useQuery({
        queryKey: ['my-assets'],
        queryFn: () => portalApi.assets(),
        staleTime: 5 * 60 * 1000,     // 5 分钟
        gcTime: 10 * 60 * 1000,       // 缓存 10 分钟
    });

    let queryAssetGroupTree = useQuery({
        queryKey: ['my-assets-group-tree'],
        queryFn: () => portalApi.getAssetsGroupTree(),
        staleTime: 10 * 60 * 1000,    // 10 分钟(分组变化较少)
    });

    let queryAccessPreferences = useQuery({
        queryKey: ['access-preferences'],
        queryFn: () => portalApi.getAccessPreferences(),
        staleTime: 5 * 60 * 1000,
    });

    const createRdpProxyTicketMutation = useMutation({
        mutationFn: ({assetId, securityToken}: {assetId: string; securityToken?: string}) =>
            portalApi.createRdpProxyTicket(assetId, securityToken),
        onSuccess: (ticket) => {
            browserDownload(ticket.rdpFileUrl);
        },
        onError: (error: any) => {
            if (error?.code === 10027) {
                setRdpMfaOpen(true);
                return;
            }
            message.error(error?.message || t('general.failed'));
        }
    });

    const handleRdpProxyAccess = (assetId: string) => {
        setPendingRdpAssetId(assetId);
        createRdpProxyTicketMutation.mutate({assetId});
    };

    useEffect(() => {
        if (queryAssetGroupTree.data) {
            const allExpandedKeys = getAllKeys(queryAssetGroupTree.data);
            if (allExpandedKeys.length > 0) {
                setExpandedKeys(allExpandedKeys);
            }
        }
    }, [queryAssetGroupTree.data]);

    let filteredAssets = queryAssets.data ?? [];
    const searchValue = search.trim().toLowerCase();

    // 按分组过滤
    if (selectedGroupKey && selectedGroupKey !== '' && queryAssetGroupTree.data) {
        const groupIds = getGroupAndChildIds(queryAssetGroupTree.data, selectedGroupKey);
        filteredAssets = filteredAssets.filter(item => checkItemInGroups(item.groupId, groupIds));
    }

    // 按搜索关键词过滤
    if (strings.hasText(searchValue)) {
        filteredAssets = filteredAssets.filter(item => {
            if (item.name.toLowerCase().includes(searchValue)) {
                return true;
            }
            if (item.alias && item.alias.toLowerCase().includes(searchValue)) {
                return true;
            }
            if (item.address.toLowerCase().includes(searchValue)) {
                return true;
            }
            if (item.protocol.toLowerCase().includes(searchValue)) {
                return true;
            }
            return item.tags?.some(tag => tag.toLowerCase().includes(searchValue));
        });
    }

    const selectedGroup = selectedGroupKey && queryAssetGroupTree.data
        ? findNode(queryAssetGroupTree.data, selectedGroupKey)
        : null;
    const selectedAssetGroup = selectedAsset && queryAssetGroupTree.data
        ? findNode(queryAssetGroupTree.data, selectedAsset.groupId)
        : null;

    const buildAccessHref = (item: AssetUser) => {
        const id = item.id;
        const protocol = item.protocol?.toLowerCase();
        const accessMode: AssetAccessMode = queryAccessPreferences.data?.assetAccessMode || 'access-page';

        if (protocol === 'http') {
            return `/browser?websiteId=${id}&t=${new Date().getTime()}`;
        }
        if (accessMode === 'standalone-page') {
            return `/standalone-access?assetId=${id}&protocol=${protocol}&t=${new Date().getTime()}`;
        }
        const msg = {
            id: id,
            name: item.name,
            protocol: protocol,
            status: item.status,
            wolEnabled: item.attrs?.['wol-enabled'] || false,
        };
        return `/access?asset=${safeEncode(msg)}`;
    };

    const handleViewModeChange = (value: string | number) => {
        const nextViewMode = value as AssetViewMode;
        setViewMode(nextViewMode);
        try {
            localStorage.setItem(ASSET_VIEW_MODE_STORAGE_KEY, nextViewMode);
        } catch {
        }
    };

    const renderAssetRow = (item: AssetUser) => {
        const isInactive = item.status === 'inactive';

        return (
            <div
                key={item.id}
                className={`group flex min-h-16 items-center gap-3 border-b border-slate-100 px-3 py-3 transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40 ${isInactive ? 'grayscale' : ''}`}
            >
                <div>
                    <FacadeLogo
                        name={item.name}
                        logo={item.logo}
                        protocol={item.protocol}
                        borderless
                    />
                </div>
                <div className={'min-w-0 flex-1'}>
                    <div className={'flex min-w-0 items-center gap-2'}>
                        <Tooltip title={item.name}>
                            <div className={'truncate text-sm font-semibold text-slate-900 dark:text-slate-100'}>
                                {item.name}
                            </div>
                        </Tooltip>
                        <span className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${getProtocolColor(item.protocol) || 'bg-slate-400'}`}>
                            {item.protocol}
                        </span>
                    </div>
                    {item.alias && <div className={'mt-1 truncate text-xs text-slate-500 dark:text-slate-400'}>{item.alias}</div>}
                </div>
                <div className={'flex flex-none items-center gap-1'}>
                    <Button type={'text'} size={'small'} icon={<Eye className={'h-3.5 w-3.5'} />} onClick={() => setSelectedAsset(item)}>
                        {t('actions.detail')}
                    </Button>
                    <Button
                        type={'link'}
                        size={'small'}
                        href={buildAccessHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                        iconPlacement={'end'}
                    >
                        {t('assets.access')}
                    </Button>
                </div>
            </div>
        );
    };

    const renderAssetCard = (item: AssetUser) => {
        const isInactive = item.status === 'inactive';

        return (
            <div
                key={item.id}
                className={`group relative flex min-h-32 flex-col rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-[box-shadow,border-color] hover:shadow-md hover:ring-slate-300 dark:bg-[#141414] dark:ring-slate-700/70 dark:hover:ring-slate-600 ${isInactive ? 'grayscale' : ''}`}
            >
                <span className={`absolute right-4 top-4 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${getProtocolColor(item.protocol) || 'bg-slate-400'}`}>
                    {item.protocol}
                </span>
                <div className={'flex items-start gap-3'}>
                    <FacadeLogo
                        name={item.name}
                        logo={item.logo}
                        protocol={item.protocol}
                        borderless
                        size={'small'}
                    />
                    <div className={'min-w-0 flex-1 pr-14'}>
                        <div className={'flex min-w-0 items-center gap-2'}>
                            <Tooltip title={item.name}>
                                <div className={'truncate text-sm font-semibold text-slate-900 dark:text-slate-100'}>
                                    {item.name}
                                </div>
                            </Tooltip>
                        </div>
                        {item.alias && (
                            <Tooltip title={item.alias}>
                                <div className={'mt-1 truncate text-xs text-slate-500 dark:text-slate-400'}>{item.alias}</div>
                            </Tooltip>
                        )}
                    </div>
                </div>
                <div className={'flex-1'} />
                <div className={'mt-5 flex items-center justify-between'}>
                    <button
                        type={'button'}
                        className={'cursor-pointer text-xs text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200'}
                        onClick={() => setSelectedAsset(item)}
                    >
                        {t('actions.detail')}
                    </button>
                    <a
                        href={buildAccessHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={'inline-flex h-8 items-center gap-1 rounded-md bg-slate-100 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'}
                    >
                        {t('assets.access')}
                        <ArrowUpRight className={'h-3.5 w-3.5'} />
                    </a>
                </div>
            </div>
        );
    };

    return (
        <div className={'min-h-full px-4 py-5 lg:px-20 lg:py-6'}>
            <div className={'mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'}>
                <div className={'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center'}>
                    <div className={'truncate text-lg font-semibold leading-7 text-slate-900 dark:text-slate-100'}>
                        {t('menus.resource.submenus.asset')}
                    </div>
                    <div className={'w-full sm:w-72 lg:w-80'}>
                        <FacadeCompactSearch
                            value={search}
                            onChange={setSearch}
                            placeholder={t('facade.asset_placeholder')}
                        />
                    </div>
                    {selectedGroup && (
                        <span className={'inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-200'}>
                            {t('assets.group')} · {selectedGroup.title}
                        </span>
                    )}
                </div>
                <Segmented
                    value={viewMode}
                    onChange={handleViewModeChange}
                    options={[
                        {
                            value: 'list',
                            label: (
                                <span className={'inline-flex items-center gap-1.5'}>
                                    <List className={'h-3.5 w-3.5'} />
                                    <span>{t('facade.list_view')}</span>
                                </span>
                            ),
                        },
                        {
                            value: 'card',
                            label: (
                                <span className={'inline-flex items-center gap-1.5'}>
                                    <LayoutGrid className={'h-3.5 w-3.5'} />
                                    <span>{t('facade.card_view')}</span>
                                </span>
                            ),
                        },
                    ]}
                />
            </div>

            <div className={'grid lg:grid-cols-[240px_1fr] gap-4'}>
                {/* 分组树 */}
                <FacadeGroupTree
                    title={t('assets.group')}
                    treeData={queryAssetGroupTree.data}
                    selectedKey={selectedGroupKey}
                    onSelect={setSelectedGroupKey}
                    expandedKeys={expandedKeys}
                    onExpand={setExpandedKeys}
                    loading={queryAssetGroupTree.isLoading}
                    variant={'plain'}
                />

                {/* 资产列表 */}
                <div>
                    {queryAssets.isLoading ? (
                        <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                            <FacadeCardSkeleton count={8}/>
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <Empty/>
                    ) : viewMode === 'card' ? (
                        <div className={'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}>
                            {filteredAssets.map(item => renderAssetCard(item))}
                        </div>
                    ) : (
                        <div className={'overflow-hidden bg-white dark:bg-[#141414]'}>
                            {filteredAssets.map(item => renderAssetRow(item))}
                        </div>
                    )}
                </div>
            </div>
            <MultiFactorAuthentication
                open={rdpMfaOpen}
                handleOk={(securityToken) => {
                    setRdpMfaOpen(false);
                    createRdpProxyTicketMutation.mutate({assetId: pendingRdpAssetId, securityToken});
                }}
                handleCancel={() => {
                    setRdpMfaOpen(false);
                    setPendingRdpAssetId('');
                }}
            />
            <FacadeResourceDetailModal
                open={Boolean(selectedAsset)}
                resource={selectedAsset}
                resourceType={'asset'}
                groupName={selectedAssetGroup?.title}
                onClose={() => setSelectedAsset(undefined)}
                actions={selectedAsset ? <>
                    {selectedAsset.protocol?.toLowerCase() === 'rdp' && queryAccessPreferences.data?.rdpProxyEnabled === true && (
                        <Button
                            icon={<FileDown className={'h-4 w-4'} />}
                            loading={createRdpProxyTicketMutation.isPending && createRdpProxyTicketMutation.variables?.assetId === selectedAsset.id}
                            onClick={() => handleRdpProxyAccess(selectedAsset.id)}
                        >
                            {t('assets.rdp_proxy_access')}
                        </Button>
                    )}
                    <Button
                        href={buildAccessHref(selectedAsset)}
                        target={'_blank'}
                        rel={'noopener noreferrer'}
                        icon={<ExternalLink className={'h-4 w-4'} />}
                        iconPlacement={'end'}
                    >
                        {t('assets.access')}
                    </Button>
                </> : undefined}
            />
        </div>
    );
};

export default AssetFacadePage;
