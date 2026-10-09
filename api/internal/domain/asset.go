package domain

import (
	"bytes"
	"context"
	"encoding/json"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

type AssetKind string

const (
	AssetSavings AssetKind = "savings" // bank term deposit (sổ tiết kiệm)
	AssetFund    AssetKind = "fund"    // open-ended fund units (chứng chỉ quỹ mở)

	AssetNameMax          = 60
	AssetBankMax          = 40
	AssetFundCodeMax      = 15
	AssetTermMonthsMax    = 120
	AssetFundTxMax        = 1000
	AssetFundUnitsMax     = 1_000_000_000
	assetFundTxIDMax      = 64
	assetFundUnitsEpsilon = 1e-6 // float noise from fractional units isn't an oversell
)

var (
	ErrAssetDetailsInvalid = Validation("details_invalid", "Thông tin tài sản không hợp lệ")
	ErrFundOversold        = Validation("fund_oversold", "Có giao dịch bán nhiều hơn số chứng chỉ quỹ đang có")
)

// Asset is a savings deposit or a fund holding. Fields every kind has are columns;
// Details is a JSON document whose shape depends on Kind (SavingsDetails or FundDetails).
type Asset struct {
	ID        string
	UserID    string
	Kind      AssetKind
	Name      string
	Details   []byte
	CreatedAt time.Time
	UpdatedAt time.Time
}

type AssetRepository interface {
	Create(ctx context.Context, asset *Asset) error
	// List returns the user's assets, newest first.
	List(ctx context.Context, userID string) ([]Asset, error)
	// FindByID, Update and Delete return ErrNotFound if the asset doesn't exist or isn't the user's.
	FindByID(ctx context.Context, userID, id string) (*Asset, error)
	Update(ctx context.Context, asset *Asset) error
	Delete(ctx context.Context, userID, id string) error
}

// SavingsDetails describes a bank deposit. Interest and maturity are derived from it, not stored.
type SavingsDetails struct {
	Bank           string  `json:"bank"`
	Amount         int64   `json:"amount"`     // principal, VND
	Rate           float64 `json:"rate"`       // percent per year
	TermMonths     int     `json:"termMonths"` // 0 = no term
	OpenedAt       string  `json:"openedAt"`   // YYYY-MM-DD
	InterestPayout string  `json:"interestPayout"`
	OnMaturity     string  `json:"onMaturity"`
}

var (
	interestPayouts = map[string]bool{"maturity": true, "monthly": true, "upfront": true}
	onMaturities    = map[string]bool{"rollover_all": true, "rollover_principal": true, "close": true}
)

// FundDetails holds a fund's code, the last NAV entered and every trade; the position is derived from them.
type FundDetails struct {
	Code         string            `json:"code"`
	Manager      string            `json:"manager"`
	Nav          float64           `json:"nav"`     // VND per unit; 0 until one is entered
	NavDate      string            `json:"navDate"` // YYYY-MM-DD, or "" with no NAV
	Transactions []FundTransaction `json:"transactions"`
}

// FundTransaction is one buy or sell as printed on the trade confirmation.
type FundTransaction struct {
	ID     string  `json:"id"`   // made by the client, unique within the fund
	Type   string  `json:"type"` // "buy" or "sell"
	Date   string  `json:"date"`
	Units  float64 `json:"units"`
	Amount int64   `json:"amount"` // VND paid (fees included) or received (after fees and tax)
	Nav    float64 `json:"nav"`
}

// Prepare trims the asset, checks Details against Kind and rewrites them in canonical
// form (trimmed, no unknown fields). Dates may be at most a day after now, since the
// client's calendar day can be ahead of UTC.
func (a *Asset) Prepare(now time.Time) error {
	a.Name = strings.TrimSpace(a.Name)
	if utf8.RuneCountInString(a.Name) > AssetNameMax {
		return Validation("name_too_long", "Tên tối đa 60 ký tự")
	}
	latest := now.AddDate(0, 0, 1).Format(DateLayout)
	var details any
	switch a.Kind {
	case AssetSavings:
		var d SavingsDetails
		if err := decodeStrict(a.Details, &d); err != nil {
			return err
		}
		if err := d.normalize(latest); err != nil {
			return err
		}
		details = d
	case AssetFund:
		var d FundDetails
		if err := decodeStrict(a.Details, &d); err != nil {
			return err
		}
		if err := d.normalize(latest); err != nil {
			return err
		}
		details = d
	default:
		return Validation("kind_invalid", "Loại tài sản không hợp lệ")
	}
	canonical, err := json.Marshal(details)
	if err != nil {
		return err
	}
	a.Details = canonical
	return nil
}

// decodeStrict accepts exactly one JSON object with only known fields.
func decodeStrict(raw []byte, v any) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if len(bytes.TrimSpace(raw)) == 0 || dec.Decode(v) != nil || dec.More() {
		return ErrAssetDetailsInvalid
	}
	return nil
}

func (d *SavingsDetails) normalize(latest string) error {
	d.Bank = strings.TrimSpace(d.Bank)
	switch {
	case d.Bank == "":
		return Validation("bank_required", "Vui lòng chọn ngân hàng")
	case utf8.RuneCountInString(d.Bank) > AssetBankMax:
		return Validation("bank_too_long", "Tên ngân hàng tối đa 40 ký tự")
	case d.Amount <= 0 || d.Amount > MaxAmount:
		return Validation("amount_invalid", "Số tiền gửi không hợp lệ")
	case d.Rate < 0 || d.Rate > 100:
		return Validation("rate_invalid", "Lãi suất phải từ 0 đến 100%")
	case d.TermMonths < 0 || d.TermMonths > AssetTermMonthsMax:
		return Validation("term_invalid", "Kỳ hạn không hợp lệ")
	case !interestPayouts[d.InterestPayout]:
		return Validation("interest_payout_invalid", "Cách nhận lãi không hợp lệ")
	case !onMaturities[d.OnMaturity]:
		return Validation("on_maturity_invalid", "Lựa chọn khi đến hạn không hợp lệ")
	}
	return validateDate(d.OpenedAt, latest)
}

func (d *FundDetails) normalize(latest string) error {
	d.Code = strings.ToUpper(strings.TrimSpace(d.Code))
	d.Manager = strings.TrimSpace(d.Manager)
	switch {
	case d.Code == "":
		return Validation("code_required", "Vui lòng nhập mã quỹ")
	case utf8.RuneCountInString(d.Code) > AssetFundCodeMax:
		return Validation("code_too_long", "Mã quỹ tối đa 15 ký tự")
	case utf8.RuneCountInString(d.Manager) > AssetNameMax:
		return Validation("manager_too_long", "Tên công ty quản lý quỹ tối đa 60 ký tự")
	case d.Nav < 0 || d.Nav > float64(MaxAmount):
		return Validation("nav_invalid", "NAV không hợp lệ")
	case len(d.Transactions) > AssetFundTxMax:
		return Validation("transactions_too_many", "Quá nhiều giao dịch")
	}
	if d.NavDate != "" {
		if err := validateDate(d.NavDate, latest); err != nil {
			return err
		}
	}
	if d.Transactions == nil {
		d.Transactions = []FundTransaction{} // stored and returned as [], never null
	}
	ids := make(map[string]bool, len(d.Transactions))
	for _, t := range d.Transactions {
		switch {
		case t.ID == "" || len(t.ID) > assetFundTxIDMax || ids[t.ID]:
			return Validation("transaction_id_invalid", "Mã giao dịch không hợp lệ hoặc bị trùng")
		case t.Type != "buy" && t.Type != "sell":
			return Validation("transaction_type_invalid", "Loại giao dịch phải là mua hoặc bán")
		case t.Units <= 0 || t.Units > AssetFundUnitsMax:
			return Validation("units_invalid", "Số chứng chỉ quỹ phải lớn hơn 0")
		case t.Amount <= 0 || t.Amount > MaxAmount:
			return Validation("amount_invalid", "Số tiền giao dịch không hợp lệ")
		case t.Nav <= 0 || t.Nav > float64(MaxAmount):
			return Validation("nav_invalid", "NAV không hợp lệ")
		}
		if err := validateDate(t.Date, latest); err != nil {
			return err
		}
		ids[t.ID] = true
	}
	if d.oversold() {
		return ErrFundOversold
	}
	return nil
}

// oversold reports whether, in date order, a sell takes more units than were held then.
func (d *FundDetails) oversold() bool {
	txs := append([]FundTransaction(nil), d.Transactions...)
	sort.SliceStable(txs, func(i, j int) bool { return txs[i].Date < txs[j].Date })
	units := 0.0
	for _, t := range txs {
		if t.Type == "buy" {
			units += t.Units
			continue
		}
		if t.Units > units+assetFundUnitsEpsilon {
			return true
		}
		units -= t.Units
	}
	return false
}

func validateDate(date, latest string) error {
	if _, err := time.Parse(DateLayout, date); err != nil {
		return Validation("date_invalid", "Ngày không hợp lệ")
	}
	if date > latest {
		return Validation("date_in_future", "Ngày không được sau hôm nay")
	}
	return nil
}
