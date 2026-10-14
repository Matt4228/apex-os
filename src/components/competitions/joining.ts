/** "Week 1 has passed, so it counts as missed. 3 weeks left." What joining now means, before saying yes */
export function joiningNote(invite: { weeksPassed: number; weeksLeft: number; weeks: number; upcoming: boolean }) {
    if (invite.upcoming) return `${invite.weeks} ${invite.weeks === 1 ? "week" : "weeks"}, starting soon.`
    const left = `${invite.weeksLeft} ${invite.weeksLeft === 1 ? "week" : "weeks"} left.`
    if (invite.weeksPassed === 0) return `It started this week. ${left}`
    const passed = invite.weeksPassed === 1 ? "Week 1 has passed, so it counts" : `Weeks 1 to ${invite.weeksPassed} have passed, so they count`
    return `${passed} as missed. ${left}`
}
