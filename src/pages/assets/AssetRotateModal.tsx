import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {useTranslation} from 'react-i18next';
import {Alert, Modal, Form, Select} from 'antd';
import {useMutation} from '@tanstack/react-query';
import credentialRotationApi, {RotationResult} from '@/api/credential-rotation-api';

const AssetRotateModal = ({
    open,
    handleCancel,
    assetIds,
    onSuccess,
}: Props) => {
    const {t} = useTranslation();
    const {license, isLoading} = useLicense();
    const hasPremiumFeatures = !isLoading && license.hasPremiumFeatures();
    const [form] = Form.useForm<{rotateType?: string}>();

    const mutation = useMutation({
        mutationFn: async (values: { rotateType?: string }) => {
            return await credentialRotationApi.rotateAssets(assetIds, values.rotateType);
        },
        onSuccess: (results) => {
            handleCancel();
            form.resetFields();
            onSuccess(results);
        },
    });

    return <Modal
        title={t('assets.rotation.batch_title')}
        open={open}
        mask={{closable: false}}
        destroyOnHidden={true}
        onCancel={() => {
            handleCancel();
            form.resetFields();
        }}
        footer={hasPremiumFeatures ? undefined : null}
        onOk={() => hasPremiumFeatures && form.validateFields().then(values => mutation.mutate(values))}
        confirmLoading={mutation.isPending}
    >
        <Disabled feature="credential_rotation" compact disabled={!hasPremiumFeatures}>
        <Alert
            title={t('assets.rotation.manual_warning')}
            type="warning"
            showIcon
        />
        <div className="h-3"/>
        <Form form={form} layout="vertical" initialValues={{rotateType: ''}}>
            <Form.Item label={t('assets.rotation.type_label')} name={'rotateType'}>
                <Select options={[
                    {label: t('assets.rotation.type.auto'), value: ''},
                    {label: t('assets.rotation.type.password'), value: 'password'},
                    {label: t('assets.rotation.type.private_key'), value: 'private-key'},
                ]}/>
            </Form.Item>
        </Form>
        </Disabled>
    </Modal>;
};

interface Props {
    open: boolean;
    handleCancel: () => void;
    assetIds: string[];
    onSuccess: (results: RotationResult[]) => void;
}

export default AssetRotateModal;
