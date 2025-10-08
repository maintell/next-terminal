import React from 'react';
import {ProForm, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {App, Typography} from "antd";
import accountApi, {AccountInfo} from "@/src/api/account-api";

const {Title} = Typography;

const ChangeInfo = () => {
    let {t} = useTranslation();

    let {message} = App.useApp();

    const get = async () => {
        return await accountApi.getUserInfo();
    }

    const set = async (info: AccountInfo) => {
        await accountApi.changeInfo(info);
        message.success(t('general.success'));
        return true
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('account.change.info')}</Title>
            <div style={{margin: 16}}></div>
            <ProForm request={get} onFinish={set}>
                <ProFormText name={'nickname'} label={t('account.nickname')} rules={[{required: true}]}/>
                <ProFormTextArea label={t('account.public_key')} name='publicKey'
                                 placeholder='Public Key, one per line'
                                 fieldProps={{rows: 8}}/>
            </ProForm>
        </div>
    );
};

export default ChangeInfo;