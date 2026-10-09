package domain

// FundNav is an open-ended fund's published NAV per unit on a trading date.
type FundNav struct {
	Code string  // the fund's current code, e.g. DCDS
	Nav  float64 // VND per unit
	Date string  // trading date, YYYY-MM-DD
}
