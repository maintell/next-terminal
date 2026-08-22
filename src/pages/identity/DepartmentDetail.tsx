import {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import DepartmentInfo from "./DepartmentInfo";
import DepartmentAccessPolicy from "./DepartmentAccessPolicy";
import {maybe} from "../../utils/maybe";
import {useTranslation} from "react-i18next";

const DepartmentDetail = () => {
    let params = useParams();
    const id = params['departmentId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'detail');

    let [activeKey, setActiveKey] = useState(key);

    let {t} = useTranslation();

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'detail',
            children: <DepartmentInfo active={activeKey === 'detail'} id={id}/>
        },
        {
            label: t('identity.options.access_policy'),
            key: 'access-policy',
            children: <DepartmentAccessPolicy active={activeKey === 'access-policy'} departmentId={id}/>
        }
    ];

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
        </div>
    );
};

export default DepartmentDetail;
