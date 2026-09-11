import {Api} from "@/api/core/api";
import requests from "@/api/core/requests";

export type IPSetSourceType = 'manual' | 'url';

export interface IPSet {
    id: string;
    name: string;
    description: string;
    sourceType: IPSetSourceType;
    sourceUrl: string;
    sourceHeaders: IPSetHeader[];
    rules: string;
    refreshMinutes: number;
    lastSyncedAt: number;
    lastSyncError: string;
    contentHash: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface IPSetHeader { name: string; value: string; }

export type IPSetOption = Pick<IPSet, 'id' | 'name' | 'enabled'>;

class IPSetApi extends Api<IPSet> {
    constructor() { super('admin/ip-sets'); }

    options = async () => await requests.get(`/${this.group}/options`) as IPSetOption[];

    all = async () => await requests.get(`/${this.group}`) as IPSet[];
    sync = async (id: string) => { await requests.post(`/${this.group}/${id}/sync`); };
}

const ipSetApi = new IPSetApi();
export default ipSetApi;
