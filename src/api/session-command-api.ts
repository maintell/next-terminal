import {Api} from "@/api/core/api";
import {SessionCommand} from "@/api/session-api";
import type {RegionInfo} from "@/api/region-info";

export interface SessionCommandAudit extends SessionCommand {
    userId: string;
    userAccount: string;
    assetId: string;
    assetName: string;
    clientIp: string;
    regionInfo?: RegionInfo;
    protocol: string;
    ip: string;
    port: number;
    username: string;
    connectedAt: number;
    recordingSize: number;
}

class SessionCommandApi extends Api<SessionCommandAudit> {
    constructor() {
        super("admin/session-commands");
    }
}

const sessionCommandApi = new SessionCommandApi();
export default sessionCommandApi;
