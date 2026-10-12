import { fromVnd, inputDecimals } from '@/shared/utils/currency'

const unitsFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** 183.47 → "183,47" */
export const formatUnits = (units: number) => unitsFormat.format(units)
/** NAV per unit (VND, quoted with decimals) in the display currency: "25.430,12", or "0,9899" in USD. */
export const formatNav = (nav: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: inputDecimals(2) }).format(fromVnd(nav))
