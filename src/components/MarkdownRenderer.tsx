import React from 'react';
import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
    text: string;
    isMobile?: boolean;
}

const headingClass = 'font-bold first:mt-0';

/**
 * 基于 react-markdown + remark-gfm 的 Markdown 渲染组件，
 * 支持 GFM 表格、删除线、任务列表等扩展语法，
 * 组件样式与 AI 助手气泡的深浅色风格保持一致。
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text, isMobile = false }) => {
    const components: Components = {
        h1: ({node: _node, ...props}) => <h1 className={cn(headingClass, 'mt-4 mb-3', isMobile ? 'text-base' : 'text-xl')} {...props}/>,
        h2: ({node: _node, ...props}) => <h2 className={cn(headingClass, 'mt-3 mb-2', isMobile ? 'text-sm' : 'text-lg')} {...props}/>,
        h3: ({node: _node, ...props}) => <h3 className={cn(headingClass, 'mt-3 mb-2', isMobile ? 'text-sm' : 'text-base')} {...props}/>,
        h4: ({node: _node, ...props}) => <h4 className={cn(headingClass, 'mt-3 mb-2', isMobile ? 'text-sm' : 'text-sm')} {...props}/>,
        h5: ({node: _node, ...props}) => <h5 className={cn(headingClass, 'mt-3 mb-2', 'text-sm')} {...props}/>,
        h6: ({node: _node, ...props}) => <h6 className={cn(headingClass, 'mt-3 mb-2', 'text-sm')} {...props}/>,
        p: ({node: _node, ...props}) => <p className="mb-2 leading-relaxed last:mb-0" {...props}/>,
        ul: ({node: _node, ...props}) => <ul className="mb-3 ml-4 list-inside list-disc last:mb-0 [&>li]:mb-1 [&_.task-list-item]:list-none" {...props}/>,
        ol: ({node: _node, ...props}) => <ol className="mb-3 ml-4 list-inside list-decimal last:mb-0 [&>li]:mb-1 [&_.task-list-item]:list-none" {...props}/>,
        blockquote: ({node: _node, ...props}) => <blockquote className="mb-3 border-l-4 border-gray-300 pl-4 italic last:mb-0 dark:border-white/20" {...props}/>,
        a: ({node: _node, ...props}) => <a className="text-blue-500 hover:underline" target="_blank" rel="noreferrer" {...props}/>,
        pre: ({node: _node, ...props}) => <pre className="mb-3 overflow-x-auto rounded bg-gray-100 p-3 last:mb-0 dark:bg-gray-800" {...props}/>,
        code: ({node: _node, ...props}) => <code className="rounded bg-gray-100 px-1 dark:bg-gray-800" {...props}/>,
        table: ({node: _node, ...props}) => (
            <div className="mb-3 max-w-full overflow-x-auto last:mb-0">
                <table className="w-full border-collapse" {...props}/>
            </div>
        ),
        tr: ({node: _node, ...props}) => <tr className="border-b border-gray-200 last:border-b-0 dark:border-white/10" {...props}/>,
        th: ({node: _node, ...props}) => <th className="whitespace-nowrap border-b border-gray-300 px-2 py-1 font-semibold dark:border-white/20" {...props}/>,
        td: ({node: _node, ...props}) => <td className="px-2 py-1 align-top" {...props}/>,
        hr: ({node: _node, ...props}) => <hr className="my-4 border-gray-200 dark:border-white/10" {...props}/>,
        img: ({node: _node, ...props}) => <img className="max-w-full rounded" {...props}/>,
        input: ({node: _node, ...props}) => <input className="mr-1 align-middle accent-blue-500" {...props}/>,
    };

    return (
        <div
            className={cn(
                'markdown-content',
                isMobile ? 'text-xs' : 'text-sm',
                // 块级代码内的 <code> 不套用行内代码的背景样式
                '[&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:text-inherit',
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {text}
            </ReactMarkdown>
        </div>
    );
};
