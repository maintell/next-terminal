import {useState} from 'react';
import accountApi from "../../api/account-api";
import {App, Button, Typography} from "antd";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";

const {Text, Paragraph} = Typography;

interface UnBinding2faProps {
    refetch: () => void
    forceReauth?: boolean
}

const OTPUnBinding = ({refetch, forceReauth = false}: UnBinding2faProps) => {
    const {t} = useTranslation();
    const [mfaOpen, setMfaOpen] = useState(false);
    const {message, modal} = App.useApp();

    const unbind = () => {
        modal.confirm({
            title: t('account.otp_unbind_title'),
            icon: <ExclamationCircleOutlined/>,
            content: t('account.otp_unbind_subtitle'),
            okType: 'danger',
            onOk: () => setMfaOpen(true),
        });
    };

    return (
        <div>
            <div className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500"/>
                    <div className="min-w-0">
                        <Text strong>
                            {t('account.otp_bind_title')}
                        </Text>
                        <Paragraph type="secondary" style={{marginTop: 4, marginBottom: 0}}>
                            {t('account.otp_bind_sub_title')}
                        </Paragraph>
                    </div>
                </div>

                <div className="shrink-0 sm:ml-6">
                    <Button danger onClick={unbind}>
                        {t('account.otp_unbind')}
                    </Button>
                </div>
            </div>

            <MultiFactorAuthentication
                open={mfaOpen}
                forceReauth={forceReauth}
                handleOk={async (securityToken) => {
                    setMfaOpen(false);
                    await accountApi.resetTotp(securityToken);
                    message.success(t('general.success'));
                    refetch();
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </div>
    );
};

export default OTPUnBinding;
