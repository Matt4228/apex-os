export function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
    return (
        <div
            role="status"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-4
rounded-lg bg-primary px-4 py-3 text-sm text-white shadow-lg"
        >
            <span className="truncate">{message}</span>
            <button
                onClick={onUndo}
                className="shrink-0 rounded font-semibold underline underline-offset-2 hover:no-underline focus:outline-none
focus-visible:ring-2 focus-visible:ring-white"
            >
                Undo
            </button>
        </div>
    )
}