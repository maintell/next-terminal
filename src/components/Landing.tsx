import {Spin} from "antd";
import {useTranslation} from "react-i18next";

const Landing = () => {
    const {t} = useTranslation();
    return (
        <div className="flex h-full min-h-64 items-center justify-center">
            <Spin description={t('general.loading_detail')}>
                <div style={{width: 800}}></div>
            </Spin>
        </div>
    )
};

export default Landing;
