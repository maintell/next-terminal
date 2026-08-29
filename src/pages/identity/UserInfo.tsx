import userApi from "../../api/user-api";
import {useTranslation} from "react-i18next";
import {Descriptions, Space, Spin, Tag} from "antd";
import NLink from "@/components/NLink";
import {useQuery} from "@tanstack/react-query";
import times from "@/components/time/times";

interface UserInfoProps {
    active: boolean
    id: string
}

const UserInfo = ({active, id}: UserInfoProps) => {

    let {t} = useTranslation();
    const userQuery = useQuery({
        queryKey: ['user', id],
        queryFn: () => userApi.getById(id),
        enabled: active && !!id,
    });

    const user = userQuery.data;

    return (
        <div className={'page-detail-info'}>
            <Spin spinning={userQuery.isLoading}>
                <Descriptions
                    column={1}
                    items={[
                        {key: 'username', label: t('gateways.username'), children: user?.username},
                        {key: 'nickname', label: t('identity.user.nickname'), children: user?.nickname},
                        {key: 'mail', label: t('identity.user.mail'), children: user?.mail},
                        {key: 'remark', label: t('general.remark'), children: user?.remark},
                        {
                            key: 'status',
                            label: t('identity.user.status'),
                            children: user?.status === 'disabled' ? (
                            <Tag color="error">{t('general.disabled')}</Tag>
                        ) : (
                            <Tag color="success">{t('general.enabled')}</Tag>
                            ),
                        },
                        {
                            key: 'otp',
                            label: t('identity.user.otp'),
                            children: user?.enabledTotp ? (
                            <Tag color="success">{t('general.enabled')}</Tag>
                        ) : (
                            <Tag color="error">{t('general.disabled')}</Tag>
                            ),
                        },
                        {
                            key: 'authorized',
                            label: t('actions.authorized'),
                            children: (
                                <Space size={12} wrap>
                                    <NLink to={`/authorised-asset?userId=${id}`}>
                                        {`${t('menus.resource.submenus.asset')}${t('actions.authorized')}`}
                                    </NLink>
                                    <NLink to={`/authorised-website?userId=${id}`}>
                                        {`${t('menus.resource.submenus.website')}${t('actions.authorized')}`}
                                    </NLink>
                                </Space>
                            ),
                        },
                        {
                            key: 'created-at',
                            label: t('general.created_at'),
                            children: user?.createdAt ? times.format(user.createdAt) : '-',
                        },
                    ]}
                />
            </Spin>
        </div>
    );
};

export default UserInfo;
