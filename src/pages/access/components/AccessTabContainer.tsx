import React, {isValidElement} from 'react';
import {Tabs} from 'antd';
import {closestCenter, DndContext, PointerSensor, useSensor} from '@dnd-kit/core';
import {horizontalListSortingStrategy, SortableContext, useSortable} from '@dnd-kit/sortable';
import type {DragEndEvent} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import {ResizablePanel} from '@/components/ui/resizable';
import TabContextMenu from '@/components/TabContextMenu';
import {ACCESS_CONTENT_PANEL_ID} from '@/pages/access/constants';

interface DraggableTabPaneProps extends React.HTMLAttributes<HTMLDivElement> {
    'data-node-key': string;
}

const DraggableTabNode = ({className, ...props}: DraggableTabPaneProps) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
        id: props['data-node-key'],
    });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'move',
    };

    const child = props.children as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
    >;
    return React.cloneElement(child, {
        ref: setNodeRef,
        style,
        ...attributes,
        ...listeners,
    });
};

interface TabItem {
    key: string;
    label: string;
    children: React.ReactNode;
    meta?: {
        type?: 'session';
        assetId?: string;
    };
}

interface AccessTabContainerProps {
    items: TabItem[];
    activeKey: string;
    leftPanelSize: number;
    onChange: (key: string) => void;
    onRemove: (key: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    tabOperations: {
        handleCloseLeft: (key: string) => void;
        handleCloseRight: (key: string) => void;
        handleCloseAll: () => void;
        handleCloseOthers: (key: string) => void;
        handleReconnect: (key: string) => void;
        handleDuplicateSession: (key: string) => void;
    };
}

/**
 * AccessTabContainer 组件
 * 标签页容器，支持拖拽排序和右键菜单操作
 */
const AccessTabContainer = ({
                                           items,
                                           activeKey,
                                           leftPanelSize,
                                           onChange,
                                           onRemove,
                                           onDragEnd,
                                           tabOperations,
                                       }: AccessTabContainerProps) => {
    const sensor = useSensor(PointerSensor, {activationConstraint: {distance: 10}});

    const handleEdit = (targetKey: string | React.MouseEvent | React.KeyboardEvent, action: 'add' | 'remove') => {
        if (action === 'remove') {
            onRemove(targetKey as string);
        }
    };

    return (
        <ResizablePanel
            id={ACCESS_CONTENT_PANEL_ID}
            defaultSize={100 - leftPanelSize}
            className={'h-full min-h-0 overflow-hidden bg-[#1E1E1E] access-container'}
        >
            <Tabs
                styles={{
                    root: {height: '100%', minHeight: 0, overflow: 'hidden'},
                    body: {height: '100%', minHeight: 0},
                    content: {height: '100%', minHeight: 0, overflow: 'hidden'},
                }}
                items={items.map((item) => ({
                    key: item.key,
                    label: (
                        <TabContextMenu
                            tabKey={item.key}
                            allTabs={items}
                            onCloseLeft={tabOperations.handleCloseLeft}
                            onCloseRight={tabOperations.handleCloseRight}
                            onCloseAll={tabOperations.handleCloseAll}
                            onCloseOthers={tabOperations.handleCloseOthers}
                            onReconnect={tabOperations.handleReconnect}
                            onDuplicateSession={tabOperations.handleDuplicateSession}
                            canDuplicateSession={item.meta?.type === 'session' && Boolean(item.meta.assetId)}
                            canReconnect={item.meta?.type === 'session'}
                        >
                            <span className={'access-tab-label'} title={item.label}>
                                {item.label}
                            </span>
                        </TabContextMenu>
                    ),
                    children: item.meta?.type === 'session' && isValidElement(item.children)
                        ? React.cloneElement(
                            item.children as React.ReactElement<{active?: boolean}>,
                            {active: item.key === activeKey},
                        )
                        : item.children,
                }))}
                hideAdd
                size={'small'}
                type={'editable-card'}
                renderTabBar={(tabBarProps, DefaultTabBar) => (
                    <DndContext
                        sensors={[sensor]}
                        onDragEnd={onDragEnd}
                        collisionDetection={closestCenter}
                    >
                        <SortableContext
                            items={items.map((i) => i.key)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <DefaultTabBar {...tabBarProps}>
                                {(node) => (
                                    <DraggableTabNode
                                        {...(node as React.ReactElement<DraggableTabPaneProps>).props}
                                        key={node.key}
                                    >
                                        {node}
                                    </DraggableTabNode>
                                )}
                            </DefaultTabBar>
                        </SortableContext>
                    </DndContext>
                )}
                activeKey={activeKey}
                onChange={onChange}
                onEdit={handleEdit}
            />
        </ResizablePanel>
    );
};

export default AccessTabContainer;
