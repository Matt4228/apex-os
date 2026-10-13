import { useSyncExternalStore } from "react"

// Open and closed sections remembered in this browser. Storage can be missing or blocked (private windows,
// blocked site data), so every read and write is guarded and a copy lives in memory for this visit

const memory = new Map<string, string>()
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
    listeners.add(onChange)
    window.addEventListener("storage", onChange)
    return () => {
        listeners.delete(onChange)
        window.removeEventListener("storage", onChange)
    }
}

function read(key: string): string | null {
    try {
        const stored = window.localStorage.getItem(key)
        if (stored !== null) return stored
    } catch {
        // Fall through to this visit's copy
    }
    return memory.get(key) ?? null
}

function parse(raw: string | null): Record<string, boolean> {
    try {
        const value = raw ? JSON.parse(raw) : {}
        return typeof value === "object" && value !== null ? value : {}
    } catch {
        return {}
    }
}

/**
 * One text value remembered in this browser, or null before anything is saved. The server and the first render
 * in the browser see null, then the saved value applies
 */
export function useStoredValue(key: string): [string | null, (value: string) => void] {
    const raw = useSyncExternalStore(subscribe, () => read(key), () => null)

    function save(value: string) {
        try {
            window.localStorage.setItem(key, value)
        } catch {
            memory.set(key, value) // Remembered for this visit only
        }
        listeners.forEach(listener => listener())
    }

    return [raw, save]
}

/**
 * Which sections are open, by id. The server doesn't know what this browser saved, so the server and the
 * first render in the browser use `defaults`, then the saved choices apply
 */
export function useStoredToggles(key: string, defaults: Record<string, boolean>) {
    const [raw, save] = useStoredValue(key)
    const saved = parse(raw)
    const isOpen = (id: string) => saved[id] ?? defaults[id] ?? false

    function toggle(id: string) {
        save(JSON.stringify({ ...saved, [id]: !isOpen(id) }))
    }

    return { isOpen, toggle }
}
