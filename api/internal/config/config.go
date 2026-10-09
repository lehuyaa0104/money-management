package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port           int
	DBHost         string
	DBPort         int
	DBUser         string
	DBPassword     string
	DBName         string
	JWTSecret      string
	JWTTTL         time.Duration
	AllowedOrigins []string
}

// Load reads configuration from environment variables (see .env.example).
func Load() (*Config, error) {
	cfg := &Config{
		DBHost:     getenv("DB_HOST", "localhost"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
	}
	var errs []error
	var err error
	if cfg.Port, err = strconv.Atoi(getenv("PORT", "8080")); err != nil {
		errs = append(errs, fmt.Errorf("PORT: %w", err))
	}
	if cfg.DBPort, err = strconv.Atoi(getenv("DB_PORT", "3306")); err != nil {
		errs = append(errs, fmt.Errorf("DB_PORT: %w", err))
	}
	if cfg.JWTTTL, err = time.ParseDuration(getenv("JWT_TTL", "168h")); err != nil {
		errs = append(errs, fmt.Errorf("JWT_TTL: %w", err))
	}
	for name, value := range map[string]string{"DB_USER": cfg.DBUser, "DB_PASSWORD": cfg.DBPassword, "DB_NAME": cfg.DBName, "JWT_SECRET": cfg.JWTSecret} {
		if value == "" {
			errs = append(errs, fmt.Errorf("%s is required", name))
		}
	}
	for _, origin := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, origin)
		}
	}
	return cfg, errors.Join(errs...)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
