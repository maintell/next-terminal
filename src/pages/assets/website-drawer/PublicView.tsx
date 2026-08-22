import React from 'react';
import {Checkbox, DatePicker, Form, Input, Select, Switch} from "antd";
import {useTranslation} from "react-i18next";
import dayjs, {Dayjs} from "dayjs";
import Disabled from "@/components/Disabled";

interface PublicViewProps {
    hasPremiumFeatures: boolean;
}

const listToText = (value?: string[]) => ({
    value: (value || []).join('\n'),
});

const textToList = (value: string) => value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

const PublicView: React.FC<PublicViewProps> = ({hasPremiumFeatures}) => {
    const {t} = useTranslation();
    const form = Form.useFormInstance();
    const publicEnabled = Form.useWatch(['public', 'enabled'], form);
    const timeLimit = Form.useWatch(['public', 'timeLimit'], form);

    const disabledDate = (current: Dayjs) => {
        return current && current < dayjs();
    };

    const handleTimeLimitChange = (e: any) => {
        if (!e.target.checked) {
            form.setFieldValue(['public', 'expiredAt'], undefined);
        }
    };

    const tagSeparators = [',', '，'];

    return <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="font-medium">{t('assets.public_access_switch')}</div>
            <Form.Item name={['public', 'enabled']} valuePropName="checked" style={{marginBottom: 0}}>
                <Switch checkedChildren={t('general.yes')} unCheckedChildren={t('general.no')}/>
            </Form.Item>
        </div>

        {publicEnabled && (
            <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-4">
                        <div className="font-medium">{t('assets.public_validity')}</div>
                        <div className="mt-1 text-xs text-gray-500">{t('assets.public_validity_tip')}</div>
                    </div>
                    <Form.Item name={['public', 'timeLimit']} valuePropName="checked">
                        <Checkbox
                            onChange={handleTimeLimitChange}>{t('assets.limit_time_enabled')}</Checkbox>
                    </Form.Item>

                    {timeLimit && <Form.Item label={t('assets.limit_time')} name={['public', 'expiredAt']}
                                             style={{marginBottom: 0}}>
                        <DatePicker
                            allowClear={true}
                            disabledDate={disabledDate}
                            showTime={true}
                            className="w-full"/>
                    </Form.Item>}
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-4">
                        <div className="font-medium">{t('assets.public_access_rules')}</div>
                        <div className="mt-1 text-xs text-gray-500">{t('assets.public_rule_relation_tip')}</div>
                    </div>

                    <Form.Item label={t('assets.limit_ip')} name={['public', 'ip']} extra={t('assets.limit_ip_tip')}>
                        <Input.TextArea
                            autoSize={{minRows: 3, maxRows: 8}}
                            placeholder={"192.168.1.0/24\n10.0.0.1\n172.16.0.1-172.16.0.255"}/>
                    </Form.Item>
                    <Disabled disabled={!hasPremiumFeatures}>
                        <div className="mb-6">
                            <div className="mb-2 text-sm">{t('assets.public_geo_rules')}</div>
                            <div className="mb-3 text-xs text-gray-500">{t('assets.public_geo_rules_tip')}</div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <Form.Item label={t('assets.limit_country')} name={['public', 'countries']}
                                               style={{marginBottom: 0}}>
                                        <Select
                                            mode='tags'
                                            tokenSeparators={tagSeparators}
                                            placeholder={t('assets.limit_country_placeholder')}/>
                                    </Form.Item>
                                    <Form.Item label={t('assets.limit_province')} name={['public', 'provinces']}
                                               style={{marginBottom: 0}}>
                                        <Select
                                            mode='tags'
                                            tokenSeparators={tagSeparators}
                                            placeholder={t('assets.limit_province_placeholder')}/>
                                    </Form.Item>
                                    <Form.Item label={t('assets.limit_city')} name={['public', 'cities']}
                                               style={{marginBottom: 0}}>
                                        <Select
                                            mode='tags'
                                            tokenSeparators={tagSeparators}
                                            placeholder={t('assets.limit_city_placeholder')}/>
                                    </Form.Item>
                                </div>
                            </div>
                        </div>
                    </Disabled>
                    <div className="flex flex-col gap-3">
                        <Form.Item label={t('assets.public_header_whitelist')} name={['public', 'headerWhitelist']}
                                   extra={t('assets.public_header_whitelist_tip')}
                                   getValueProps={listToText}
                                   normalize={textToList}>
                            <Input.TextArea
                                autoSize={{minRows: 4, maxRows: 8}}
                                placeholder={t('assets.public_header_whitelist_placeholder')}/>
                        </Form.Item>
                        <Form.Item label={t('assets.public_path_whitelist')} name={['public', 'pathWhitelist']}
                                   extra={t('assets.public_path_whitelist_tip')}
                                   getValueProps={listToText}
                                   normalize={textToList}>
                            <Input.TextArea
                                autoSize={{minRows: 4, maxRows: 8}}
                                placeholder={t('assets.public_path_whitelist_placeholder')}/>
                        </Form.Item>
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-4">
                        <div className="font-medium">{t('assets.public_password_access')}</div>
                        <div className="mt-1 text-xs text-gray-500">{t('assets.public_password_access_tip')}</div>
                    </div>
                    <Form.Item label={t('assets.limit_password')} name={['public', 'password']}
                               style={{marginBottom: 0}}>
                        <Input.Password
                            autoComplete='new-password'
                            name='public-access-password'
                            spellCheck={false}
                            placeholder="password123"/>
                    </Form.Item>
                </div>
            </div>
        )}
    </div>;
};
export default PublicView;
