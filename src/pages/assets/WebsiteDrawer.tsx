import websiteApi from "@/api/website-api";
import {useFormRequest} from "@/hook/use-antd-form-query";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import CertView from "@/pages/assets/website-drawer/CertView";
import HeaderView from "@/pages/assets/website-drawer/HeaderView";
import PublicView from "@/pages/assets/website-drawer/PublicView";
import TempAllowView from "@/pages/assets/website-drawer/TempAllowView";
import WebsiteBasicFields from "@/pages/assets/website-drawer/WebsiteBasicFields";
import WebsiteModifyResponseView from "@/pages/assets/WebsiteModifyResponseView";
import ConnectionView from "@/pages/assets/website-drawer/ConnectionView";
import {
  getDefaultWebsiteData,
  normalizeOriginHostMode,
  normalizeOriginTimeout,
  WebsiteBasicFormData
} from "@/pages/assets/website-drawer/basic";
import {WebsiteFormData} from "@/pages/assets/website-drawer/types";
import {normalizePublicIPRules, parseURL} from "@/pages/assets/website-drawer/utils";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Drawer, Form, Input, Space, Tabs} from 'antd';
import dayjs from "dayjs";
import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";

export interface WebsiteDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  id?: string;
  groupId?: string;
}

const WebsiteDrawer: React.FC<WebsiteDrawerProps> = ({
  open,
  onClose,
  onSuccess,
  id,
  groupId
}) => {
  const {message} = App.useApp();
  const {t} = useTranslation();
  const {license, isLoading: licenseLoading} = useLicense();
  const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();
  const [form] = Form.useForm();
  const [websiteData, setWebsiteData] = useState<Partial<WebsiteFormData>>();

  useEffect(() => {
    if (!open) {
      setWebsiteData(undefined);
      form.resetFields();
    }
  }, [open, form]);

  const loadWebsiteData = async (): Promise<Partial<WebsiteBasicFormData>> => {
    if (!id) {
      return {
        ...getDefaultWebsiteData(),
        groupId
      };
    }

    try {
      const website = await websiteApi.getById(id);
      const {scheme, host, port} = parseURL(website.targetUrl);
      const nextWebsiteData: Partial<WebsiteFormData> = {
        ...website,
        connectionMode: website.connectionMode || 'direct',
        gatewayChain: website.gatewayChain || [],
        gatewaySource: website.gatewayChain?.length ? 'custom' : 'inherit',
        originHostMode: normalizeOriginHostMode(website.originHostMode),
        originHostCustom: website.originHostCustom || '',
        originTimeout: normalizeOriginTimeout(website.originTimeout),
        public: website.public ? {
          ...website.public,
          ip: normalizePublicIPRules(website.public.ip),
          timeLimit: !!(website.public.expiredAt && website.public.expiredAt > 0),
          expiredAt: website.public.expiredAt && website.public.expiredAt > 0
            ? dayjs(website.public.expiredAt)
            : undefined
        } : website.public
      };
      setWebsiteData(nextWebsiteData);

      return {
        ...nextWebsiteData,
        scheme,
        host,
        port: parseInt(port, 10),
      };
    } catch (error) {
      console.error('Failed to load website data:', error);
      message.error(t('assets.website_load_failed'));
      throw error;
    }
  };

  const postOrUpdate = async (values: WebsiteBasicFormData) => {
    const {originHostMode, originHostCustom, gatewaySource: _gatewaySource, ...restValues} = values;
    const defaults = getDefaultWebsiteData();
    const publicExpiredAt = values.public?.expiredAt;
    const submitTempAllow = {
      ...(websiteData?.tempAllow || defaults.tempAllow),
      ...(values.tempAllow || {})
    };
    const submitPublic = {
      ...(websiteData?.public || defaults.public),
      ...(values.public || {}),
      enabled: values.public?.enabled ?? false,
      ip: normalizePublicIPRules(values.public?.ip ?? websiteData?.public?.ip ?? defaults.public?.ip),
      expiredAt: values.public?.timeLimit && publicExpiredAt && dayjs.isDayjs(publicExpiredAt)
        ? publicExpiredAt.valueOf()
        : 0,
      countries: values.public?.countries ?? websiteData?.public?.countries ?? [],
      provinces: values.public?.provinces ?? websiteData?.public?.provinces ?? [],
      cities: values.public?.cities ?? websiteData?.public?.cities ?? []
    };
    const submitData: any = {
      ...websiteData,
      ...restValues,
      gatewayChain: restValues.gatewayChain ?? websiteData?.gatewayChain ?? [],
      cert: values.cert || websiteData?.cert || defaults.cert,
      public: submitPublic,
      tempAllow: submitTempAllow,
      headers: values.headers ?? [],
      originHostMode,
      originHostCustom: originHostMode === 'custom' ? originHostCustom : '',
      insecureSkipVerify: values.scheme === 'https' ? values.insecureSkipVerify ?? false : false,
      modifyRules: values.modifyRules || websiteData?.modifyRules || [],
      targetUrl: `${values.scheme}://${values.host}:${values.port}`,
    };

    if (id) {
      await websiteApi.updateById(id, submitData);
      return undefined;
    }
    return await websiteApi.create(submitData);
  };

  const mutation = useMutation({
    mutationFn: postOrUpdate,
    onSuccess: () => {
      message.success(t('general.success'));
      onSuccess?.();
      onClose();
    }
  });

  const handleSubmit = (values: WebsiteBasicFormData) => {
    mutation.mutate(values);
  };

  useFormRequest(form, ["form-request", "web/src/pages/assets/WebsiteDrawer.tsx", open, id, groupId], loadWebsiteData, {enabled: open && !licenseLoading});

  const drawerExtra = (
    <Space size={8}>
      <Button onClick={onClose}>
        {t('actions.cancel')}
      </Button>
      <Button type="primary" onClick={() => form.submit()} loading={mutation.isPending}>
        {t('actions.save')}
      </Button>
    </Space>
  );

  const tabsItems = [
    {
      key: 'basic',
      label: t('assets.general'),
      children: <WebsiteBasicFields showLogo={true}/>,
      forceRender: true
    },
    {
      key: 'connection',
      label: t('assets.connection'),
      children: <ConnectionView/>,
      forceRender: true
    },
    {
      key: 'public',
      label: t('assets.public'),
      children: <PublicView hasPremiumFeatures={hasPremiumFeatures}/>,
      forceRender: true
    },
    {
      key: 'temp-allow',
      label: t('assets.temp_allow'),
      children: <TempAllowView/>,
      forceRender: true
    },
    {
      key: 'headers',
      label: t('assets.custom_header'),
      children: <HeaderView/>,
      forceRender: true
    },
    {
      key: 'cert',
      label: t('assets.custom_certificate'),
      children: <CertView/>,
      forceRender: true
    },
    {
      key: 'modify-response',
      label: t('assets.modify_response'),
      children: (
        <Disabled disabled={!hasPremiumFeatures}>
          <WebsiteModifyResponseView/>
        </Disabled>
      ),
      forceRender: true
    }
  ];

  return (
    <Drawer
      title={id ? t('actions.edit') : t('actions.new')}
      onClose={onClose}
      open={open}
      size={960}
      className="website-drawer"
      destroyOnHidden={true}
      extra={drawerExtra}
    >
      <Form autoComplete="off" form={form} clearOnDestroy={true} layout="vertical" onFinish={handleSubmit}>
        <Form.Item hidden={true} name="id">
          <Input/>
        </Form.Item>
        <Tabs
          tabPlacement="start"
          items={tabsItems}
          defaultActiveKey="basic"
        />
      </Form>
    </Drawer>
  );
};

export default WebsiteDrawer;
