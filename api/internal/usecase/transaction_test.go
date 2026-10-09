package usecase_test

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/testutil"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

var fixedNow = time.Date(2026, 10, 8, 3, 0, 0, 0, time.UTC)

// newTransactions returns the use case plus the IDs of u1's "Cà phê" (expense) and "Lương" (income).
func newTransactions(t *testing.T) (*usecase.TransactionUsecase, *testutil.MemoryTransactions, string, string) {
	t.Helper()
	ctx := context.Background()
	n := 0
	newID := func() string { n++; return fmt.Sprintf("id-%d", n) }
	now := func() time.Time { return fixedNow }
	categories := &testutil.MemoryCategories{}
	cats := usecase.NewCategoryUsecase(categories, now, newID)
	coffee, err := cats.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "expense", Name: "Cà phê", Icon: "Coffee", Color: "#78716c"})
	if err != nil {
		t.Fatal(err)
	}
	salary, err := cats.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "income", Name: "Lương", Icon: "Banknote", Color: "#16a34a"})
	if err != nil {
		t.Fatal(err)
	}
	repo := &testutil.MemoryTransactions{}
	return usecase.NewTransactionUsecase(repo, categories, now, newID), repo, coffee.ID, salary.ID
}

func TestCreateTransaction(t *testing.T) {
	uc, repo, coffee, _ := newTransactions(t)
	occurred := time.Date(2026, 10, 8, 9, 30, 0, 0, time.FixedZone("ICT", 7*3600))

	tx, err := uc.Create(context.Background(), "u1", usecase.CreateTransactionInput{
		Type: "expense", Amount: 45000, CategoryID: coffee, Date: "2026-10-08", Note: "  Highlands  ", OccurredAt: &occurred,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if tx.CategoryName != "Cà phê" || tx.Note != "Highlands" || tx.UserID != "u1" || !tx.CreatedAt.Equal(fixedNow) {
		t.Fatalf("unexpected transaction: %+v", tx)
	}
	if !tx.OccurredAt.Equal(occurred) || tx.OccurredAt.Location() != time.UTC {
		t.Fatalf("occurredAt must be kept and stored in UTC, got %v", tx.OccurredAt)
	}
	if len(repo.Transactions) != 1 {
		t.Fatalf("stored %d transactions", len(repo.Transactions))
	}

	noTime, err := uc.Create(context.Background(), "u1", usecase.CreateTransactionInput{Type: "expense", Amount: 1000, CategoryID: coffee, Date: "2026-10-08"})
	if err != nil || !noTime.OccurredAt.Equal(fixedNow) {
		t.Fatalf("occurredAt should default to now: %v %v", noTime, err)
	}
}

func TestCreateTransactionCategoryRules(t *testing.T) {
	uc, repo, coffee, salary := newTransactions(t)
	ctx := context.Background()

	if _, err := uc.Create(ctx, "u1", usecase.CreateTransactionInput{Type: "expense", Amount: 1000, CategoryID: salary, Date: "2026-10-08"}); !errors.Is(err, domain.ErrCategoryTypeMismatch) {
		t.Fatalf("expense under an income category = %v, want ErrCategoryTypeMismatch", err)
	}
	if _, err := uc.Create(ctx, "u1", usecase.CreateTransactionInput{Type: "expense", Amount: 1000, CategoryID: "nope", Date: "2026-10-08"}); !errors.Is(err, domain.ErrCategoryNotFound) {
		t.Fatalf("unknown category = %v, want ErrCategoryNotFound", err)
	}
	if _, err := uc.Create(ctx, "u2", usecase.CreateTransactionInput{Type: "expense", Amount: 1000, CategoryID: coffee, Date: "2026-10-08"}); !errors.Is(err, domain.ErrCategoryNotFound) {
		t.Fatalf("another user's category = %v, want ErrCategoryNotFound", err)
	}
	if len(repo.Transactions) != 0 {
		t.Fatalf("nothing should be stored, got %d", len(repo.Transactions))
	}
}

func TestCreateTransactionValidation(t *testing.T) {
	uc, _, coffee, _ := newTransactions(t)
	valid := usecase.CreateTransactionInput{Type: "expense", Amount: 45000, CategoryID: coffee, Date: "2026-10-08"}
	cases := map[string]struct {
		edit func(*usecase.CreateTransactionInput)
		code string
	}{
		"bad type":       {func(in *usecase.CreateTransactionInput) { in.Type = "transfer" }, "type_invalid"},
		"zero amount":    {func(in *usecase.CreateTransactionInput) { in.Amount = 0 }, "amount_invalid"},
		"negative":       {func(in *usecase.CreateTransactionInput) { in.Amount = -5 }, "amount_invalid"},
		"too large":      {func(in *usecase.CreateTransactionInput) { in.Amount = domain.MaxAmount + 1 }, "amount_too_large"},
		"no category":    {func(in *usecase.CreateTransactionInput) { in.CategoryID = "" }, "category_required"},
		"bad date":       {func(in *usecase.CreateTransactionInput) { in.Date = "08/10/2026" }, "date_invalid"},
		"impossible day": {func(in *usecase.CreateTransactionInput) { in.Date = "2026-02-30" }, "date_invalid"},
		"long note":      {func(in *usecase.CreateTransactionInput) { in.Note = strings.Repeat("ă", 101) }, "note_too_long"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			in := valid
			tc.edit(&in)
			_, err := uc.Create(context.Background(), "u1", in)
			if got := errCode(err); got != tc.code {
				t.Fatalf("code = %s, want %s", got, tc.code)
			}
		})
	}
}

func TestListTransactions(t *testing.T) {
	uc, _, coffee, salary := newTransactions(t)
	ctx := context.Background()
	at := func(day string, hour int) *time.Time {
		v, _ := time.Parse("2006-01-02 15", fmt.Sprintf("%s %d", day, hour))
		return &v
	}
	for _, in := range []usecase.CreateTransactionInput{
		{Type: "expense", Amount: 1, CategoryID: coffee, Date: "2026-09-30", OccurredAt: at("2026-09-30", 8)},
		{Type: "expense", Amount: 2, CategoryID: coffee, Date: "2026-10-08", OccurredAt: at("2026-10-08", 8)},
		{Type: "income", Amount: 3, CategoryID: salary, Date: "2026-10-08", OccurredAt: at("2026-10-08", 20)},
		{Type: "expense", Amount: 4, CategoryID: coffee, Date: "2026-10-01", OccurredAt: at("2026-10-01", 12)},
	} {
		if _, err := uc.Create(ctx, "u1", in); err != nil {
			t.Fatal(err)
		}
	}
	amounts := func(txs []domain.Transaction) []int64 {
		out := []int64{}
		for _, tx := range txs {
			out = append(out, tx.Amount)
		}
		return out
	}

	all, err := uc.List(ctx, "u1", domain.TransactionFilter{})
	if got := fmt.Sprint(amounts(all)); err != nil || got != "[3 2 4 1]" {
		t.Fatalf("all, newest first = %s (%v)", got, err)
	}
	october, _ := uc.List(ctx, "u1", domain.TransactionFilter{From: "2026-10-01", To: "2026-10-31"})
	if got := fmt.Sprint(amounts(october)); got != "[3 2 4]" {
		t.Fatalf("october (inclusive bounds) = %s", got)
	}
	sameDay, _ := uc.List(ctx, "u1", domain.TransactionFilter{From: "2026-10-08", To: "2026-10-08"})
	if got := fmt.Sprint(amounts(sameDay)); got != "[3 2]" {
		t.Fatalf("single day = %s", got)
	}
	if other, _ := uc.List(ctx, "u2", domain.TransactionFilter{}); len(other) != 0 {
		t.Fatalf("u2 sees %d of u1's transactions", len(other))
	}

	for name, f := range map[string]domain.TransactionFilter{
		"bad from":      {From: "1/10/2026"},
		"bad to":        {To: "2026-13-01"},
		"from after to": {From: "2026-10-31", To: "2026-10-01"},
	} {
		if _, err := uc.List(ctx, "u1", f); err == nil {
			t.Fatalf("%s: expected an error", name)
		}
	}
}

func TestUpdateTransaction(t *testing.T) {
	ctx := context.Background()
	uc, repo, coffee, salary := newTransactions(t)
	occurred := time.Date(2026, 10, 8, 2, 30, 0, 0, time.UTC)
	tx, err := uc.Create(ctx, "u1", usecase.CreateTransactionInput{Type: "expense", Amount: 45000, CategoryID: coffee, Date: "2026-10-08", OccurredAt: &occurred})
	if err != nil {
		t.Fatal(err)
	}

	updated, err := uc.Update(ctx, "u1", tx.ID, usecase.CreateTransactionInput{
		Type: "income", Amount: 9000000, CategoryID: salary, Date: "2026-10-05", Note: " Lương tháng 9 ",
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Type != "income" || updated.Amount != 9000000 || updated.CategoryName != "Lương" || updated.Date != "2026-10-05" ||
		updated.Note != "Lương tháng 9" || !updated.OccurredAt.Equal(occurred) || !updated.CreatedAt.Equal(tx.CreatedAt) {
		t.Fatalf("unexpected update (omitted occurredAt and createdAt must be kept): %+v", updated)
	}
	if stored := repo.Transactions[0]; stored.Amount != 9000000 || stored.CategoryID != salary {
		t.Fatalf("not stored: %+v", stored)
	}

	valid := usecase.CreateTransactionInput{Type: "expense", Amount: 1000, CategoryID: coffee, Date: "2026-10-08"}
	if _, err := uc.Update(ctx, "u2", tx.ID, valid); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("someone else's transaction = %v", err)
	}
	if _, err := uc.Update(ctx, "u1", "missing", valid); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("missing transaction = %v", err)
	}
	mismatch := valid
	mismatch.CategoryID = salary
	if _, err := uc.Update(ctx, "u1", tx.ID, mismatch); errCode(err) != "category_type_mismatch" {
		t.Fatalf("type mismatch = %v", err)
	}
	zero := valid
	zero.Amount = 0
	if _, err := uc.Update(ctx, "u1", tx.ID, zero); errCode(err) != "amount_invalid" {
		t.Fatalf("zero amount = %v", err)
	}
	if repo.Transactions[0].Amount != 9000000 {
		t.Fatalf("a rejected update must not change the stored transaction: %+v", repo.Transactions[0])
	}
}
