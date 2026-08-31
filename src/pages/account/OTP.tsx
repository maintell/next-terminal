import {useQuery} from "@tanstack/react-query";
import {Button, Spin, Typography} from "antd";
import {useTranslation} from "react-i18next";
import accountApi from "../../api/account-api";
import OTPBinding from "./OTPBinding";
import OTPUnBinding from "./OTPUnBinding";

const {Title, Paragraph} = Typography;

const OTP = () => {
    const {t} = useTranslation();
    const infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    });

    const refetch = () => {
        void infoQuery.refetch();
    };

    const renderContent = () => {
        if (infoQuery.isPending) {
            return (
                <div className="flex justify-center py-16">
                    <Spin size="large"/>
                </div>
            );
        }

        if (!infoQuery.data) {
            return (
                <div className="flex justify-center py-16">
                    <Button type="link" onClick={() => void infoQuery.refetch()}>
                        {t('actions.retry')}
                    </Button>
                </div>
            );
        }

        if (infoQuery.data.enabledTotp) {
            return <OTPUnBinding refetch={refetch} forceReauth/>;
        }

        return <OTPBinding refetch={refetch}/>;
    };

    return (
        <div className="max-w-5xl min-w-0">
            <div className="mb-4 min-w-0">
                <Title level={5} style={{margin: 0}}>
                    {t('identity.user.otp')}
                </Title>
                <Paragraph
                    type="secondary"
                    ellipsis={{rows: 1, tooltip: t('account.otp_description')}}
                    style={{marginTop: 4, marginBottom: 0}}
                >
                    {t('account.otp_description')}
                </Paragraph>
            </div>

            {renderContent()}
        </div>
    );
};

export default OTP;
