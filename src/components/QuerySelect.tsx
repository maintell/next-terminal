import type {SelectProps} from 'antd';
import {Select} from 'antd';
import {useSelectRequest} from '@/hook/use-antd-form-query';

type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown> | QueryKeyPart[];

type QuerySelectRequestProps = {
    request: (params?: Record<string, any>) => Promise<any[]>;
    queryKey: QueryKeyPart[];
};

type QuerySelectStaticProps = {
    request?: undefined;
    queryKey?: QueryKeyPart[];
};

type QuerySelectProps = SelectProps & (QuerySelectRequestProps | QuerySelectStaticProps) & {
    params?: Record<string, any>;
};

const QuerySelect = ({request, params, queryKey, options, loading, optionFilterProp = 'label', ...props}: QuerySelectProps) => {
    const query = useSelectRequest(
        ['query-select', ...(queryKey ?? [])],
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
