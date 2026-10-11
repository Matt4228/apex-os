"use client"

  import { useEffect, useRef, useState } from "react"
  import { succeeded } from "@/lib/optimistic"

  export const UNDO_WINDOW_MS = 8000

  type PendingDelete = { id: string; label: string }

  /**
   * Delete with an undo window, like Gmail. The item is hidden right away, but the server
   * delete only runs once the window closes, so Undo has nothing to roll back.
   */
  export function useUndoableDelete(
      remove: (id: string) => Promise<unknown>,
      onError: (message: string) => void,
  ) {
      const [pending, setPending] = useState<PendingDelete | null>(null)
      const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
      const pendingRef = useRef<PendingDelete | null>(null)
      const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

      function unhide(id: string) {
          setHiddenIds(current => {
              const next = new Set(current)
              next.delete(id)
              return next
          })
      }

      function takePending() {
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = null
          const item = pendingRef.current
          pendingRef.current = null
          setPending(null)
          return item
      }

      async function commit() {
          const item = takePending()
          if (!item) return
          if (!(await succeeded(remove(item.id)))) {
              unhide(item.id)
              onError(`Couldn't delete "${item.label}". Check your connection and try again.`)
          }
      }

      function requestDelete(id: string, label: string) {
          void commit() // One undo at a time: an earlier pending delete goes through now
          setHiddenIds(current => new Set(current).add(id))
          pendingRef.current = { id, label }
          setPending({ id, label })
          timerRef.current = setTimeout(() => void commit(), UNDO_WINDOW_MS)
      }

      function undo() {
          const item = takePending()
          if (item) unhide(item.id)
      }

      // Leaving the page counts as "didn't undo", so send any pending delete now
      useEffect(() => {
          return () => {
              if (timerRef.current) clearTimeout(timerRef.current)
              if (pendingRef.current) void remove(pendingRef.current.id)
          }
      }, [remove])

      return { pending, undo, requestDelete, isHidden: (id: string) => hiddenIds.has(id) }
  }