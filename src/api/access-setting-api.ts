import requests from "@/src/api/core/requests";
import strings from "@/src/utils/strings";

export type Setting = {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    selectionCopy: boolean;
    rightClickPaste: boolean;
    treeExpandedKeys: string[];
    useSnippets: boolean;
}

class AccessSettingApi {
    get = async () => {
        let record = await requests.get('/access/settings') as Record<string, string>;
        let setting: Setting = {
            fontSize: parseInt(record['fontSize']),
            lineHeight: parseFloat(record['lineHeight']),
            fontFamily: record['fontFamily'],
            selectionCopy: strings.isTrue(record['selectionCopy']),
            rightClickPaste: strings.isTrue(record['rightClickPaste']),
            treeExpandedKeys: record['treeExpandedKeys']?.split(','),
            useSnippets: strings.isTrue(record['useSnippets']),
        }
        return setting;
    }

    set = async (data: Record<string, string>) => {
        await requests.put('/access/settings', data);
    }

    getShellAssistantEnabled = async () => {
        let data = await requests.get('/access/settings/shell-assistant-enabled');
        return data as { enabled: boolean };
    }
}

export default new AccessSettingApi();