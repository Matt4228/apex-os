"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { STANDARD_CATEGORIES, catProps, uniqueCategories } from "@/lib/categoryColor"

type Categories = { categories: string[]; remember: (name: string | null | undefined) => void }

const CategoriesContext = createContext<Categories>({ categories: [], remember: () => {} })

/**
 * The user's categories across blocks, goals and habits, loaded once by the dashboard layout. A form that saves a
 * new name calls remember(), so the next picker offers it without a reload
 */
export function CategoriesProvider({ categories: initial, children }: { categories: string[]; children: ReactNode }) {
    const [categories, setCategories] = useState(initial)
    const remember = useCallback((name: string | null | undefined) => {
        if (name?.trim()) setCategories(current => uniqueCategories([...current, name]))
    }, [])
    const value = useMemo(() => ({ categories, remember }), [categories, remember])
    return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export const useCategories = () => useContext(CategoriesContext)

// Radix reserves the empty string, so "no category" and "make a new one" need values of their own
const NONE = "__none__"
const NEW = "__new__"

/** A category's color dot beside its name */
function CategoryName({ name }: { name: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span {...catProps(name)} aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-cat-solid" />
            {name}
        </span>
    )
}

/**
 * Pick a category: none, a standard one, one of the user's own, or a new one named in a box below.
 * Inside a form, `name` adds a hidden input so FormData carries the choice ("" for none)
 */
export function CategorySelect({
    name,
    defaultValue,
    onChange,
}: {
    name?: string
    defaultValue?: string | null
    onChange?: (category: string) => void
}) {
    const { categories } = useCategories()
    const [category, setCategory] = useState(defaultValue ?? "")
    const [addingNew, setAddingNew] = useState(false)

    // Standard categories first, then the user's own; a name matching a standard one (any case) is that one
    const standardKeys = new Set(STANDARD_CATEGORIES.map(c => c.toLowerCase()))
    const yours = uniqueCategories([...categories, defaultValue]).filter(c => !standardKeys.has(c.toLowerCase()))
    const options = [...STANDARD_CATEGORIES, ...yours]
    const chosen = options.find(c => c.toLowerCase() === category.trim().toLowerCase())
    const selectValue = addingNew ? NEW : chosen ?? NONE

    function update(next: string) {
        setCategory(next)
        onChange?.(next)
    }

    function pick(value: string) {
        setAddingNew(value === NEW)
        update(value === NEW || value === NONE ? "" : value)
    }

    return (
        <div className="space-y-2">
            {name && <input type="hidden" name={name} value={addingNew ? category.trim() : chosen ?? ""} />}
            <Select value={selectValue} onValueChange={pick}>
                <SelectTrigger
                    aria-label="Category"
                    className="h-10 w-full justify-between border-line bg-surface px-3 text-sm text-ink hover:border-line-strong"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    <SelectSeparator />
                    <SelectGroup>
                        <SelectLabel>Standard</SelectLabel>
                        {STANDARD_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>
                                <CategoryName name={c} />
                            </SelectItem>
                        ))}
                    </SelectGroup>
                    {yours.length > 0 && (
                        <SelectGroup>
                            <SelectLabel>Yours</SelectLabel>
                            {yours.map(c => (
                                <SelectItem key={c} value={c}>
                                    <CategoryName name={c} />
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    )}
                    <SelectSeparator />
                    <SelectItem value={NEW}>New category...</SelectItem>
                </SelectContent>
            </Select>

            {addingNew && (
                <div className="relative">
                    <Input
                        aria-label="New category name"
                        placeholder="Name your category"
                        value={category}
                        onChange={e => update(e.target.value)}
                        className="pr-8"
                        autoFocus
                    />
                    {/* Its color, as soon as there is a name to take it from */}
                    <span
                        {...catProps(category)}
                        data-testid="new-category-dot"
                        aria-hidden="true"
                        className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cat-solid"
                    />
                </div>
            )}
        </div>
    )
}
