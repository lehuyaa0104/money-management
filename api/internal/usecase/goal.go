package usecase

import (
	"context"

	"github.com/leduchuy/money-management/api/internal/domain"
)

// GoalInput holds every editable field of a goal (create and full update).
type GoalInput struct {
	Name     string
	Target   int64
	Saved    int64
	Deadline string
	Color    string
	Image    string
}

type GoalUsecase struct {
	goals domain.GoalRepository
	now   Clock
	newID IDGenerator
}

func NewGoalUsecase(goals domain.GoalRepository, now Clock, newID IDGenerator) *GoalUsecase {
	return &GoalUsecase{goals: goals, now: now, newID: newID}
}

func (u *GoalUsecase) Create(ctx context.Context, userID string, in GoalInput) (*domain.Goal, error) {
	now := u.now()
	goal := &domain.Goal{ID: u.newID(), UserID: userID, CreatedAt: now, UpdatedAt: now}
	applyGoalInput(goal, in)
	if err := goal.Validate(); err != nil {
		return nil, err
	}
	if err := u.goals.Create(ctx, goal); err != nil {
		return nil, err
	}
	return goal, nil
}

func (u *GoalUsecase) List(ctx context.Context, userID string) ([]domain.Goal, error) {
	return u.goals.List(ctx, userID)
}

// Update replaces every editable field (an empty Image removes the cover photo).
func (u *GoalUsecase) Update(ctx context.Context, userID, id string, in GoalInput) (*domain.Goal, error) {
	goal, err := u.goals.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	applyGoalInput(goal, in)
	goal.UpdatedAt = u.now()
	if err := goal.Validate(); err != nil {
		return nil, err
	}
	if err := u.goals.Update(ctx, goal); err != nil {
		return nil, err
	}
	return goal, nil
}

// Deposit adds amount to what has been saved towards the goal.
func (u *GoalUsecase) Deposit(ctx context.Context, userID, id string, amount int64) (*domain.Goal, error) {
	if amount <= 0 {
		return nil, domain.ErrGoalAmountInvalid
	}
	return u.goals.UpdateSaved(ctx, userID, id, func(g *domain.Goal) error {
		if amount > domain.MaxAmount || g.Saved+amount > domain.MaxAmount {
			return domain.ErrGoalSavedTooLarge
		}
		g.Saved += amount
		g.UpdatedAt = u.now()
		return nil
	})
}

// Withdraw takes amount out of what has been saved; it can't go below zero.
func (u *GoalUsecase) Withdraw(ctx context.Context, userID, id string, amount int64) (*domain.Goal, error) {
	if amount <= 0 {
		return nil, domain.ErrGoalAmountInvalid
	}
	return u.goals.UpdateSaved(ctx, userID, id, func(g *domain.Goal) error {
		if amount > g.Saved {
			return domain.ErrGoalWithdrawTooLarge
		}
		g.Saved -= amount
		g.UpdatedAt = u.now()
		return nil
	})
}

func (u *GoalUsecase) Delete(ctx context.Context, userID, id string) error {
	return u.goals.Delete(ctx, userID, id)
}

func applyGoalInput(g *domain.Goal, in GoalInput) {
	g.Name, g.Target, g.Saved, g.Deadline, g.Color, g.Image = in.Name, in.Target, in.Saved, in.Deadline, in.Color, in.Image
	g.Normalize()
}
