"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { buttonVariants } from "@/lib/button-variants"
import { cn } from "@/lib/utils"

function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  render,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  // Base UI's `render` + `useRenderElement` skips ref hooks on the server when `document`
  // is undefined but runs them on the client, which breaks hydration. For `asChild` we
  // merge styles with `cloneElement` instead (same idea as Radix Slot). Do not spread
  // arbitrary `...props` onto the child — leftover button/DOM props cause SSR/client drift.
  if (asChild) {
    if (!React.isValidElement(children)) {
      return null
    }
    const child = children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      ...child.props,
      className: cn(buttonVariants({ variant, size }), child.props.className, className),
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { buttonVariants } from "@/lib/button-variants"
export { Button }
