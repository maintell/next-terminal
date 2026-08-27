"use client"

import React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = Omit<React.ComponentProps<typeof ResizablePrimitive.Group>, 'orientation'> & {
  direction?: 'horizontal' | 'vertical'
}

const ResizablePanelGroup = ({
  className,
  direction,
  ...props
}: ResizablePanelGroupProps) => (
  <ResizablePrimitive.Group
    className={cn(
      "flex h-full w-full",
      className
    )}
    orientation={direction}
    {...props}
  />
)

type LegacySize = number | string

type ResizablePanelProps = Omit<
  React.ComponentProps<typeof ResizablePrimitive.Panel>,
  'collapsedSize' | 'defaultSize' | 'maxSize' | 'minSize' | 'onResize' | 'panelRef'
> & {
  collapsedSize?: LegacySize
  defaultSize?: LegacySize
  maxSize?: LegacySize
  minSize?: LegacySize
  order?: number
  onResize?: (size: number, previousSize?: number) => void
}

const toPanelSize = (size?: LegacySize) => typeof size === 'number' ? `${size}%` : size

const ResizablePanel = React.forwardRef<ResizablePrimitive.PanelImperativeHandle, ResizablePanelProps>(({
  collapsedSize,
  defaultSize,
  maxSize,
  minSize,
  onResize,
  order: _order,
  ...props
}, ref) => (
  <ResizablePrimitive.Panel
    {...props}
    collapsedSize={toPanelSize(collapsedSize)}
    defaultSize={toPanelSize(defaultSize)}
    maxSize={toPanelSize(maxSize)}
    minSize={toPanelSize(minSize)}
    onResize={onResize ? (size, _id, previousSize) => {
      onResize(size.asPercentage, previousSize?.asPercentage)
    } : undefined}
    panelRef={ref}
  />
))
ResizablePanel.displayName = 'ResizablePanel'

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:[&>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
