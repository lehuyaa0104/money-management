package domain

import (
	"context"
	"time"
	"unicode/utf8"
)

type TransactionType = CategoryType // a transaction is income or expense, like its category

const (
	// MaxAmount is 999 tỷ — the most the web keypad accepts (12 digits). VND has no decimals.
	MaxAmount   int64 = 999_999_999_999
	NoteMax           = 100
	DateLayout        = "2006-01-02"
	MonthLayout       = "2006-01"
)

var (
	ErrCategoryNotFound     = Validation("category_not_found", "Danh mục không tồn tại")
	ErrCategoryTypeMismatch = Validation("category_type_mismatch", "Danh mục không khớp với loại giao dịch")
)

type Transaction struct {
	ID     string
	UserID string
	Type   TransactionType
	Amount int64
	// CategoryID becomes empty if the category is deleted later; CategoryName
	// keeps the name it had when the transaction was saved.
	CategoryID   string
	CategoryName string
	// Date is the calendar day in the user's local time ("YYYY-MM-DD").
	Date string
	Note string
	// OccurredAt is when it happened (the date + time the user picked).
	OccurredAt time.Time
	CreatedAt  time.Time
}

// TransactionFilter narrows a list to a date range; empty bounds are open.
type TransactionFilter struct {
	From string // "YYYY-MM-DD", inclusive
	To   string // "YYYY-MM-DD", inclusive
}

func (f TransactionFilter) Validate() error {
	for _, d := range []string{f.From, f.To} {
		if d == "" {
			continue
		}
		if _, err := time.Parse(DateLayout, d); err != nil {
			return Validation("date_invalid", "Ngày không hợp lệ")
		}
	}
	// Same-length ISO dates compare correctly as strings.
	if f.From != "" && f.To != "" && f.From > f.To {
		return Validation("date_range_invalid", "Ngày bắt đầu phải trước ngày kết thúc")
	}
	return nil
}

type TransactionRepository interface {
	Create(ctx context.Context, tx *Transaction) error
	// List returns the user's transactions, newest first (by date, then time).
	List(ctx context.Context, userID string, filter TransactionFilter) ([]Transaction, error)
	// Delete returns ErrNotFound if the transaction doesn't exist or isn't the user's.
	Delete(ctx context.Context, userID, id string) error
}

func (t *Transaction) Validate() error {
	if t.Type != CategoryExpense && t.Type != CategoryIncome {
		return Validation("type_invalid", "Loại giao dịch không hợp lệ")
	}
	if t.Amount <= 0 {
		return Validation("amount_invalid", "Số tiền phải lớn hơn 0")
	}
	if t.Amount > MaxAmount {
		return Validation("amount_too_large", "Số tiền quá lớn")
	}
	if t.CategoryID == "" {
		return Validation("category_required", "Vui lòng chọn danh mục")
	}
	if _, err := time.Parse(DateLayout, t.Date); err != nil {
		return Validation("date_invalid", "Ngày không hợp lệ")
	}
	if utf8.RuneCountInString(t.Note) > NoteMax {
		return Validation("note_too_long", "Ghi chú tối đa 100 ký tự")
	}
	return nil
}
