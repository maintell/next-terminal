import {Api} from "@/api/core/api";
import requests from "@/api/core/requests";

export type IPWhitelistSourceType = 'manual' | 'url';

export interface IPWhitelist {
    id: string;
    name: string;
    description: string;
    sourceType: IPWhitelistSourceType;
    sourceUrl: string;
	 sourceHeaders: IPWhitelistHeader[];
    rules: string;
    refreshMinutes: number;
    lastSyncedAt: number;
    lastSyncError: string;
    contentHash: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface IPWhitelistHeader { name: string; value: string; }

class IPWhitelistApi extends Api<IPWhitelist> {
    constructor() { super('admin/ip-whitelists'); }

    all = async () => await requests.get(`/${this.group}`) as IPWhitelist[];
    sync = async (id: string) => { await requests.post(`/${this.group}/${id}/sync`); };
}

const ipWhitelistApi = new IPWhitelistApi();
export default ipWhitelistApi;
