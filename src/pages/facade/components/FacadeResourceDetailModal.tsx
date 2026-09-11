import type {AssetUser, WebsiteUser} from '@/api/portal-api';
import {getProtocolColor} from '@/helper/asset-helper';
import {Descriptions, Modal, Tag, Tooltip, type DescriptionsProps} from 'antd';
import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import FacadeLogo from './FacadeLogo';

interface FacadeResourceDetailModalProps {
    open: boolean;
    resource?: AssetUser | WebsiteUser;
    resourceType: 'asset' | 'website';
    groupName?: string;
    actions?: ReactNode;
    onClose: () => void;
}

const renderTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) {
        return '-';
    }
    return (
        <div className={'flex flex-wrap gap-1.5'}>
            {tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
        </div>
    );
};

const FacadeResourceDetailModal = ({
    open,
    resource,
    resourceType,
    groupName,
    actions,
    onClose,
}: FacadeResourceDetailModalProps) => {
    const {t} = useTranslation();
    const asset = resourceType === 'asset' ? resource as AssetUser | undefined : undefined;
    const statusText = asset?.status === 'active'
        ? t('general.online')
        : asset?.status === 'testing'
            ? t('assets.testing')
            : t('general.offline');

    const items: DescriptionsProps['items'] = resource ? [
        ...(asset?.alias ? [{key: 'alias', label: t('assets.alias'), children: asset.alias}] : []),
        ...(asset ? [{
            key: 'address',
            label: t('assets.addr'),
            children: <span className={'break-all font-mono'}>{asset.address || '-'}</span>,
        }] : []),
        {key: 'protocol', label: t('assets.protocol'), children: resource.protocol.toUpperCase()},
        {key: 'group', label: t('assets.group'), children: groupName || t('assets.default_group')},
        ...(asset ? [{
            key: 'status',
            label: t('general.status'),
            children: statusText,
        }] : []),
        ...(asset?.statusText ? [{key: 'statusText', label: t('facade.status_detail'), children: asset.statusText}] : []),
        {key: 'description', label: t('general.description'), children: resource.description || '-'},
        {key: 'tags', label: t('assets.tags'), children: renderTags(resource.tags)},
        ...(asset && asset.users?.length > 0 ? [{
            key: 'users',
            label: t('facade.current_users'),
            children: asset.users.join('、'),
        }] : []),
    ] : [];

    return (
        <Modal
            title={t('actions.detail')}
            open={open}
            onCancel={onClose}
            width={560}
            mask={{closable: true}}
            destroyOnHidden
            footer={actions ? <div className={'flex justify-end gap-2'}>{actions}</div> : null}
        >
            {resource && (
                <div className={'flex flex-col gap-6 mt-4'}>
                    <div className={'flex items-center gap-3'}>
                        <FacadeLogo name={resource.name} logo={resource.logo} protocol={resource.protocol} borderless />
                        <div className={'min-w-0 flex-1'}>
                            <div className={'flex items-center gap-2'}>
                                <Tooltip title={resource.name}>
                                    <div className={'truncate text-base font-semibold text-slate-900 dark:text-slate-100'}>
                                        {resource.name}
                                    </div>
                                </Tooltip>
                            </div>
                            <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${getProtocolColor(resource.protocol) || 'bg-slate-400'}`}>
                                {resource.protocol}
                            </span>
                        </div>
                    </div>
                    <Descriptions column={1} size={'small'} items={items} />
                </div>
            )}
        </Modal>
    );
};

export default FacadeResourceDetailModal;
