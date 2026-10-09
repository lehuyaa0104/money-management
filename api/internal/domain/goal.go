package domain

import (
	"context"
	"encoding/base64"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	GoalNameMax = 40
	// GoalImageMax caps the cover photo's data URL (≈ 600 KB of JPEG). The web app
	// downscales photos to ~50–150 KB before sending them.
	GoalImageMax = 800_000
)

// GoalColors are the accent names the web app knows how to draw.
var GoalColors = map[string]bool{"blue": true, "orange": true, "violet": true, "pink": true, "teal": true, "green": true}

var (
	ErrGoalAmountInvalid    = Validation("amount_invalid", "Số tiền phải lớn hơn 0")
	ErrGoalWithdrawTooLarge = Validation("withdraw_too_large", "Số tiền rút vượt quá số đã tiết kiệm")
	ErrGoalSavedTooLarge    = Validation("saved_too_large", "Số tiền đã tiết kiệm quá lớn")
)

// Goal is a savings goal. Saved is entered by the user (deposits/withdrawals);
// it isn't linked to transactions.
type Goal struct {
	ID        string
	UserID    string
	Name      string
	Target    int64
	Saved     int64
	Deadline  string // "YYYY-MM" or ""
	Color     string
	Image     string // "data:image/…;base64,…" or ""
	CreatedAt time.Time
	UpdatedAt time.Time
}

type GoalRepository interface {
	Create(ctx context.Context, goal *Goal) error
	// List returns the user's goals, newest first.
	List(ctx context.Context, userID string) ([]Goal, error)
	// FindByID returns ErrNotFound if the goal doesn't exist or isn't the user's.
	FindByID(ctx context.Context, userID, id string) (*Goal, error)
	// Update saves every editable field; ErrNotFound if it isn't the user's.
	Update(ctx context.Context, goal *Goal) error
	// UpdateSaved locks the goal, lets change modify Saved (returning an error
	// aborts), and stores it — so concurrent deposits can't overwrite each other.
	UpdateSaved(ctx context.Context, userID, id string, change func(*Goal) error) (*Goal, error)
	// Delete returns ErrNotFound if the goal doesn't exist or isn't the user's.
	Delete(ctx context.Context, userID, id string) error
}

// Normalize trims the name; call it before Validate.
func (g *Goal) Normalize() {
	g.Name = strings.TrimSpace(g.Name)
	g.Deadline = strings.TrimSpace(g.Deadline)
}

func (g *Goal) Validate() error {
	switch {
	case g.Name == "":
		return Validation("name_required", "Vui lòng nhập tên mục tiêu")
	case utf8.RuneCountInString(g.Name) > GoalNameMax:
		return Validation("name_too_long", "Tên mục tiêu tối đa 40 ký tự")
	case g.Target <= 0:
		return Validation("target_invalid", "Số tiền mục tiêu phải lớn hơn 0")
	case g.Target > MaxAmount:
		return Validation("target_too_large", "Số tiền mục tiêu quá lớn")
	case g.Saved < 0:
		return Validation("saved_invalid", "Số tiền đã có không được âm")
	case g.Saved > MaxAmount:
		return ErrGoalSavedTooLarge
	case !GoalColors[g.Color]:
		return Validation("color_invalid", "Màu không hợp lệ")
	}
	if g.Deadline != "" {
		if _, err := time.Parse(MonthLayout, g.Deadline); err != nil {
			return Validation("deadline_invalid", "Hạn hoàn thành không hợp lệ")
		}
	}
	return validateGoalImage(g.Image)
}

func validateGoalImage(image string) error {
	if image == "" {
		return nil
	}
	if len(image) > GoalImageMax {
		return Validation("image_too_large", "Ảnh bìa quá lớn")
	}
	for _, prefix := range []string{"data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"} {
		if data, ok := strings.CutPrefix(image, prefix); ok {
			if _, err := base64.StdEncoding.DecodeString(data); err == nil {
				return nil
			}
			break
		}
	}
	return Validation("image_invalid", "Ảnh bìa không hợp lệ")
}
