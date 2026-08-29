import portalApi from "@/api/portal-api";
import { getImgColor } from "@/helper/asset-helper";
import { useQuery } from "@tanstack/react-query";
import { Input,Modal,Tree,TreeDataNode,TreeProps } from "antd";
import clsx from "clsx";
import { type Key,useEffect,useState } from 'react';
import { useTranslation } from "react-i18next";

interface Props {
    open: boolean;
    handleOk: (values: string[]) => void
    handleCancel: () => void
}

interface TreeDataNodeWithExtra extends TreeDataNode {
    extra?: {
        logo?: string;
        protocol?: string;
    };
    children?: TreeDataNodeWithExtra[];
}

const AccessSshChooser = ({handleOk, handleCancel, open}: Props) => {

    let {t} = useTranslation();
    let [keyword, setKeyword] = useState('');
    let treeQuery = useQuery({
        queryKey: ['ssh', 'chooser', keyword],
        queryFn: () => {
            return portalApi.getAssetsTree('ssh', keyword)
        },
        enabled: open === true,
    });

    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    const [sshAssetKeys, setSshAssetKeys] = useState<string[]>([]);

    useEffect(() => {
        setSshAssetKeys([]);
    }, [open]);

    const getAllKeys = (data: TreeDataNode[]) => {
        let keys: Key[] = [];
        data.forEach((item) => {
            keys.push(item.key);
            if (item.children) {
                keys = keys.concat(getAllKeys(item.children));
            }
        });
        return keys;
    };

    useEffect(() => {
        if (treeQuery.data) {
            let keys1 = getAllKeys(treeQuery.data);
            setExpandedKeys(keys1);
        }
    }, [treeQuery.data]);

    const onCheck: TreeProps['onCheck'] = (_checkedKeysValue, {checkedNodes}) => {
        let keys = checkedNodes.filter(item => item.isLeaf).map((item) => item.key);
        setSshAssetKeys(keys as string[]);
    };

    return (
        <div>
            <Modal
                title={t('access.batch.choose_asset')}
                open={open}
                mask={{closable: false}}
                destroyOnHidden={true}
                onOk={() => {
                    handleOk(sshAssetKeys);
                }}
                onCancel={() => {
                    handleCancel();
                }}
            >
                <div className={'space-y-4'}>
                    <Input.Search
                        allowClear
                        placeholder={t('general.search_placeholder')}
                        onSearch={(value) => setKeyword(value.trim())}
                    />

                    <Tree
                        titleRender={(node) => {
                            const item = node as TreeDataNodeWithExtra;
                            return <span className={'flex items-center gap-1'}>
                                    {item.extra?.logo ?
                                        <img className={'h-4 w-4'} src={item.extra?.logo} alt={'logo'}/>
                                        :
                                        <div
                                            className={clsx(`w-4 h-4 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor(item.extra?.protocol ?? ''))}>
                                        </div>
                                    }
                                <span>
                                        {typeof item.title === 'function' ? '' : item.title}
                                    </span>
                                </span>
                        }}
                        treeData={treeQuery.data ?? []}
                        onExpand={setExpandedKeys}
                        expandedKeys={expandedKeys}
                        checkable={true}
                        onCheck={onCheck}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default AccessSshChooser;
