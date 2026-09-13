// 侧栏宽度统一使用固定像素，交给 react-resizable-panels 按像素求解布局，
// 不与百分比 flexGrow 混用，避免窗口缩小时布局冲突
export const ACCESS_SIDEBAR_DEFAULT_WIDTH = 240; // 默认宽度，同时是最小宽度
export const ACCESS_SIDEBAR_MAX_WIDTH = 480; // 可拖拽的最大宽度
export const ACCESS_SIDEBAR_COLLAPSED_SIZE = 0; // 折叠后的尺寸
export const ACCESS_SIDEBAR_PANEL_ID = 'access-sidebar';
export const ACCESS_CONTENT_PANEL_ID = 'access-content';
