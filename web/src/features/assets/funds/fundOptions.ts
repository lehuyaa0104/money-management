/** Dragon Capital's open-ended funds, offered when adding one; any other code can be typed. The API fetches these funds' NAVs. */
export const DRAGON_CAPITAL_FUNDS = [
  { code: 'DCDS', name: 'Quỹ Đầu tư Chứng khoán Năng động DC' },
  { code: 'DCDE', name: 'Quỹ Đầu tư Cổ phiếu Tập trung Cổ tức DC' },
  { code: 'DCBA', name: 'Quỹ Đầu tư Cân bằng DC' },
  { code: 'DCBF', name: 'Quỹ Đầu tư Trái phiếu DC' },
  { code: 'DCIP', name: 'Quỹ Đầu tư Trái phiếu Gia tăng Thu nhập Cố định DC' },
]

export const DRAGON_CAPITAL = 'Dragon Capital'

/** A NAV older than this many days is flagged so the user can refresh it. */
export const NAV_STALE_DAYS = 7
