"use client"

import { PlusIcon } from "@heroicons/react/20/solid"
import React, { useMemo, useState } from "react"
import { Button as AriaButton } from "react-aria-components"
import { Tag, TagGroup, TagList } from "./tag-group"

interface OptionBase {
  id: string | number
  name: string
}

interface MultipleSelectProps<T extends OptionBase> {
  placeholder?: string
  className?: string
  children?: React.ReactNode
  name?: string
  selectedKeys?: Set<React.Key>
  onSelectionChange?: (keys: Set<React.Key>) => void
  isDisabled?: boolean
}

interface MultipleSelectContentProps<T extends OptionBase> {
  items: Iterable<T>
  children: (item: T) => React.ReactNode
}

function MultipleSelectContent<T extends OptionBase>(_props: MultipleSelectContentProps<T>) {
  return null
}
;(MultipleSelectContent as React.ComponentType).displayName = "MultipleSelectContent"

function MultipleSelect<T extends OptionBase>({
  placeholder = "No selected items",
  className,
  children,
  name,
  selectedKeys = new Set(),
  onSelectionChange,
}: MultipleSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<React.Key>>(selectedKeys)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const { before, after, list } = useMemo(() => {
    const arr = React.Children.toArray(children)
    const idx = arr.findIndex(
      (c) => React.isValidElement(c) && (c.type as React.ComponentType)?.displayName === "MultipleSelectContent",
    )
    if (idx === -1) {
      return { before: arr, after: [], list: null as null | MultipleSelectContentProps<T> }
    }
    const el = arr[idx] as React.ReactElement<MultipleSelectContentProps<T>>
    return { before: arr.slice(0, idx), after: arr.slice(idx + 1), list: el.props }
  }, [children])

  // Sync internal state with external selectedKeys
  React.useEffect(() => {
    setInternalSelectedKeys(selectedKeys)
  }, [selectedKeys])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggleItem = (itemId: React.Key) => {
    const newKeys = new Set(internalSelectedKeys)
    if (newKeys.has(itemId)) {
      newKeys.delete(itemId)
    } else {
      newKeys.add(itemId)
    }
    setInternalSelectedKeys(newKeys)
    onSelectionChange?.(newKeys)
    // Don't close dropdown - allow multiple selections
    // setIsOpen(false)
    // setSearchQuery("")
  }

  const handleRemoveItem = (keys: Set<React.Key>) => {
    const newKeys = new Set(internalSelectedKeys)
    keys.forEach(key => newKeys.delete(key))
    setInternalSelectedKeys(newKeys)
    onSelectionChange?.(newKeys)
  }

  const selectedItems = list ? Array.from(list.items).filter(item => internalSelectedKeys.has(item.id)) : []

  // Filter items based on search query
  const filteredItems = list 
    ? Array.from(list.items).filter(item => {
        const isNotSelected = !internalSelectedKeys.has(item.id)
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        return isNotSelected && matchesSearch
      })
    : []

  return (
    <div className={className || ""} ref={dropdownRef}>
      <input type="hidden" name={name} value={Array.from(internalSelectedKeys).join(',')} />
      {before}
      {list && (
        <div className="relative">
          <div
            data-slot="control"
            className="flex w-full items-center gap-2 rounded-lg border p-1 min-h-[42px]"
          >
            <div className="flex-1">
              <TagGroup
                aria-label="Selected items"
                onRemove={handleRemoveItem}
              >
                <TagList
                  items={selectedItems}
                  renderEmptyState={() => (
                    <i className="pl-2 text-muted-fg text-sm">{placeholder}</i>
                  )}
                >
                  {(item) => <Tag className="rounded-md">{item.name}</Tag>}
                </TagList>
              </TagGroup>
            </div>
            <AriaButton 
              onPress={() => setIsOpen(!isOpen)}
              className="self-end rounded-[calc(var(--radius-lg)-(--spacing(1)))] p-1 bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
            </AriaButton>
          </div>
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full flex flex-col rounded-md border bg-popover p-2 shadow-md max-h-[300px] overflow-hidden">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="space-y-1 overflow-y-auto max-h-[220px]">
                {filteredItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleItem(item.id)
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                    >
                      {list.children(item)}
                    </div>
                  )
                })}
                {filteredItems.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {searchQuery ? "No items found" : "No more items to add"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {after}
    </div>
  )
}

const MultipleSelectItem = ({ children }: { id: string | number; textValue: string; children: React.ReactNode }) => {
  return <>{children}</>
}

export { MultipleSelect, MultipleSelectItem, MultipleSelectContent }
