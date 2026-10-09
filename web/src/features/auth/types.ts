export interface User {
  id: string
  username: string
  fullName: string
  /** ISO; missing in sessions saved before it was stored. */
  createdAt?: string
  /** Day of month (1–31) budgeting cycles start on; missing in older sessions, meaning 1. */
  cycleStartDay?: number
}

export interface RegisterInput {
  fullName: string
  username: string
  password: string
}
