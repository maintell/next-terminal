import type {SelectProps} from 'antd';
import {Select} from 'antd';
import {useSelectRequest} from '@/hook/use-antd-form-query';

type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown> | QueryKeyPart[];

type QuerySelectProps = SelectProps & {
    request?: (params?: Record<string, any>) => Promise<any[]>;
    params?: Record<string, any>;
    queryKey?: QueryKeyPart[];
};

const QuerySelect = ({request, params, queryKey, options, loading, optionFilterProp = 'label', ...props}: QuerySelectProps) => {
    const query = useSelectRequest(
        ['query-select', ...(queryKey ?? []), request?.toString()],
        request,
        params,
    );
    const showSearch = props.showSearch
        ? {
            ...(typeof props.showSearch === 'object' ? props.showSearch : {}),
            optionFilterProp,
        }
        : props.showSearch;

    return (
        <Select
            {...props}
            loading={loading ?? query.isFetching}
            showSearch={showSearch}
            options={options ?? query.data ?? []}
        />
    );
};

export default QuerySelect;
