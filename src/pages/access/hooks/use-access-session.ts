import portalApi from '@/api/portal-api';
import {useMutation} from '@tanstack/react-query';

type AccessSessionSource =
    | {type: 'asset'; assetId: string}
    | {type: 'shared'; sessionId: string; sharerToken: string};

/** SSH 与 Guacamole 共用的会话获取入口，统一通过 React Query 管理请求状态。 */
export const useAccessSessionMutation = (source: AccessSessionSource) => useMutation({
    mutationFn: (securityToken?: string) => {
        if (source.type === 'asset') {
            return portalApi.createSessionByAssetsId(source.assetId, securityToken);
        }
        return portalApi.getSessionById(source.sessionId, source.sharerToken);
    },
});
