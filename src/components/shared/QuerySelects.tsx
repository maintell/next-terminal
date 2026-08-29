import React from 'react';
import {useTranslation} from "react-i18next";
import {Select, TreeSelect} from "antd";
import userApi, {User} from "@/api/user-api";
import departmentApi from "@/api/department-api";
import assetApi, {Asset} from "@/api/asset-api";
import websiteApi, {Website} from "@/api/website-api";
import databaseAssetApi, {DatabaseAsset} from "@/api/database-asset-api";
import {useQuery} from "@tanstack/react-query";

interface SelectProps {
    value?: any;
    onChange?: (value: any) => void;
    style?: React.CSSProperties;
    mode?: 'multiple' | 'tags';
    [key: string]: any;
}

const selectStyle = (style?: React.CSSProperties) => ({
    minWidth: 200,
    ...style,
});

const setTreeValue = (nodes: any[] = []): any[] => nodes.map(node => ({
    ...node,
    value: node.value ?? node.key,
    children: node.children ? setTreeValue(node.children) : undefined,
}));

const buildGroupTree = (nodes: any[] = []): any[] => nodes.flatMap(node => {
    const children = node.children ? buildGroupTree(node.children) : undefined;
    if (node.key === 'default') {
        return children || [];
    }
    return [{
        ...node,
        value: node.value ?? node.key,
        children,
    }];
});

const buildAssetTree = (nodes: any[] = []): any[] => nodes.map(node => {
    const isLeaf = node.isLeaf;
    return {
        ...node,
        value: node.value ?? node.key,
        disabled: !isLeaf,
        children: node.children ? buildAssetTree(node.children) : undefined,
    };
});

const buildWebsiteTree = (nodes: Website[] = []): any[] => nodes.map(node => ({
    title: node.name,
    key: node.id,
    value: node.id,
    isLeaf: true,
}));

// 用户查询组件
export const UserSelect = ({value, onChange, style, mode, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'users'],
        queryFn: userApi.getAll,
    });

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.identity.submenus.user')}
            mode={mode}
            allowClear
            showSearch={{
                filterOption: (input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()),
            }}
            loading={query.isPending}
            options={(query.data ?? []).map((user: User) => ({
                label: user.nickname || user.username,
                value: user.id,
            }))}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 部门树查询组件
export const DepartmentTreeSelect = ({value, onChange, style, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'department-tree'],
        queryFn: async () => setTreeValue(await departmentApi.getTree()),
        refetchOnWindowFocus: false,
    });

    return (
        <TreeSelect
            value={value}
            onChange={onChange}
            placeholder={t('menus.identity.submenus.department')}
            allowClear
            showSearch={{treeNodeFilterProp: 'title'}}
            treeDefaultExpandAll
            loading={query.isPending}
            treeData={query.data || []}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 资产组树查询组件
export const AssetGroupTreeSelect = ({value, onChange, style, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'asset-group-tree'],
        queryFn: async () => buildGroupTree(await assetApi.getGroups()),
        refetchOnWindowFocus: false,
    });

    return (
        <TreeSelect
            value={value}
            onChange={onChange}
            placeholder={t('authorised.label.asset_group')}
            allowClear
            showSearch={{treeNodeFilterProp: 'title'}}
            treeDefaultExpandAll
            loading={query.isPending}
            treeData={query.data || []}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 资产查询组件
export const AssetSelect = ({value, onChange, style, mode, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'assets'],
        queryFn: () => assetApi.getAll(),
    });

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.asset')}
            mode={mode}
            allowClear
            showSearch={{
                filterOption: (input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()),
            }}
            loading={query.isPending}
            options={(query.data ?? []).map((asset: Asset) => ({label: asset.name, value: asset.id}))}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 资产树查询组件
export const AssetTreeSelect = ({value, onChange, style, ...rest}: SelectProps & {protocol?: string}) => {
    const {t} = useTranslation();
    const protocol = rest.protocol;
    const query = useQuery({
        queryKey: ['shared-query-selects', 'asset-tree', protocol],
        queryFn: async () => buildAssetTree(await assetApi.tree(protocol)),
        refetchOnWindowFocus: false,
    });
    const {protocol: _, ...treeSelectProps} = rest;

    return (
        <TreeSelect
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.asset')}
            allowClear
            showSearch={{treeNodeFilterProp: 'title'}}
            treeDefaultExpandAll
            loading={query.isPending}
            treeData={query.data || []}
            style={selectStyle(style)}
            {...treeSelectProps}
        />
    );
};

// 网站组树查询组件
export const WebsiteGroupTreeSelect = ({value, onChange, style, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'website-group-tree'],
        queryFn: async () => buildGroupTree(await websiteApi.getGroups()),
        refetchOnWindowFocus: false,
    });

    return (
        <TreeSelect
            value={value}
            onChange={onChange}
            placeholder={t('authorised.label.website_group')}
            allowClear
            showSearch={{treeNodeFilterProp: 'title'}}
            treeDefaultExpandAll
            loading={query.isPending}
            treeData={query.data || []}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 数据库资产查询组件
export const DatabaseAssetSelect = ({value, onChange, style, mode, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'database-assets'],
        queryFn: () => databaseAssetApi.getAll(),
    });

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.database_asset')}
            mode={mode}
            allowClear
            showSearch={{
                filterOption: (input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()),
            }}
            loading={query.isPending}
            options={(query.data ?? []).map((asset: DatabaseAsset) => ({label: asset.name, value: asset.id}))}
            style={selectStyle(style)}
            {...rest}
        />
    );
};

// 网站树查询组件
export const WebsiteTreeSelect = ({value, onChange, style, ...rest}: SelectProps) => {
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['shared-query-selects', 'website-tree'],
        queryFn: async () => buildWebsiteTree(await websiteApi.getAll()),
        refetchOnWindowFocus: false,
    });

    return (
        <TreeSelect
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.website')}
            allowClear
            showSearch={{treeNodeFilterProp: 'title'}}
            treeDefaultExpandAll
            loading={query.isPending}
            treeData={query.data || []}
            style={selectStyle(style)}
            {...rest}
        />
    );
};
