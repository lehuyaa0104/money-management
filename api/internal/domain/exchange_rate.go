package domain

// ExchangeRate is how many VND one unit of a currency is worth today.
type ExchangeRate struct {
	Code string  // ISO 4217, e.g. USD
	Name string  // as the source names it, e.g. US DOLLAR
	VND  float64 // VND per unit
}
