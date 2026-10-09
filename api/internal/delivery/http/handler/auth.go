package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/delivery/http/middleware"
	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

// AuthService is what the handler needs from the auth use case (an interface so
// handlers can be tested without a database).
type AuthService interface {
	Register(ctx context.Context, in usecase.RegisterInput) (*usecase.AuthResult, error)
	Login(ctx context.Context, username, password string) (*usecase.AuthResult, error)
	Me(ctx context.Context, userID string) (*domain.User, error)
	SetCycleStartDay(ctx context.Context, userID string, day int) (*domain.User, error)
}

type AuthHandler struct{ auth AuthService }

func NewAuthHandler(auth AuthService) *AuthHandler { return &AuthHandler{auth: auth} }

type registerRequest struct {
	FullName string `json:"fullName"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type userResponse struct {
	ID            string    `json:"id"`
	Username      string    `json:"username"`
	FullName      string    `json:"fullName"`
	CycleStartDay int       `json:"cycleStartDay"`
	CreatedAt     time.Time `json:"createdAt"`
}

type authResponse struct {
	Token     string       `json:"token"`
	ExpiresAt time.Time    `json:"expiresAt"`
	User      userResponse `json:"user"`
}

func toUserResponse(u *domain.User) userResponse {
	return userResponse{ID: u.ID, Username: u.Username, FullName: u.FullName, CycleStartDay: u.CycleStartDay, CreatedAt: u.CreatedAt}
}

func toAuthResponse(r *usecase.AuthResult) authResponse {
	return authResponse{Token: r.Token, ExpiresAt: r.ExpiresAt, User: toUserResponse(r.User)}
}

// Register godoc: POST /api/v1/auth/register → 201 with a token, signed in right away.
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	result, err := h.auth.Register(c.Request.Context(), usecase.RegisterInput{
		FullName: req.FullName, Username: req.Username, Password: req.Password,
	})
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toAuthResponse(result))
}

// Login godoc: POST /api/v1/auth/login → 200 with a token.
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	result, err := h.auth.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAuthResponse(result))
}

// Me godoc: GET /api/v1/auth/me (Bearer token) → the signed-in user.
func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.auth.Me(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}

type updateMeRequest struct {
	CycleStartDay int `json:"cycleStartDay"`
}

// UpdateMe godoc: PATCH /api/v1/auth/me {cycleStartDay} (Bearer token) → 200 {user}
func (h *AuthHandler) UpdateMe(c *gin.Context) {
	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeBadRequest(c)
		return
	}
	user, err := h.auth.SetCycleStartDay(c.Request.Context(), middleware.UserID(c), req.CycleStartDay)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}
