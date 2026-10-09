package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type GoalRepository struct{ db *gorm.DB }

func NewGoalRepository(db *gorm.DB) *GoalRepository { return &GoalRepository{db: db} }

func (r *GoalRepository) Create(ctx context.Context, g *domain.Goal) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(toGoalModel(g)).Error
}

func (r *GoalRepository) List(ctx context.Context, userID string) ([]domain.Goal, error) {
	var models []goalModel
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC, id").Find(&models).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.Goal, len(models))
	for i := range models {
		out[i] = models[i].toDomain()
	}
	return out, nil
}

func (r *GoalRepository) FindByID(ctx context.Context, userID, id string) (*domain.Goal, error) {
	return findGoal(r.db.WithContext(ctx), userID, id)
}

func findGoal(db *gorm.DB, userID, id string) (*domain.Goal, error) {
	var m goalModel
	err := db.Where("id = ? AND user_id = ?", id, userID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	g := m.toDomain()
	return &g, nil
}

func (r *GoalRepository) Update(ctx context.Context, g *domain.Goal) error {
	res := r.db.WithContext(ctx).Model(&goalModel{}).
		Where("id = ? AND user_id = ?", g.ID, g.UserID).
		Updates(map[string]any{
			"name": g.Name, "target": g.Target, "saved": g.Saved, "deadline": g.Deadline,
			"color": g.Color, "image": g.Image, "updated_at": g.UpdatedAt,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *GoalRepository) UpdateSaved(ctx context.Context, userID, id string, change func(*domain.Goal) error) (*domain.Goal, error) {
	var goal *domain.Goal
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// SELECT … FOR UPDATE: a second deposit waits until this one commits.
		g, err := findGoal(tx.Clauses(clause.Locking{Strength: "UPDATE"}), userID, id)
		if err != nil {
			return err
		}
		if err := change(g); err != nil {
			return err
		}
		goal = g
		return tx.Model(&goalModel{}).Where("id = ?", g.ID).
			Updates(map[string]any{"saved": g.Saved, "updated_at": g.UpdatedAt}).Error
	})
	if err != nil {
		return nil, err
	}
	return goal, nil
}

func (r *GoalRepository) Delete(ctx context.Context, userID, id string) error {
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&goalModel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}
