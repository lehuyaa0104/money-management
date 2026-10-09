package usecase_test

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/testutil"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

// newBudgets returns the use case plus u1's "Cà phê" (expense) and "Lương" (income) category IDs.
func newBudgets(t *testing.T) (*usecase.BudgetUsecase, *testutil.MemoryBudgets, string, string) {
	t.Helper()
	n := 0
	newID := func() string { n++; return fmt.Sprintf("id-%d", n) }
	now := func() time.Time { return fixedNow }
	categories := &testutil.MemoryCategories{}
	cats := usecase.NewCategoryUsecase(categories, now, newID)
	coffee, err := cats.Create(context.Background(), "u1", usecase.CreateCategoryInput{Type: "expense", Name: "Cà phê", Icon: "Coffee", Color: "#78716c"})
	if err != nil {
		t.Fatal(err)
	}
	salary, err := cats.Create(context.Background(), "u1", usecase.CreateCategoryInput{Type: "income", Name: "Lương", Icon: "Banknote", Color: "#16a34a"})
	if err != nil {
		t.Fatal(err)
	}
	repo := &testutil.MemoryBudgets{}
	return usecase.NewBudgetUsecase(repo, categories, now, newID), repo, coffee.ID, salary.ID
}

func TestCreateBudget(t *testing.T) {
	uc, repo, coffee, _ := newBudgets(t)
	ctx := context.Background()

	b, err := uc.Create(ctx, "u1", usecase.CreateBudgetInput{CategoryID: coffee, Limit: 1_000_000})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if b.CategoryID != coffee || b.Limit != 1_000_000 || b.UserID != "u1" || !b.CreatedAt.Equal(fixedNow) || len(repo.Budgets) != 1 {
		t.Fatalf("unexpected budget: %+v (stored %d)", b, len(repo.Budgets))
	}
	if _, err := uc.Create(ctx, "u1", usecase.CreateBudgetInput{CategoryID: coffee, Limit: 500_000}); !errors.Is(err, domain.ErrBudgetExists) {
		t.Fatalf("second budget for the same category = %v, want ErrBudgetExists", err)
	}
}

func TestCreateBudgetRules(t *testing.T) {
	uc, repo, coffee, salary := newBudgets(t)
	cases := map[string]struct {
		userID string
		in     usecase.CreateBudgetInput
		want   error
		code   string
	}{
		"income category":   {"u1", usecase.CreateBudgetInput{CategoryID: salary, Limit: 1000}, domain.ErrBudgetCategoryNotExpense, ""},
		"unknown category":  {"u1", usecase.CreateBudgetInput{CategoryID: "nope", Limit: 1000}, domain.ErrCategoryNotFound, ""},
		"other user's":      {"u2", usecase.CreateBudgetInput{CategoryID: coffee, Limit: 1000}, domain.ErrCategoryNotFound, ""},
		"no category":       {"u1", usecase.CreateBudgetInput{Limit: 1000}, nil, "category_required"},
		"zero limit":        {"u1", usecase.CreateBudgetInput{CategoryID: coffee}, nil, "limit_invalid"},
		"negative limit":    {"u1", usecase.CreateBudgetInput{CategoryID: coffee, Limit: -1}, nil, "limit_invalid"},
		"limit over 999 tỷ": {"u1", usecase.CreateBudgetInput{CategoryID: coffee, Limit: domain.MaxAmount + 1}, nil, "limit_too_large"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := uc.Create(context.Background(), tc.userID, tc.in)
			if tc.want != nil && !errors.Is(err, tc.want) {
				t.Fatalf("err = %v, want %v", err, tc.want)
			}
			if tc.code != "" && errCode(err) != tc.code {
				t.Fatalf("code = %s, want %s", errCode(err), tc.code)
			}
		})
	}
	if len(repo.Budgets) != 0 {
		t.Fatalf("nothing should be stored, got %d", len(repo.Budgets))
	}
}

func TestBudgetSpentIsPerMonth(t *testing.T) {
	ctx := context.Background()
	n := 0
	newID := func() string { n++; return fmt.Sprintf("id-%d", n) }
	now := func() time.Time { return fixedNow }
	categories := &testutil.MemoryCategories{}
	transactions := &testutil.MemoryTransactions{}
	cats := usecase.NewCategoryUsecase(categories, now, newID)
	coffee, _ := cats.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "expense", Name: "Cà phê", Icon: "Coffee", Color: "#78716c"})
	food, _ := cats.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "expense", Name: "Ăn uống", Icon: "Utensils", Color: "#2a78d6"})
	txs := usecase.NewTransactionUsecase(transactions, categories, now, newID)
	budgets := usecase.NewBudgetUsecase(&testutil.MemoryBudgets{Transactions: transactions}, categories, now, newID)

	for _, in := range []usecase.CreateTransactionInput{
		{Type: "expense", Amount: 40000, CategoryID: coffee.ID, Date: "2026-10-01"},
		{Type: "expense", Amount: 45000, CategoryID: coffee.ID, Date: "2026-10-31"},
		{Type: "expense", Amount: 99000, CategoryID: coffee.ID, Date: "2026-09-30"}, // last month
		{Type: "expense", Amount: 50000, CategoryID: food.ID, Date: "2026-10-05"},   // other category
	} {
		if _, err := txs.Create(ctx, "u1", in); err != nil {
			t.Fatal(err)
		}
	}
	b, err := budgets.Create(ctx, "u1", usecase.CreateBudgetInput{CategoryID: coffee.ID, Limit: 100000})
	if err != nil {
		t.Fatal(err)
	}

	spent := func(month string) int64 {
		list, err := budgets.List(ctx, "u1", month, 1)
		if err != nil || len(list) != 1 {
			t.Fatalf("list %s: %v %v", month, list, err)
		}
		return list[0].Spent
	}
	if got := spent("2026-10"); got != 85000 {
		t.Fatalf("october spent = %d, want 85000 (only this category, both month ends)", got)
	}
	if got := spent("2026-09"); got != 99000 {
		t.Fatalf("september spent = %d", got)
	}
	if got := spent("2026-11"); got != 0 {
		t.Fatalf("a new month starts from zero, got %d", got)
	}
	if _, err := budgets.List(ctx, "u1", "October", 1); errCode(err) != "month_invalid" {
		t.Fatalf("bad month = %v", err)
	}
	for _, day := range []int{0, 32} {
		if _, err := budgets.List(ctx, "u1", "2026-10", day); errCode(err) != "cycle_start_day_invalid" {
			t.Fatalf("startDay %d = %v", day, err)
		}
	}

	updated, err := budgets.UpdateLimit(ctx, "u1", b.ID, 200000)
	if err != nil || updated.Limit != 200000 {
		t.Fatalf("update: %v %v", updated, err)
	}
	if _, err := budgets.UpdateLimit(ctx, "u1", b.ID, 0); errCode(err) != "limit_invalid" {
		t.Fatalf("update to 0 = %v", err)
	}
	if _, err := budgets.UpdateLimit(ctx, "u2", b.ID, 1000); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other user's update = %v", err)
	}
	if err := budgets.Delete(ctx, "u2", b.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other user's delete = %v", err)
	}
	if err := budgets.Delete(ctx, "u1", b.ID); err != nil {
		t.Fatal(err)
	}
	if list, _ := budgets.List(ctx, "u1", "2026-10", 1); len(list) != 0 {
		t.Fatalf("after delete: %v", list)
	}
}

func TestCycleRange(t *testing.T) {
	for _, tc := range []struct {
		month      string
		day        int
		start, end string
	}{
		{"2026-10", 1, "2026-10-01", "2026-11-01"},
		{"2026-09", 25, "2026-09-25", "2026-10-25"},
		{"2026-12", 25, "2026-12-25", "2027-01-25"},
		{"2026-01", 31, "2026-01-31", "2026-02-28"}, // short months start on their last day
		{"2026-02", 31, "2026-02-28", "2026-03-31"},
		{"2028-02", 30, "2028-02-29", "2028-03-30"},
	} {
		start, end, err := domain.CycleRange(tc.month, tc.day)
		if err != nil || start.Format(domain.DateLayout) != tc.start || end.Format(domain.DateLayout) != tc.end {
			t.Errorf("CycleRange(%s, %d) = %v – %v, %v; want %s – %s", tc.month, tc.day, start, end, err, tc.start, tc.end)
		}
	}
}
