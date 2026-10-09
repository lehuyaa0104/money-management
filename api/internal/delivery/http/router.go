package http

import (
	"context"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/delivery/http/handler"
	"github.com/leduchuy/money-management/api/internal/delivery/http/middleware"
)

type RouterDeps struct {
	Auth           handler.AuthService
	Categories     handler.CategoryService
	Transactions   handler.TransactionService
	Budgets        handler.BudgetService
	Goals          handler.GoalService
	Assets         handler.AssetService
	FundNavs       handler.FundNavService
	TokenVerifier  middleware.TokenVerifier
	PingDB         func(context.Context) error
	AllowedOrigins []string
}

func NewRouter(deps RouterDeps) *gin.Engine {
	r := gin.New()
	// Not behind a proxy we control: don't trust client-sent X-Forwarded-For.
	_ = r.SetTrustedProxies(nil)
	r.Use(gin.Logger(), gin.Recovery(), middleware.BodyLimit(1<<20))
	if len(deps.AllowedOrigins) > 0 {
		r.Use(cors.New(cors.Config{
			AllowOrigins: deps.AllowedOrigins,
			AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
			AllowHeaders: []string{"Authorization", "Content-Type"},
			MaxAge:       12 * time.Hour,
		}))
	}

	r.GET("/healthz", handler.Health(deps.PingDB))

	authHandler := handler.NewAuthHandler(deps.Auth)
	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.GET("/me", middleware.RequireAuth(deps.TokenVerifier), authHandler.Me)
		auth.PATCH("/me", middleware.RequireAuth(deps.TokenVerifier), authHandler.UpdateMe)
		auth.PUT("/password", middleware.RequireAuth(deps.TokenVerifier), authHandler.ChangePassword)

		categoryHandler := handler.NewCategoryHandler(deps.Categories)
		categories := api.Group("/categories", middleware.RequireAuth(deps.TokenVerifier))
		categories.GET("", categoryHandler.List)
		categories.POST("", categoryHandler.Create)
		categories.POST("/defaults", categoryHandler.CreateDefaults)
		categories.DELETE("/:id", categoryHandler.Delete)

		transactionHandler := handler.NewTransactionHandler(deps.Transactions)
		transactions := api.Group("/transactions", middleware.RequireAuth(deps.TokenVerifier))
		transactions.GET("", transactionHandler.List)
		transactions.POST("", transactionHandler.Create)
		transactions.PUT("/:id", transactionHandler.Update)
		transactions.DELETE("/:id", transactionHandler.Delete)

		budgetHandler := handler.NewBudgetHandler(deps.Budgets)
		budgets := api.Group("/budgets", middleware.RequireAuth(deps.TokenVerifier))
		budgets.GET("", budgetHandler.List)
		budgets.POST("", budgetHandler.Create)
		budgets.PUT("/:id", budgetHandler.Update)
		budgets.DELETE("/:id", budgetHandler.Delete)

		goalHandler := handler.NewGoalHandler(deps.Goals)
		goals := api.Group("/goals", middleware.RequireAuth(deps.TokenVerifier))
		goals.GET("", goalHandler.List)
		goals.POST("", goalHandler.Create)
		goals.PUT("/:id", goalHandler.Update)
		goals.POST("/:id/deposit", goalHandler.Deposit)
		goals.POST("/:id/withdraw", goalHandler.Withdraw)
		goals.DELETE("/:id", goalHandler.Delete)

		assetHandler := handler.NewAssetHandler(deps.Assets)
		assets := api.Group("/assets", middleware.RequireAuth(deps.TokenVerifier))
		assets.GET("", assetHandler.List)
		assets.POST("", assetHandler.Create)
		assets.PUT("/:id", assetHandler.Update)
		assets.DELETE("/:id", assetHandler.Delete)

		// Signed-in users only, so the endpoint can't be used as an open proxy to the NAV source.
		fundNavHandler := handler.NewFundNavHandler(deps.FundNavs)
		api.GET("/funds/navs", middleware.RequireAuth(deps.TokenVerifier), fundNavHandler.List)
	}
	return r
}
