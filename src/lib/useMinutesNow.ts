import { useSyncExternalStore } from "react"

// The clock as an external store: re-read every 30 seconds, and unknown on the server
function subscribe(onChange: () => void) {
    const id = setInterval(onChange, 30_000)
    return () => clearInterval(id)
}
const nowInMinutes = () => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
}
const unknownOnServer = () => null

/** Minutes since local midnight. Null during server rendering, so the server and the browser agree on the first
 render */
export function useMinutesNow() {
    return useSyncExternalStore(subscribe, nowInMinutes, unknownOnServer)
}

const minutesOf = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":").map(Number)
    return hours * 60 + minutes
}

/** True while `minutes` is inside the block: from its start, up to but not including its end */
export function isHappening(block: { startTime: string; endTime: string }, minutes: number | null) {
    return minutes !== null && minutes >= minutesOf(block.startTime) && minutes < minutesOf(block.endTime)
}