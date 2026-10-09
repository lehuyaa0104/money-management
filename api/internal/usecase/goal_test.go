package usecase_test

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/testutil"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

func newGoals() (*usecase.GoalUsecase, *testutil.MemoryGoals) {
	n := 0
	newID := func() string { n++; return fmt.Sprintf("id-%d", n) }
	repo := &testutil.MemoryGoals{}
	return usecase.NewGoalUsecase(repo, func() time.Time { return fixedNow }, newID), repo
}

var trip = usecase.GoalInput{Name: "  Du lịch Nhật Bản ", Target: 50_000_000, Saved: 5_000_000, Deadline: "2027-04", Color: "blue"}

func TestCreateGoal(t *testing.T) {
	uc, repo := newGoals()
	g, err := uc.Create(context.Background(), "u1", trip)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if g.Name != "Du lịch Nhật Bản" || g.Saved != 5_000_000 || g.UserID != "u1" || !g.CreatedAt.Equal(fixedNow) || len(repo.Goals) != 1 {
		t.Fatalf("unexpected goal: %+v", g)
	}
}

func TestGoalRules(t *testing.T) {
	uc, repo := newGoals()
	with := func(change func(*usecase.GoalInput)) usecase.GoalInput { in := trip; change(&in); return in }
	cases := map[string]struct {
		in   usecase.GoalInput
		code string
	}{
		"blank name":     {with(func(in *usecase.GoalInput) { in.Name = "   " }), "name_required"},
		"name too long":  {with(func(in *usecase.GoalInput) { in.Name = strings.Repeat("ă", 41) }), "name_too_long"},
		"zero target":    {with(func(in *usecase.GoalInput) { in.Target = 0 }), "target_invalid"},
		"huge target":    {with(func(in *usecase.GoalInput) { in.Target = domain.MaxAmount + 1 }), "target_too_large"},
		"negative saved": {with(func(in *usecase.GoalInput) { in.Saved = -1 }), "saved_invalid"},
		"unknown color":  {with(func(in *usecase.GoalInput) { in.Color = "#ff0000" }), "color_invalid"},
		"bad deadline":   {with(func(in *usecase.GoalInput) { in.Deadline = "2027-13" }), "deadline_invalid"},
		"not a data URL": {with(func(in *usecase.GoalInput) { in.Image = "https://example.com/a.jpg" }), "image_invalid"},
		"svg data URL":   {with(func(in *usecase.GoalInput) { in.Image = "data:image/svg+xml;base64,PHN2Zz4=" }), "image_invalid"},
		"broken base64":  {with(func(in *usecase.GoalInput) { in.Image = "data:image/jpeg;base64,@@@" }), "image_invalid"},
		"image over limit": {with(func(in *usecase.GoalInput) {
			in.Image = "data:image/jpeg;base64," + strings.Repeat("A", domain.GoalImageMax)
		}), "image_too_large"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := uc.Create(context.Background(), "u1", tc.in); errCode(err) != tc.code {
				t.Fatalf("err = %v, want %s", err, tc.code)
			}
		})
	}
	if len(repo.Goals) != 0 {
		t.Fatalf("nothing should be stored, got %d", len(repo.Goals))
	}

	// Saved above target is fine (the goal is reached); no deadline or photo is fine.
	ok := with(func(in *usecase.GoalInput) {
		in.Saved, in.Deadline, in.Image = 60_000_000, "", "data:image/jpeg;base64,/9j/4AAQ"
	})
	if _, err := uc.Create(context.Background(), "u1", ok); err != nil {
		t.Fatalf("valid goal rejected: %v", err)
	}
}

func TestUpdateAndDeleteGoal(t *testing.T) {
	uc, _ := newGoals()
	ctx := context.Background()
	g, _ := uc.Create(ctx, "u1", usecase.GoalInput{Name: "Laptop", Target: 30_000_000, Color: "violet", Deadline: "2027-01", Image: "data:image/jpeg;base64,/9j/"})

	updated, err := uc.Update(ctx, "u1", g.ID, usecase.GoalInput{Name: "Laptop mới", Target: 35_000_000, Saved: 1_000_000, Color: "teal"})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "Laptop mới" || updated.Deadline != "" || updated.Image != "" || !updated.CreatedAt.Equal(g.CreatedAt) {
		t.Fatalf("update should replace every field: %+v", updated)
	}
	if _, err := uc.Update(ctx, "u2", g.ID, trip); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other user's update = %v", err)
	}
	if err := uc.Delete(ctx, "u2", g.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other user's delete = %v", err)
	}
	if err := uc.Delete(ctx, "u1", g.ID); err != nil {
		t.Fatal(err)
	}
	if list, _ := uc.List(ctx, "u1"); len(list) != 0 {
		t.Fatalf("after delete: %v", list)
	}
}

func TestDepositAndWithdraw(t *testing.T) {
	uc, _ := newGoals()
	ctx := context.Background()
	g, _ := uc.Create(ctx, "u1", trip) // saved 5tr

	if g, err := uc.Deposit(ctx, "u1", g.ID, 2_000_000); err != nil || g.Saved != 7_000_000 {
		t.Fatalf("deposit = %v %v", g, err)
	}
	if g, err := uc.Withdraw(ctx, "u1", g.ID, 7_000_000); err != nil || g.Saved != 0 {
		t.Fatalf("withdraw everything = %v %v", g, err)
	}
	if _, err := uc.Withdraw(ctx, "u1", g.ID, 1); !errors.Is(err, domain.ErrGoalWithdrawTooLarge) {
		t.Fatalf("withdraw below zero = %v", err)
	}
	for _, amount := range []int64{0, -5} {
		if _, err := uc.Deposit(ctx, "u1", g.ID, amount); !errors.Is(err, domain.ErrGoalAmountInvalid) {
			t.Fatalf("deposit %d = %v", amount, err)
		}
	}
	if _, err := uc.Deposit(ctx, "u1", g.ID, domain.MaxAmount+1); !errors.Is(err, domain.ErrGoalSavedTooLarge) {
		t.Fatalf("huge deposit = %v", err)
	}
	if _, err := uc.Deposit(ctx, "u2", g.ID, 1000); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other user's deposit = %v", err)
	}
}

func TestConcurrentDepositsAllCount(t *testing.T) {
	uc, _ := newGoals()
	ctx := context.Background()
	g, _ := uc.Create(ctx, "u1", usecase.GoalInput{Name: "Quỹ", Target: 1_000_000, Color: "green"})
	var wg sync.WaitGroup
	for range 50 {
		wg.Add(1)
		go func() { defer wg.Done(); _, _ = uc.Deposit(ctx, "u1", g.ID, 1000) }()
	}
	wg.Wait()
	if list, _ := uc.List(ctx, "u1"); list[0].Saved != 50_000 {
		t.Fatalf("saved = %d, want 50000", list[0].Saved)
	}
}
