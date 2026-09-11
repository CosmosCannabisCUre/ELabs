// Trost Richmond Town store opening — launch content flips to "Now Open" at this moment (IST).
export const TROST_LAUNCH_TS = new Date("2026-09-12T00:00:00+05:30").getTime();

export const isTrostLaunched = () => Date.now() >= TROST_LAUNCH_TS;
