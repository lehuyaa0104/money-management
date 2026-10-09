package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"

	"github.com/leduchuy/money-management/api/internal/config"
	httpdelivery "github.com/leduchuy/money-management/api/internal/delivery/http"
	"github.com/leduchuy/money-management/api/internal/infrastructure/fmarket"
	"github.com/leduchuy/money-management/api/internal/infrastructure/security"
	"github.com/leduchuy/money-management/api/internal/repository/mysql"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "probe /healthz of a running server and exit (for Docker)")
	flag.Parse()

	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(log)

	if *healthcheck {
		os.Exit(probe())
	}
	if err := run(log); err != nil {
		log.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := mysql.Open(ctx, mysql.Config{
		Host: cfg.DBHost, Port: cfg.DBPort, User: cfg.DBUser, Password: cfg.DBPassword, Name: cfg.DBName,
		TLS: cfg.DBTLS, CACert: cfg.DBCACert,
	}, log)
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()

	// Wiring: outer layers depend on inner ones, never the reverse.
	jwtService, err := security.NewJWTService(cfg.JWTSecret, cfg.JWTTTL)
	if err != nil {
		return err
	}
	// Millisecond precision matches the DATETIME(3) columns, so API responses
	// show the same timestamp before and after a round trip through MySQL.
	now := func() time.Time { return time.Now().UTC().Truncate(time.Millisecond) }
	authUsecase, err := usecase.NewAuthUsecase(
		mysql.NewUserRepository(db), mysql.NewRefreshTokenRepository(db), cfg.RefreshTTL,
		security.NewBcryptHasher(), jwtService, now, uuid.NewString,
	)
	if err != nil {
		return err
	}
	categoryRepo := mysql.NewCategoryRepository(db)
	router := httpdelivery.NewRouter(httpdelivery.RouterDeps{
		Auth:           authUsecase,
		Categories:     usecase.NewCategoryUsecase(categoryRepo, now, uuid.NewString),
		Transactions:   usecase.NewTransactionUsecase(mysql.NewTransactionRepository(db), categoryRepo, now, uuid.NewString),
		Budgets:        usecase.NewBudgetUsecase(mysql.NewBudgetRepository(db), categoryRepo, now, uuid.NewString),
		Goals:          usecase.NewGoalUsecase(mysql.NewGoalRepository(db), now, uuid.NewString),
		Assets:         usecase.NewAssetUsecase(mysql.NewAssetRepository(db), now, uuid.NewString),
		FundNavs:       usecase.NewFundNavUsecase(fmarket.New(), time.Hour, now),
		TokenVerifier:  jwtService,
		PingDB:         sqlDB.PingContext,
		AllowedOrigins: cfg.AllowedOrigins,
	})

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("server listening", "addr", server.Addr)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return err
		}
	}
	return nil
}

// probe exits 0 when the local server answers /healthz with 200. The runtime image
// is distroless (no curl/wget), so the binary checks itself.
func probe() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
