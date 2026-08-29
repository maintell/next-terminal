import {useSearchParams} from "react-router-dom";
import {App, ConfigProvider, theme} from "antd";
import strings from "@/utils/strings";
import AccessTerminal from "@/pages/access/AccessTerminal";
import AccessGuacamole from "@/pages/access/AccessGuacamole";
import AccessDarkTheme from "@/pages/access/components/AccessDarkTheme";

const terminalProtocols = new Set(['ssh', 'telnet']);
const guacamoleProtocols = new Set(['rdp', 'vnc']);

const StandaloneAssetAccessPage = () => {
    const [searchParams] = useSearchParams();
    const assetId = searchParams.get('assetId');
    const protocol = searchParams.get('protocol')?.toLowerCase();

    if (!strings.hasText(assetId)) {
        return <div>Error</div>;
    }

    const currentAssetId = assetId ?? '';

    const content = (() => {
        if (terminalProtocols.has(protocol || '')) {
            return <AccessTerminal assetId={currentAssetId} standalone/>;
        }

        if (guacamoleProtocols.has(protocol || '')) {
            return <AccessGuacamole assetId={currentAssetId} standalone/>;
        }

        return <AccessGuacamole assetId={currentAssetId} standalone/>;
    })();

    return (
        <ConfigProvider theme={{algorithm: theme.darkAlgorithm}}>
            <App>
                <AccessDarkTheme>
                    <div className="h-[100svh] w-screen overflow-hidden bg-[#141414]">
                        {content}
                    </div>
                </AccessDarkTheme>
            </App>
        </ConfigProvider>
    );
};

export default StandaloneAssetAccessPage;
