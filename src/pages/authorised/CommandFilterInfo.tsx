import commandFilterApi from "../../api/command-filter-api.js";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {Descriptions, Spin} from "antd";
import times from "@/components/time/times";

const api = commandFilterApi;

interface Props {
    id: string
}

const CommandFilterInfo = ({id}: Props) => {

    let {t} = useTranslation();
    const commandFilterQuery = useQuery({
        queryKey: ['command-filter', id],
        queryFn: () => api.getById(id),
        enabled: !!id,
    });

    const commandFilter = commandFilterQuery.data;

    return (
        <div className={'page-detail-info'}>
            <Spin spinning={commandFilterQuery.isLoading}>
                <Descriptions
                    column={1}
                    items={[
                        {
                            key: 'name',
                            label: t('general.name'),
                            children: commandFilter?.name,
                        },
                        {
                            key: 'created-at',
                            label: t('general.created_at'),
                            children: commandFilter?.createdAt ? times.format(commandFilter.createdAt) : '-',
                        },
                    ]}
                />
            </Spin>
        </div>
    );
};

export default CommandFilterInfo;
