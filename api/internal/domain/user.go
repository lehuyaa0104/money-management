package domain

import (
	"context"
	"regexp"
	"time"
	"unicode/utf8"
)

const (
	UsernameMin = 3
	UsernameMax = 20
	PasswordMin = 8
	PasswordMax = 72 // bcrypt only uses the first 72 bytes
	FullNameMax = 50
	// A cycle starts on this day of every month, or on the month's last day if it's shorter.
	CycleStartDayMin = 1
	CycleStartDayMax = 31
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// A validation error (400), not 401: the session is fine, only the typed password is wrong.
var ErrCurrentPasswordWrong = Validation("current_password_wrong", "Mật khẩu hiện tại không đúng")

type User struct {
	ID           string
	Username     string
	FullName     string
	PasswordHash string
	// Day of month the user's budgeting cycle starts on (e.g. payday), 1 = calendar months.
	CycleStartDay int
	CreatedAt     time.Time
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	// FindByUsername matches case-insensitively; returns ErrNotFound if absent.
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	UpdateCycleStartDay(ctx context.Context, id string, day int) error
	UpdatePasswordHash(ctx context.Context, id, hash string) error
}

func ValidateUsername(username string) error {
	if username == "" {
		return Validation("username_required", "Vui lòng nhập tên đăng nhập")
	}
	if len(username) < UsernameMin || len(username) > UsernameMax {
		return Validation("username_length", "Tên đăng nhập dài từ 3 đến 20 ký tự")
	}
	if !usernamePattern.MatchString(username) {
		return Validation("username_format", "Chỉ dùng chữ không dấu, số và dấu gạch dưới")
	}
	return nil
}

func ValidatePassword(password string) error {
	if password == "" {
		return Validation("password_required", "Vui lòng nhập mật khẩu")
	}
	if utf8.RuneCountInString(password) < PasswordMin {
		return Validation("password_length", "Mật khẩu tối thiểu 8 ký tự")
	}
	if len(password) > PasswordMax {
		return Validation("password_too_long", "Mật khẩu quá dài")
	}
	return nil
}

func ValidateFullName(fullName string) error {
	if fullName == "" {
		return Validation("full_name_required", "Vui lòng nhập họ và tên")
	}
	if utf8.RuneCountInString(fullName) > FullNameMax {
		return Validation("full_name_length", "Họ và tên tối đa 50 ký tự")
	}
	return nil
}

func ValidateCycleStartDay(day int) error {
	if day < CycleStartDayMin || day > CycleStartDayMax {
		return Validation("cycle_start_day_invalid", "Ngày bắt đầu chu kỳ phải từ 1 đến 31")
	}
	return nil
}
