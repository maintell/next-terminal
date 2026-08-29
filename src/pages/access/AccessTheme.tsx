import "@xterm/xterm/css/xterm.css";
import XtermThemes from "@/color-theme/XtermThemes";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useTerminalTheme} from "@/pages/access/hooks/use-terminal-theme";
import {useTranslation} from 'react-i18next';
import {useLicense} from "@/hook/LicenseContext";
import Disabled from "@/components/Disabled";
import {Card, Radio} from "antd";
import {cn} from "@/lib/utils";
import type {ITheme} from "@xterm/xterm";

const themes = XtermThemes;

interface ThemeRendererProps {
    theme: ITheme;
}

const ThemeRenderer = ({theme}: ThemeRendererProps) => {
    const directories = ['boot', 'data', 'dev', 'etc'];
    return (
        <div style={{backgroundColor: theme.background, color: theme.foreground}} className="overflow-hidden">
            <pre className="m-0 text-xs leading-5">
                <div>
                    <span style={{color: theme.brightGreen}}>next</span>
                    @
                    <span style={{color: theme.brightGreen}}>terminal</span>
                    $ ls
                </div>
                {directories.map((directory) => (
                    <div key={directory}>
                        <span style={{color: theme.brightBlue}}>drwxr-xr-x</span>
                        {' 1 root  '}
                        <span style={{color: theme.brightBlue}}>{directory}</span>
                    </div>
                ))}
            </pre>
        </div>
    );
};

const AccessTheme = () => {

    let [accessTheme, setAccessTheme] = useTerminalTheme();
    let {t} = useTranslation();
    let { license } = useLicense();

    return (
        <ScrollArea className="h-full">
            <div className={'flex items-center justify-center'}>
                <div className={'m-8'}>
                    <Disabled disabled={!license.hasPremiumFeatures()}>
                        <div className={'text-lg font-bold'}>{t('access.settings.theme')}</div>
                    </Disabled>
                    <Radio.Group
                        className="w-full"
                        disabled={!license.hasPremiumFeatures()}
                        onChange={(value) => {
                            let name = value.target.value as string;
                            let v = XtermThemes.find(item => item.name == name);
                            setAccessTheme({
                                ...accessTheme,
                                selected: name,
                                theme: v,
                            })
                        }}
                        value={accessTheme.selected}
                    >
                        <div
                            className={'grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-2 grid-cols-1 gap-4 mt-8 '}>
                            {themes.map(item => {
                                const checked = accessTheme.selected === item.name;
                                return <Card
                                    key={item.name}
                                    size="small"
                                    hoverable={license.hasPremiumFeatures()}
                                    className={cn(
                                        'cursor-pointer transition-colors',
                                        checked && 'border-blue-500 shadow-sm'
                                    )}
                                    onClick={() => {
                                        if (!license.hasPremiumFeatures()) {
                                            return;
                                        }
                                        let v = XtermThemes.find(theme => theme.name == item.name);
                                        setAccessTheme({
                                            ...accessTheme,
                                            selected: item.name,
                                            theme: v,
                                        });
                                    }}
                                >
                                    <Radio value={item.name} disabled={!license.hasPremiumFeatures()}>
                                        {item.name}
                                    </Radio>
                                    <div>
                                        <div className={'p-4 rounded-lg mt-4 overflow-hidden'} style={{
                                            backgroundColor: item.value.background
                                        }}>
                                            <ThemeRenderer theme={item.value}/>
                                        </div>
                                    </div>
                                </Card>
                            })}
                        </div>
                    </Radio.Group>

                </div>
            </div>
        </ScrollArea>
    );
};

export default AccessTheme;
