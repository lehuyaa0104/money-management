import { api } from '@/shared/api/apiClient'

/** How many VND one unit of a currency is worth today (Vietcombank's transfer rate). */
export interface ExchangeRate {
  code: string
  name: string
  vnd: number
}

export async function listRates(signal?: AbortSignal): Promise<ExchangeRate[]> {
  const { data } = await api.get<{ rates: ExchangeRate[] }>('/rates', { signal })
  return data.rates
}
