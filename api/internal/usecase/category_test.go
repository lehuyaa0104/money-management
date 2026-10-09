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

func newCategories() *usecase.CategoryUsecase {
	n := 0
	newID := func() string { n++; return fmt.Sprintf("cat-%d", n) }
	now := func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
	return usecase.NewCategoryUsecase(&testutil.MemoryCategories{}, now, newID)
}

func TestCreateCategory(t *testing.T) {
	ctx := context.Background()
	uc := newCategories()

	c, err := uc.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "expense", Name: "  Cà   phê ", Icon: "Coffee", Color: "#AABBCC"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if c.Name != "Cà phê" || c.Color != "#aabbcc" || c.Icon != "Coffee" {
		t.Fatalf("not normalised: %+v", c)
	}

	if _, err := uc.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "expense", Name: "CÀ PHÊ", Icon: "Coffee", Color: "#000000"}); !errors.Is(err, domain.ErrCategoryNameTaken) {
		t.Fatalf("same name, different case = %v, want ErrCategoryNameTaken", err)
	}
	if _, err := uc.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "income", Name: "Cà phê", Icon: "Coffee", Color: "#000000"}); err != nil {
		t.Fatalf("same name for the other type must be allowed: %v", err)
	}
	if _, err := uc.Create(ctx, "u2", usecase.CreateCategoryInput{Type: "expense", Name: "Cà phê", Icon: "Coffee", Color: "#000000"}); err != nil {
		t.Fatalf("same name for another user must be allowed: %v", err)
	}
}

func TestCreateCategoryValidation(t *testing.T) {
	uc := newCategories()
	valid := usecase.CreateCategoryInput{Type: "expense", Name: "Cà phê", Icon: "Coffee", Color: "#aabbcc"}
	cases := map[string]struct {
		edit func(*usecase.CreateCategoryInput)
		code string
	}{
		"bad type":   {func(in *usecase.CreateCategoryInput) { in.Type = "saving" }, "type_invalid"},
		"blank name": {func(in *usecase.CreateCategoryInput) { in.Name = "   " }, "name_required"},
		"long name": {func(in *usecase.CreateCategoryInput) {
			in.Name = "Một cái tên danh mục dài quá mức cho phép"
		}, "name_too_long"},
		"icon not name": {func(in *usecase.CreateCategoryInput) { in.Icon = "<svg>" }, "icon_invalid"},
		"icon empty":    {func(in *usecase.CreateCategoryInput) { in.Icon = "" }, "icon_invalid"},
		"color word":    {func(in *usecase.CreateCategoryInput) { in.Color = "red" }, "color_invalid"},
		"color short":   {func(in *usecase.CreateCategoryInput) { in.Color = "#abc" }, "color_invalid"},
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

func TestCreateDefaultsIsIdempotent(t *testing.T) {
	ctx := context.Background()
	uc := newCategories()

	// The user already has their own "lương" income category.
	if _, err := uc.Create(ctx, "u1", usecase.CreateCategoryInput{Type: "income", Name: "lương", Icon: "Wallet", Color: "#111111"}); err != nil {
		t.Fatal(err)
	}

	created, all, err := uc.CreateDefaults(ctx, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if want := len(domain.DefaultCategories) - 1; created != want || len(all) != want+1 {
		t.Fatalf("first call: created %d (want %d), total %d", created, want, len(all))
	}

	created, all, err = uc.CreateDefaults(ctx, "u1")
	if err != nil || created != 0 || len(all) != len(domain.DefaultCategories) {
		t.Fatalf("second call: created %d, total %d, err %v", created, len(all), err)
	}

	// Defaults keep their defined order after the user's own category.
	if all[1].Name != domain.DefaultCategories[0].Name || all[len(all)-1].Name != domain.DefaultCategories[len(domain.DefaultCategories)-1].Name {
		t.Fatalf("unexpected order: first default %q, last %q", all[1].Name, all[len(all)-1].Name)
	}
}
