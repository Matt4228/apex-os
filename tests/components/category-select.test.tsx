// tests/components/category-select.test.tsx
// @vitest-environment jsdom
import { CategoriesProvider, CategorySelect, useCategories } from "@/components/ui/category-select"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

type User = ReturnType<typeof userEvent.setup>

const picker = () => screen.getByRole("combobox", { name: "Category" })
const saved = () => (document.querySelector('input[type="hidden"][name="category"]') as HTMLInputElement).value

// The picker is a Radix select: open it, then choose from the menu it draws
async function pick(user: User, name: string) {
    await user.click(picker())
    await user.click(await screen.findByRole("option", { name }))
}

function renderPicker(props: { defaultValue?: string | null } = {}, categories: string[] = []) {
    render(
        <CategoriesProvider categories={categories}>
            <CategorySelect name="category" {...props} />
        </CategoriesProvider>
    )
}

describe("CategorySelect", () => {
    it("lists no category, the standard ones with their colors, yours, then a new one", async () => {
        const user = userEvent.setup()
        renderPicker({}, ["Side projects", "work"])

        await user.click(picker())

        expect(screen.getAllByRole("option").map(o => o.textContent)).toEqual([
            "No category",
            "Career", "Finance", "Fitness", "Health", "Learning", "Personal", "Wellness", "Work",
            "Side projects",
            "New category...",
        ])
        // "work" is the standard Work, so it isn't listed twice; each name carries its color
        expect(screen.getByRole("option", { name: "Work" }).querySelector("[data-cat]")).toHaveAttribute("data-cat", "4")
        expect(within(screen.getByRole("group", { name: "Yours" })).getByRole("option")).toHaveTextContent("Side projects")
    })

    it("starts on no category, which saves as empty", () => {
        renderPicker()

        expect(picker()).toHaveTextContent("No category")
        expect(saved()).toBe("")
    })

    it("saves the category picked", async () => {
        const user = userEvent.setup()
        renderPicker()

        await pick(user, "Career")

        expect(picker()).toHaveTextContent("Career")
        expect(saved()).toBe("Career")
    })

    it("names a new category in a box that shows its color", async () => {
        const user = userEvent.setup()
        renderPicker()

        expect(screen.queryByRole("textbox", { name: "New category name" })).not.toBeInTheDocument()
        await pick(user, "New category...")
        await user.type(screen.getByRole("textbox", { name: "New category name" }), "  Side projects ")

        expect(screen.getByTestId("new-category-dot")).toHaveAttribute("data-cat")
        expect(saved()).toBe("Side projects")
    })

    it("hides the new name box again when a listed category is picked", async () => {
        const user = userEvent.setup()
        renderPicker()

        await pick(user, "New category...")
        await pick(user, "Fitness")

        expect(screen.queryByRole("textbox", { name: "New category name" })).not.toBeInTheDocument()
        expect(saved()).toBe("Fitness")
    })

    it("shows a saved category whatever its case, and saves it in the listed spelling", () => {
        renderPicker({ defaultValue: "career" })

        expect(picker()).toHaveTextContent("Career")
        expect(saved()).toBe("Career")
    })

    it("lists a saved custom category under yours even before it is remembered", async () => {
        const user = userEvent.setup()
        renderPicker({ defaultValue: "Band practice" })

        expect(picker()).toHaveTextContent("Band practice")
        await user.click(picker())
        expect(within(screen.getByRole("group", { name: "Yours" })).getByRole("option")).toHaveTextContent("Band practice")
    })

    it("offers a newly saved category in the next picker without a reload", async () => {
        const user = userEvent.setup()
        // Stands in for a form that just saved a habit or goal in "Music"
        function SavedForm() {
            const { remember } = useCategories()
            return <button onClick={() => remember("Music")}>Save</button>
        }
        render(
            <CategoriesProvider categories={[]}>
                <SavedForm />
                <CategorySelect name="category" />
            </CategoriesProvider>
        )

        await user.click(screen.getByRole("button", { name: "Save" }))
        await user.click(picker())

        expect(within(screen.getByRole("group", { name: "Yours" })).getByRole("option")).toHaveTextContent("Music")
    })
})
