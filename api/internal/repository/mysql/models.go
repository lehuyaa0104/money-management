package mysql

import (
	"time"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// GORM models are kept separate from domain entities so persistence details
// (column types, indexes) don't leak into the business layer.

type userModel struct {
	ID string `gorm:"type:char(36);primaryKey"`
	// The database collation (utf8mb4_0900_ai_ci) is case-insensitive, so this
	// unique index also rejects "Demo" when "demo" exists.
	Username      string `gorm:"type:varchar(20);not null;uniqueIndex"`
	FullName      string `gorm:"type:varchar(50);not null"`
	PasswordHash  string `gorm:"type:varchar(100);not null"`
	CycleStartDay int    `gorm:"type:tinyint unsigned;not null;default:1"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (userModel) TableName() string { return "users" }

// --- mapping ---

func toUserModel(u *domain.User) *userModel {
	return &userModel{
		ID: u.ID, Username: u.Username, FullName: u.FullName, PasswordHash: u.PasswordHash, CycleStartDay: u.CycleStartDay, CreatedAt: u.CreatedAt,
	}
}

func (m *userModel) toDomain() *domain.User {
	return &domain.User{
		ID: m.ID, Username: m.Username, FullName: m.FullName, PasswordHash: m.PasswordHash, CycleStartDay: m.CycleStartDay, CreatedAt: m.CreatedAt,
	}
}

type refreshTokenModel struct {
	Hash      string    `gorm:"type:char(64);primaryKey"` // hex SHA-256 of the token
	UserID    string    `gorm:"type:char(36);not null;index"`
	User      userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	ExpiresAt time.Time `gorm:"type:datetime(3);not null"`
	CreatedAt time.Time `gorm:"type:datetime(3);not null"`
}

func (refreshTokenModel) TableName() string { return "refresh_tokens" }

type categoryModel struct {
	ID     string    `gorm:"type:char(36);primaryKey"`
	UserID string    `gorm:"type:char(36);not null;uniqueIndex:idx_categories_user_type_name,priority:1"`
	User   userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Type   string    `gorm:"type:varchar(10);not null;uniqueIndex:idx_categories_user_type_name,priority:2"`
	// Accent-sensitive, case-insensitive: "Ăn uống" = "ăn uống", but "Ga" ≠ "Gà".
	Name      string    `gorm:"type:varchar(30) COLLATE utf8mb4_0900_as_ci;not null;uniqueIndex:idx_categories_user_type_name,priority:3"`
	Icon      string    `gorm:"type:varchar(50);not null"`
	Color     string    `gorm:"type:char(7);not null"`
	CreatedAt time.Time `gorm:"type:datetime(3);not null"`
}

func (categoryModel) TableName() string { return "categories" }

func toCategoryModel(c *domain.Category) *categoryModel {
	return &categoryModel{
		ID: c.ID, UserID: c.UserID, Type: string(c.Type), Name: c.Name, Icon: c.Icon, Color: c.Color, CreatedAt: c.CreatedAt,
	}
}

func (m *categoryModel) toDomain() domain.Category {
	return domain.Category{
		ID: m.ID, UserID: m.UserID, Type: domain.CategoryType(m.Type), Name: m.Name, Icon: m.Icon, Color: m.Color, CreatedAt: m.CreatedAt,
	}
}

type transactionModel struct {
	ID     string    `gorm:"type:char(36);primaryKey"`
	UserID string    `gorm:"type:char(36);not null;index:idx_transactions_user_date,priority:1"`
	User   userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	// Nullable: deleting a category keeps its transactions (category_name keeps the name).
	CategoryID   *string        `gorm:"type:char(36);index"`
	Category     *categoryModel `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL"`
	CategoryName string         `gorm:"type:varchar(30);not null"`
	Type         string         `gorm:"type:varchar(10);not null"`
	Amount       int64          `gorm:"not null"`
	Date         time.Time      `gorm:"type:date;not null;index:idx_transactions_user_date,priority:2"`
	Note         string         `gorm:"type:varchar(100);not null;default:''"`
	OccurredAt   time.Time      `gorm:"type:datetime(3);not null"`
	CreatedAt    time.Time      `gorm:"type:datetime(3);not null"`
}

func (transactionModel) TableName() string { return "transactions" }

func toTransactionModel(t *domain.Transaction) (*transactionModel, error) {
	date, err := time.Parse(domain.DateLayout, t.Date)
	if err != nil {
		return nil, err
	}
	var categoryID *string
	if t.CategoryID != "" {
		categoryID = &t.CategoryID
	}
	return &transactionModel{
		ID: t.ID, UserID: t.UserID, CategoryID: categoryID, CategoryName: t.CategoryName, Type: string(t.Type),
		Amount: t.Amount, Date: date, Note: t.Note, OccurredAt: t.OccurredAt, CreatedAt: t.CreatedAt,
	}, nil
}

func (m *transactionModel) toDomain() domain.Transaction {
	categoryID := ""
	if m.CategoryID != nil {
		categoryID = *m.CategoryID
	}
	return domain.Transaction{
		ID: m.ID, UserID: m.UserID, Type: domain.TransactionType(m.Type), Amount: m.Amount,
		CategoryID: categoryID, CategoryName: m.CategoryName, Date: m.Date.Format(domain.DateLayout),
		Note: m.Note, OccurredAt: m.OccurredAt, CreatedAt: m.CreatedAt,
	}
}

type budgetModel struct {
	ID     string    `gorm:"type:char(36);primaryKey"`
	UserID string    `gorm:"type:char(36);not null;uniqueIndex:idx_budgets_user_category,priority:1"`
	User   userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	// One budget per category; deleting the category deletes its budget.
	CategoryID string        `gorm:"type:char(36);not null;uniqueIndex:idx_budgets_user_category,priority:2"`
	Category   categoryModel `gorm:"foreignKey:CategoryID;constraint:OnDelete:CASCADE"`
	Limit      int64         `gorm:"column:limit_amount;not null"` // LIMIT is a reserved word
	CreatedAt  time.Time     `gorm:"type:datetime(3);not null"`
	UpdatedAt  time.Time     `gorm:"type:datetime(3);not null"`
}

func (budgetModel) TableName() string { return "budgets" }

func toBudgetModel(b *domain.Budget) *budgetModel {
	return &budgetModel{
		ID: b.ID, UserID: b.UserID, CategoryID: b.CategoryID, Limit: b.Limit, CreatedAt: b.CreatedAt, UpdatedAt: b.UpdatedAt,
	}
}

func (m *budgetModel) toDomain() domain.Budget {
	return domain.Budget{
		ID: m.ID, UserID: m.UserID, CategoryID: m.CategoryID, Limit: m.Limit, CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

type goalModel struct {
	ID     string    `gorm:"type:char(36);primaryKey"`
	UserID string    `gorm:"type:char(36);not null;index:idx_goals_user_created,priority:1"`
	User   userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Name   string    `gorm:"type:varchar(40);not null"`
	Target int64     `gorm:"not null"`
	Saved  int64     `gorm:"not null;default:0"`
	// "YYYY-MM" or "" (no deadline).
	Deadline string `gorm:"type:char(7);not null;default:''"`
	Color    string `gorm:"type:varchar(10);not null"`
	// Cover photo as a data URL (up to ~800 KB), or "".
	Image     string    `gorm:"type:mediumtext;not null"`
	CreatedAt time.Time `gorm:"type:datetime(3);not null;index:idx_goals_user_created,priority:2"`
	UpdatedAt time.Time `gorm:"type:datetime(3);not null"`
}

func (goalModel) TableName() string { return "goals" }

func toGoalModel(g *domain.Goal) *goalModel {
	return &goalModel{
		ID: g.ID, UserID: g.UserID, Name: g.Name, Target: g.Target, Saved: g.Saved, Deadline: g.Deadline,
		Color: g.Color, Image: g.Image, CreatedAt: g.CreatedAt, UpdatedAt: g.UpdatedAt,
	}
}

func (m *goalModel) toDomain() domain.Goal {
	return domain.Goal{
		ID: m.ID, UserID: m.UserID, Name: m.Name, Target: m.Target, Saved: m.Saved, Deadline: m.Deadline,
		Color: m.Color, Image: m.Image, CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

type assetModel struct {
	ID     string    `gorm:"type:char(36);primaryKey"`
	UserID string    `gorm:"type:char(36);not null;index:idx_assets_user_created,priority:1"`
	User   userModel `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Kind   string    `gorm:"type:varchar(10);not null"`
	Name   string    `gorm:"type:varchar(60);not null;default:''"`
	// Kind-specific fields as a JSON document, validated by domain.Asset.Prepare before it's stored.
	Details   []byte    `gorm:"type:json;not null"`
	CreatedAt time.Time `gorm:"type:datetime(3);not null;index:idx_assets_user_created,priority:2"`
	UpdatedAt time.Time `gorm:"type:datetime(3);not null"`
}

func (assetModel) TableName() string { return "assets" }

func toAssetModel(a *domain.Asset) *assetModel {
	return &assetModel{
		ID: a.ID, UserID: a.UserID, Kind: string(a.Kind), Name: a.Name, Details: a.Details, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
	}
}

func (m *assetModel) toDomain() domain.Asset {
	return domain.Asset{
		ID: m.ID, UserID: m.UserID, Kind: domain.AssetKind(m.Kind), Name: m.Name, Details: m.Details, CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}
