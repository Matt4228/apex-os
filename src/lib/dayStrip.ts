const minutesOf = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":").map(Number)
    return hours * 60 + minutes
}

export type StripLayout = {
    /** Where the lane starts and ends, in minutes since midnight, on whole hours */
    start: number
    end: number
    /** Hour marks under the lane, in minutes: both ends, plus every third hour between them */
    ticks: number[]
    /** Each block's place on the lane, as percentages of its width */
    bars: { id: string; left: number; width: number }[]
}

/**
 * Lays today's blocks out on one horizontal lane, from the first block's start hour to the last block's end hour.
 * Null when there is nothing to draw
 */
export function stripLayout(blocks: { id: string; startTime: string; endTime: string }[]): StripLayout | null {
    const timed = blocks
        .map(block => ({ id: block.id, from: minutesOf(block.startTime), to: minutesOf(block.endTime) }))
        .filter(block => block.to > block.from)
    if (timed.length === 0) return null

    const start = Math.floor(Math.min(...timed.map(b => b.from)) / 60) * 60
    const end = Math.ceil(Math.max(...timed.map(b => b.to)) / 60) * 60
    const percent = (minutes: number) => ((minutes - start) / (end - start)) * 100

    const ticks = [start]
    for (let hour = start / 60 + 1; hour < end / 60; hour++) if (hour % 3 === 0) ticks.push(hour * 60)
    ticks.push(end)

    return {
        start,
        end,
        ticks,
        bars: timed.map(b => ({ id: b.id, left: percent(b.from), width: percent(b.to) - percent(b.from) })),
    }
}
