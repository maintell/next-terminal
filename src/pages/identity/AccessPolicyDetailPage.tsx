import {useState} from 'react';
import {Tabs} from "antd";
import {useParams, useSearchParams} from "react-router-dom";
import AccessPolicyInfo from "./AccessPolicyInfo";
import AccessPolicyBindings from "./AccessPolicyBindings";
import {useTranslation} from "react-i18next";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import AccessPolicyRules from "./AccessPolicyRules";

const AccessPolicyDetailPage = () => {
    let {t} = useTranslation();
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
    let params = useParams();
    const groupId = params['groupId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = searchParams.get('activeKey');
    key = key ? key : 'rules';

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('identity.policy.rules'),
            key: 'rules',
            children: <AccessPolicyRules active={activeKey === 'rules'} groupId={groupId}/>
        },
        {
            label: t('actions.detail'),
            key: 'detail',
            children: <AccessPolicyInfo active={activeKey === 'detail'} id={groupId}/>
        },
        {
            label: t('identity.policy.binding_targets'),
            key: 'bindings',
            children: <AccessPolicyBindings active={activeKey === 'bindings'} id={groupId}/>
        },
    ];

    return (
        <div className="px-4">
            <Disabled disabled={!hasPremiumFeatures}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
            </Disabled>
        </div>
    );
};

export default AccessPolicyDetailPage;
