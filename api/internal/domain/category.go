package domain

import (
	"context"
	"regexp"
	"time"
	"unicode/utf8"
)

type CategoryType string

const (
	CategoryExpense CategoryType = "expense"
	CategoryIncome  CategoryType = "income"
)

const CategoryNameMax = 30

var (
	// Icon is a lucide-react icon name ("Utensils", "HeartPulse"); the web app maps it to the component.
	iconPattern  = regexp.MustCompile(`^[A-Z][A-Za-z0-9]{0,49}$`)
	colorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
)

var ErrCategoryNameTaken = &Error{Kind: KindConflict, Code: "category_name_taken", Message: "Danh mục này đã tồn tại"}

type Category struct {
	ID        string
	UserID    string
	Type      CategoryType
	Name      string
	Icon      string
	Color     string // "#rrggbb", lowercase
	CreatedAt time.Time
}

type CategoryRepository interface {
	// List returns the user's categories in creation order.
	List(ctx context.Context, userID string) ([]Category, error)
	// Create returns ErrCategoryNameTaken if the user already has this type+name.
	Create(ctx context.Context, category *Category) error
	// CreateIgnoringDuplicates inserts the categories, silently skipping any the
	// user already has (same type+name), and returns how many were inserted.
	CreateIgnoringDuplicates(ctx context.Context, categories []Category) (int, error)
	// FindByID returns ErrNotFound if the category doesn't exist or isn't the user's.
	FindByID(ctx context.Context, userID, id string) (*Category, error)
	// Delete returns ErrNotFound if the category doesn't exist or isn't the user's.
	Delete(ctx context.Context, userID, id string) error
}

func (c *Category) Validate() error {
	if c.Type != CategoryExpense && c.Type != CategoryIncome {
		return Validation("type_invalid", "Loại danh mục không hợp lệ")
	}
	if c.Name == "" {
		return Validation("name_required", "Vui lòng nhập tên danh mục")
	}
	if utf8.RuneCountInString(c.Name) > CategoryNameMax {
		return Validation("name_too_long", "Tên danh mục tối đa 30 ký tự")
	}
	if !iconPattern.MatchString(c.Icon) {
		return Validation("icon_invalid", "Icon không hợp lệ")
	}
	if !colorPattern.MatchString(c.Color) {
		return Validation("color_invalid", "Màu không hợp lệ")
	}
	return nil
}

type DefaultCategory struct {
	Type  CategoryType
	Name  string
	Icon  string
	Color string
}

// DefaultCategories are the built-in categories a user can add in one tap.
// Colors for expenses follow the web app's validated chart palette.
var DefaultCategories = []DefaultCategory{
	{CategoryExpense, "Ăn uống", "Utensils", "#2a78d6"},
	{CategoryExpense, "Di chuyển", "Car", "#eb6834"},
	{CategoryExpense, "Nhà ở", "House", "#1baf7a"},
	{CategoryExpense, "Mua sắm", "ShoppingBag", "#eda100"},
	{CategoryExpense, "Giải trí", "Tv", "#e87ba4"},
	{CategoryExpense, "Sức khỏe", "HeartPulse", "#008300"},
	{CategoryExpense, "Giáo dục", "GraduationCap", "#4a3aa7"},
	{CategoryIncome, "Lương", "Banknote", "#16a34a"},
	{CategoryIncome, "Thưởng", "Gift", "#16a34a"},
	{CategoryIncome, "Đầu tư", "TrendingUp", "#16a34a"},
}
