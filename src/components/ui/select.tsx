"use client"

import type { ComponentProps } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// A styled dropdown. A native <select> opens a menu drawn by the operating system, which CSS can't style
// and which can spill off small screens. Radix draws the menu itself, keeps it on screen, and keeps the
// keyboard and screen reader behavior of a real select

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export const SelectGroup = SelectPrimitive.Group

/** A small heading over a group of options */
export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
    return <SelectPrimitive.Label className={cn("px-2 pt-2 pb-1 text-xs font-medium text-ink-muted", className)} {...props} />
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
    return <SelectPrimitive.Separator className={cn("my-1 h-px bg-line", className)} {...props} />
}

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            className={cn(
                "inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-xs text-ink-muted",
                "hover:border-line focus-visible:border-line-strong focus-visible:outline-none data-[state=open]:border-line-strong",
                "transition-colors [&>span]:truncate",
                className,
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown size={12} aria-hidden="true" className="flex-shrink-0" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
}

export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            {/* "popper" opens the menu below the trigger, and collisionPadding keeps it 8px inside the screen */}
            <SelectPrimitive.Content
                position="popper"
                sideOffset={4}
                collisionPadding={8}
                className={cn(
                    "z-50 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden",
                    "max-h-[var(--radix-select-content-available-height)]",
                    "rounded-lg border border-line bg-surface p-1 text-ink shadow-lg",
                    className,
                )}
                {...props}
            >
                <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            className={cn(
                "relative flex cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-3 text-sm text-ink-soft outline-none",
                "data-[highlighted]:bg-sunken data-[highlighted]:text-ink data-[state=checked]:text-ink",
                className,
            )}
            {...props}
        >
            <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
                <Check size={14} aria-hidden="true" className="text-accent-ink" />
            </SelectPrimitive.ItemIndicator>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
}
