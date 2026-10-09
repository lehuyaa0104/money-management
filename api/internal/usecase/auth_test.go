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

// plainHasher keeps tests fast; bcrypt itself is covered in the HTTP test.
type plainHasher struct{}

func (plainHasher) Hash(p string) (string, error) { return "hashed:" + p, nil }
func (plainHasher) Compare(h, p string) bool      { return h == "hashed:"+p }

type fakeTokens struct{}

func (fakeTokens) Issue(userID string) (string, time.Time, error) {
	return "token-for-" + userID, time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC), nil
}

func newAuth(t *testing.T) (*usecase.AuthUsecase, *testutil.MemoryUsers) {
	t.Helper()
	users := &testutil.MemoryUsers{}
	n := 0
	newID := func() string { n++; return fmt.Sprintf("user-%d", n) }
	now := func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
	uc, err := usecase.NewAuthUsecase(users, plainHasher{}, fakeTokens{}, now, newID)
	if err != nil {
		t.Fatal(err)
	}
	return uc, users
}

func errCode(err error) string {
	if e, ok := domain.AsError(err); ok {
		return e.Code
	}
	return fmt.Sprintf("non-domain error: %v", err)
}

func TestRegister(t *testing.T) {
	ctx := context.Background()
	uc, users := newAuth(t)

	res, err := uc.Register(ctx, usecase.RegisterInput{FullName: "  Nguyễn Văn A ", Username: " demo_user ", Password: "demo12345"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if res.Token != "token-for-user-1" || res.User.Username != "demo_user" || res.User.FullName != "Nguyễn Văn A" {
		t.Fatalf("unexpected result: %+v %+v", res, res.User)
	}
	stored, _ := users.FindByID(ctx, "user-1")
	if stored.PasswordHash != "hashed:demo12345" {
		t.Fatalf("password must be stored hashed, got %q", stored.PasswordHash)
	}

	_, err = uc.Register(ctx, usecase.RegisterInput{FullName: "B", Username: "DEMO_USER", Password: "another123"})
	if !errors.Is(err, domain.ErrUsernameTaken) {
		t.Fatalf("duplicate username (different case) = %v, want ErrUsernameTaken", err)
	}
}

func TestRegisterValidation(t *testing.T) {
	uc, _ := newAuth(t)
	cases := []struct {
		name string
		in   usecase.RegisterInput
		code string
	}{
		{"missing full name", usecase.RegisterInput{FullName: "  ", Username: "demo", Password: "demo12345"}, "full_name_required"},
		{"username too short", usecase.RegisterInput{FullName: "A", Username: "ab", Password: "demo12345"}, "username_length"},
		{"username with spaces", usecase.RegisterInput{FullName: "A", Username: "bad name", Password: "demo12345"}, "username_format"},
		{"username with accents", usecase.RegisterInput{FullName: "A", Username: "tùng", Password: "demo12345"}, "username_format"},
		{"password too short", usecase.RegisterInput{FullName: "A", Username: "demo", Password: "1234567"}, "password_length"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := uc.Register(context.Background(), tc.in)
			if got := errCode(err); got != tc.code {
				t.Fatalf("code = %s, want %s", got, tc.code)
			}
		})
	}
}

func TestLogin(t *testing.T) {
	ctx := context.Background()
	uc, _ := newAuth(t)
	if _, err := uc.Register(ctx, usecase.RegisterInput{FullName: "A", Username: "demo_user", Password: "demo12345"}); err != nil {
		t.Fatal(err)
	}

	res, err := uc.Login(ctx, "Demo_User", "demo12345")
	if err != nil || res.User.ID != "user-1" {
		t.Fatalf("login with different case: %v %+v", err, res)
	}

	for _, tc := range []struct{ username, password string }{
		{"demo_user", "wrong-pass"},
		{"nobody", "demo12345"},
		{"", ""},
	} {
		if _, err := uc.Login(ctx, tc.username, tc.password); !errors.Is(err, domain.ErrInvalidCredentials) {
			t.Fatalf("login(%q, %q) = %v, want ErrInvalidCredentials", tc.username, tc.password, err)
		}
	}
}

func TestMe(t *testing.T) {
	ctx := context.Background()
	uc, _ := newAuth(t)
	res, _ := uc.Register(ctx, usecase.RegisterInput{FullName: "A", Username: "demo_user", Password: "demo12345"})

	user, err := uc.Me(ctx, res.User.ID)
	if err != nil || user.Username != "demo_user" {
		t.Fatalf("me: %v %+v", err, user)
	}
	if _, err := uc.Me(ctx, "deleted-user"); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("me for missing user = %v, want ErrUnauthorized", err)
	}
}

func TestSetCycleStartDay(t *testing.T) {
	ctx := context.Background()
	uc, _ := newAuth(t)
	res, _ := uc.Register(ctx, usecase.RegisterInput{FullName: "A", Username: "demo_user", Password: "demo12345"})
	if res.User.CycleStartDay != 1 {
		t.Fatalf("new user cycle starts on %d, want 1", res.User.CycleStartDay)
	}

	if _, err := uc.SetCycleStartDay(ctx, res.User.ID, 25); err != nil {
		t.Fatal(err)
	}
	if user, _ := uc.Me(ctx, res.User.ID); user.CycleStartDay != 25 {
		t.Fatalf("stored cycle start day = %d, want 25", user.CycleStartDay)
	}
	for _, day := range []int{0, 32} {
		if _, err := uc.SetCycleStartDay(ctx, res.User.ID, day); errCode(err) != "cycle_start_day_invalid" {
			t.Fatalf("day %d = %v", day, err)
		}
	}
	if _, err := uc.SetCycleStartDay(ctx, "deleted-user", 5); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("missing user = %v", err)
	}
}
