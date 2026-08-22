import {useLicense} from "@/hook/LicenseContext";
import {Spin, Tabs} from "antd";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import AccessPolicyDepartment from "./AccessPolicyDepartment";
import AccessPolicyUser from "./AccessPolicyUser";

interface AccessPolicyBindingsProps {
    active: boolean;
    id: string;
}

const AccessPolicyBindings = ({active, id}: AccessPolicyBindingsProps) => {
    const {t} = useTranslation();
    const {isLoading: licenseLoading} = useLicense();
    const [activeBindingType, setActiveBindingType] = useState('users');
    if (licenseLoading) {
        return <Spin/>;
    }

    return (
        <Tabs
            activeKey={activeBindingType}
            onChange={setActiveBindingType}
            items={[
                {
                    key: 'users',
                    label: t('identity.policy.bound_users'),
                    children: <AccessPolicyUser active={active && activeBindingType === 'users'} id={id}/>,
                },
                {
                    key: 'departments',
                    label: t('identity.policy.bound_departments'),
                    children: <AccessPolicyDepartment active={active && activeBindingType === 'departments'} id={id}/>,
                },
            ]}
        />
    );
};

export default AccessPolicyBindings;
