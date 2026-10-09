const unitsFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const navFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** 183.47 → "183,47" */
export const formatUnits = (units: number) => unitsFormat.format(units)
/** NAV per unit, which funds quote with decimals: 25430.12 → "25.430,12". */
export const formatNav = (nav: number) => navFormat.format(nav)
