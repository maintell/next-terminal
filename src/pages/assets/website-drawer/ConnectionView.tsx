import React from 'react';
import {useLicense} from "@/hook/LicenseContext";
import ConnectionModeFields from "@/pages/assets/components/ConnectionModeFields";

const ConnectionView: React.FC = () => {
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();

    return <ConnectionModeFields allowInheritedGateway gatewayDisabled={!hasPremiumFeatures}/>;
};

export default ConnectionView;
