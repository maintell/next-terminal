import {Tabs, TabsProps} from "antd";
import {useSearchParams} from "react-router-dom";
import ToolsPing from './ToolsPing';
import ToolsTcping from "@/pages/sysops/ToolsTcping";

const ToolsPage = () => {

    let [searchParams, setSearchParams] = useSearchParams();

    const items: TabsProps['items'] = [
        {
            key: 'ping',
            label: 'Ping',
            children: <ToolsPing/>,
        },
        {
            key: 'tcping',
            label: 'TCP Ping',
            children: <ToolsTcping/>,
        },
    ];

    const onChange = (key: string) => {
        searchParams.set('tab', key);
        setSearchParams(searchParams);
    }

    return (
        <div className="h-full min-h-0">
            <Tabs activeKey={searchParams.get('tab') || 'ping'}
                  items={items}
                  onChange={onChange}
                  styles={{
                      root: {height: '100%', minHeight: 0, overflow: 'hidden'},
                      body: {height: '100%', minHeight: 0},
                      content: {height: '100%', minHeight: 0, overflow: 'hidden'},
                  }}
            />
        </div>
    );
};

export default ToolsPage;
