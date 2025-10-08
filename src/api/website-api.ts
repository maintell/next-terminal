import {Api} from "@/src/api/core/api";
import requests from "@/src/api/core/requests";
import type { TreeDataNode } from 'antd';

export interface Website {
    id: string;
    logo: string;
    name: string;
    enabled: boolean;
    targetUrl: string;
    targetHost: string;
    targetPort: number;
    domain: string;
    asciiDomain: string;
    entrance: string;
    description: string;
    status: string;
    statusText: string;
    agentGatewayId: string;
    basicAuth: BasicAuth;
    headers?: any;
    cert: Cert;
    public: Public;
    createdAt: number;
    groupId?: string;

    scheme: string;
    host: string;
    port: number;
}

interface Public {
    enabled: boolean;
    ip: string;
    expiredAt: number;
    password: string;
}

interface Cert {
    enabled: boolean;
    cert: string;
    key: string;
}

interface BasicAuth {
    enabled: boolean;
    username: string;
    password: string;
}

class WebsiteApi extends Api<Website> {
    constructor() {
        super("admin/websites");
    }

    getGroups = async () => {
        return await requests.get(`/${this.group}/groups`) as TreeDataNode[]
    }

    setGroups = async (data: any) => {
        return await requests.put(`/${this.group}/groups`, data);
    }

    deleteGroup = async (groupId: string) => {
        return await requests.delete(`/${this.group}/groups/${groupId}`);
    }

    changeGroup = async (data: any) => {
        return await requests.post(`/${this.group}/change-group`, data);
    }
}

const websiteApi = new WebsiteApi();
export default websiteApi;