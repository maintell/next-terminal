import type {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';
import {cloneElement, isValidElement, useReducer} from 'react';
import {generateRandomId} from '@/utils/utils';

export interface TabItem {
    key: string;
    label: string;
    children: React.ReactNode;
    meta?: {
        type?: 'session';
        assetId?: string;
        recreate?: (key: string) => React.ReactNode;
    };
}

interface AddTabOptions {
    meta?: TabItem['meta'];
}

interface AccessTabsState {
    items: TabItem[];
    activeKey: string;
}

type AccessTabsAction =
    | {type: 'ADD'; tab: TabItem}
    | {type: 'REMOVE'; key: string}
    | {type: 'SET_ACTIVE'; key: string}
    | {type: 'CLOSE_LEFT'; key: string}
    | {type: 'CLOSE_RIGHT'; key: string}
    | {type: 'CLOSE_ALL'}
    | {type: 'CLOSE_OTHERS'; key: string}
    | {type: 'REPLACE'; key: string; tab: TabItem}
    | {type: 'INSERT_AFTER'; key: string; tab: TabItem}
    | {type: 'REORDER'; activeKey: string; overKey: string};

const initialState: AccessTabsState = {items: [], activeKey: ''};

const accessTabsReducer = (state: AccessTabsState, action: AccessTabsAction): AccessTabsState => {
    switch (action.type) {
        case 'ADD': {
            const exists = state.items.some((item) => item.key === action.tab.key);
            return {
                items: exists ? state.items : [...state.items, action.tab],
                activeKey: action.tab.key,
            };
        }
        case 'REMOVE': {
            const targetIndex = state.items.findIndex((item) => item.key === action.key);
            if (targetIndex < 0) {
                return state;
            }
            const items = state.items.filter((item) => item.key !== action.key);
            if (state.activeKey !== action.key) {
                return {...state, items};
            }
            const nextIndex = Math.max(0, targetIndex - 1);
            return {items, activeKey: items[nextIndex]?.key ?? ''};
        }
        case 'SET_ACTIVE':
            return state.activeKey === action.key ? state : {...state, activeKey: action.key};
        case 'CLOSE_LEFT': {
            const targetIndex = state.items.findIndex((item) => item.key === action.key);
            if (targetIndex <= 0) {
                return state;
            }
            const items = state.items.slice(targetIndex);
            const activeKey = items.some((item) => item.key === state.activeKey) ? state.activeKey : action.key;
            return {items, activeKey};
        }
        case 'CLOSE_RIGHT': {
            const targetIndex = state.items.findIndex((item) => item.key === action.key);
            if (targetIndex < 0 || targetIndex === state.items.length - 1) {
                return state;
            }
            const items = state.items.slice(0, targetIndex + 1);
            const activeKey = items.some((item) => item.key === state.activeKey) ? state.activeKey : action.key;
            return {items, activeKey};
        }
        case 'CLOSE_ALL':
            return initialState;
        case 'CLOSE_OTHERS': {
            const target = state.items.find((item) => item.key === action.key);
            return target ? {items: [target], activeKey: target.key} : state;
        }
        case 'REPLACE':
            return {
                items: state.items.map((item) => item.key === action.key ? action.tab : item),
                activeKey: action.tab.key,
            };
        case 'INSERT_AFTER': {
            const targetIndex = state.items.findIndex((item) => item.key === action.key);
            if (targetIndex < 0) {
                return state;
            }
            return {
                items: [
                    ...state.items.slice(0, targetIndex + 1),
                    action.tab,
                    ...state.items.slice(targetIndex + 1),
                ],
                activeKey: action.tab.key,
            };
        }
        case 'REORDER': {
            const activeIndex = state.items.findIndex((item) => item.key === action.activeKey);
            const overIndex = state.items.findIndex((item) => item.key === action.overKey);
            if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
                return state;
            }
            return {...state, items: arrayMove(state.items, activeIndex, overIndex)};
        }
    }
};

const buildSessionTabKey = (assetId: string) => `${generateRandomId()}_${assetId}`;

const recreateTabChildren = (tab: TabItem, newKey: string) => {
    if (tab.meta?.recreate) {
        return tab.meta.recreate(newKey);
    }
    return isValidElement(tab.children) ? cloneElement(tab.children) : tab.children;
};

/** 页面局部的标签页状态。items 与 activeKey 由同一个 reducer 原子更新。 */
export function useTabOperations() {
    const [state, dispatch] = useReducer(accessTabsReducer, initialState);

    const setActiveKey = (key: string) => dispatch({type: 'SET_ACTIVE', key});
    const addTab = (key: string, label: string, children: React.ReactNode, options?: AddTabOptions) => {
        dispatch({type: 'ADD', tab: {key, label, children, meta: options?.meta}});
    };
    const removeTab = (key: string) => dispatch({type: 'REMOVE', key});
    const handleCloseLeft = (key: string) => dispatch({type: 'CLOSE_LEFT', key});
    const handleCloseRight = (key: string) => dispatch({type: 'CLOSE_RIGHT', key});
    const handleCloseAll = () => dispatch({type: 'CLOSE_ALL'});
    const handleCloseOthers = (key: string) => dispatch({type: 'CLOSE_OTHERS', key});

    const handleReconnect = (key: string) => {
        const target = state.items.find((item) => item.key === key);
        if (!target) {
            return;
        }
        const newKey = target.meta?.type === 'session' && target.meta.assetId
            ? buildSessionTabKey(target.meta.assetId)
            : `${key}_refresh_${Date.now()}`;
        dispatch({
            type: 'REPLACE',
            key,
            tab: {...target, key: newKey, children: recreateTabChildren(target, newKey)},
        });
    };

    const handleDuplicateSession = (key: string) => {
        const target = state.items.find((item) => item.key === key);
        if (target?.meta?.type !== 'session' || !target.meta.assetId) {
            return;
        }
        const newKey = buildSessionTabKey(target.meta.assetId);
        dispatch({
            type: 'INSERT_AFTER',
            key,
            tab: {...target, key: newKey, children: recreateTabChildren(target, newKey)},
        });
    };

    const onDragEnd = ({active, over}: DragEndEvent) => {
        if (over && active.id !== over.id) {
            dispatch({type: 'REORDER', activeKey: String(active.id), overKey: String(over.id)});
        }
    };

    return {
        items: state.items,
        activeKey: state.activeKey,
        setActiveKey,
        addTab,
        removeTab,
        handleCloseLeft,
        handleCloseRight,
        handleCloseAll,
        handleCloseOthers,
        handleReconnect,
        handleDuplicateSession,
        onDragEnd,
    };
}
