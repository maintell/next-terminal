import {Form, TreeSelect} from 'antd';
import type {FormItemProps} from 'antd';
import {useSelectRequest} from '@/hook/use-antd-form-query';

type RequestParams = Record<string, any>;

interface ProFormTreeSelectProps extends Omit<FormItemProps, 'children'> {
    allowClear?: boolean;
    disabled?: boolean;
    fieldProps?: Record<string, any>;
    params?: RequestParams;
    placeholder?: string;
    request?: (params?: RequestParams) => Promise<any[]>;
    queryKey?: (string | number | boolean | null | undefined | Record<string, unknown>)[];
}

const ProFormTreeSelect = ({
    allowClear,
    disabled,
    fieldProps,
    params,
    placeholder,
    request,
    queryKey,
    ...formItemProps
}: ProFormTreeSelectProps) => {
    const query = useSelectRequest(['pro-form-tree-select', ...(queryKey ?? [])], request, params);

    return (
        <Form.Item {...formItemProps}>
            <TreeSelect
                allowClear={allowClear ?? fieldProps?.allowClear}
                disabled={disabled}
                loading={query.isFetching}
                placeholder={placeholder}
                variant={fieldProps?.variant}
                {...fieldProps}
                showSearch={fieldProps?.showSearch ? {
                    ...(typeof fieldProps.showSearch === 'object' ? fieldProps.showSearch : {}),
                    treeNodeFilterProp: 'title',
                } : fieldProps?.showSearch}
                treeData={fieldProps?.treeData ?? query.data ?? []}
            />
        </Form.Item>
    );
};

export default ProFormTreeSelect;
