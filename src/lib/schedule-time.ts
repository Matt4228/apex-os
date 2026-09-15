export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function snapToGrid(minutes: number, increment: number): number {
    return Math.round(minutes / increment) * increment
}

type TimeRange = {
    id: string
    startMinutes: number
    endMinutes: number
}

type LayoutedBlock<T extends TimeRange> = T & {
    column: number
    columnCount: number
}

export function layoutOverlaps<T extends TimeRange>(blocks: T[]): LayoutedBlock<T>[] {
    const sorted = [...blocks].sort(
        (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
    )

    const result: LayoutedBlock<T>[] = []
    let columnEnds: number[] = []
    let cluster: LayoutedBlock<T>[] = []
    let clusterEnd = -Infinity

    function flushCluster() {
        if (cluster.length === 0) return
        const columnCount = Math.max(...cluster.map(b => b.column)) + 1
        for (const block of cluster) {
            result.push({ ...block, columnCount })
        }
        cluster = []
    }

    for (const block of sorted) {
        if (block.startMinutes >= clusterEnd) {
            flushCluster()
            columnEnds = []
            clusterEnd = -Infinity
        }

        let column = columnEnds.findIndex(end => end <= block.startMinutes)
        if (column === -1) {
            column = columnEnds.length
            columnEnds.push(block.endMinutes)
        } else {
            columnEnds[column] = block.endMinutes
        }

        cluster.push({ ...block, column, columnCount: 0 })
        clusterEnd = Math.max(clusterEnd, block.endMinutes)
    }
    flushCluster()

    return result
}

export function minutesToPixels(minutes: number, pxPerMinute: number): number {
    return minutes * pxPerMinute
}

export function pixelsToMinutes(pixels: number, pxPerMinute: number): number {
    return pixels / pxPerMinute
}

// Initial scroll positiion for the 24-hour grid. Note: may switch to dynamically bounding the frid to each user's actual block range instead of a fixed scroll target
export const SCROLL_TO_HOUR = 6