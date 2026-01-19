"use client"

import React from "react"
import {
  SearchField as AriaSearchField,
  Input,
  type SearchFieldProps as AriaSearchFieldProps,
} from "react-aria-components"
import { cx } from "@/lib/primitive"

interface SearchFieldProps extends AriaSearchFieldProps {
  className?: string
}

const SearchField = React.forwardRef<HTMLDivElement, SearchFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaSearchField
        ref={ref}
        className={cx("relative flex w-full items-center", className)}
        {...props}
      />
    )
  }
)
SearchField.displayName = "SearchField"

interface SearchInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  className?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cx(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchField, SearchInput }
