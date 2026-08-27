import {Alert, Space} from "antd";
import {useTranslation} from "react-i18next";
import AccessPolicyBindingEditor from "./AccessPolicyBindingEditor";

interface DepartmentAccessPolicyProps {
    active: boolean;
    departmentId: string;
}

const DepartmentAccessPolicy = ({active, departmentId}: DepartmentAccessPolicyProps) => {
    const {t} = useTranslation();

    return (
        <Space orientation="vertical" size="middle">
            <Alert type="info" showIcon title={t('identity.policy.department_binding_tip')}/>
            <AccessPolicyBindingEditor
                active={active}
                subjectType="department"
                subjectId={departmentId}
            />
        </Space>
    );
};

export default DepartmentAccessPolicy;
