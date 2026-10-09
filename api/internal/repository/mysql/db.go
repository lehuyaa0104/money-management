package mysql

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	gomysql "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	TLS      string // "tls" DSN value, e.g. "true"; empty = no TLS
	CACert   string // PEM; when set, TLS is on and verified against this CA (e.g. Aiven's)
}

// Open connects to MySQL, retrying for a while because the database container
// can still be starting when the API boots, then migrates the schema.
func Open(ctx context.Context, cfg Config, log *slog.Logger) (*gorm.DB, error) {
	// loc=UTC: DATETIME values are stored in UTC and DATE values keep their calendar day.
	// clientFoundRows: an UPDATE that matches a row but changes nothing still reports
	// 1 row affected, so "0 rows" reliably means "not found".
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=true&loc=UTC&clientFoundRows=true",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)
	if cfg.CACert != "" {
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM([]byte(cfg.CACert)) {
			return nil, errors.New("DB_CA_CERT: no PEM certificate found")
		}
		if err := gomysql.RegisterTLSConfig("custom", &tls.Config{RootCAs: pool}); err != nil {
			return nil, err
		}
		cfg.TLS = "custom"
	}
	if cfg.TLS != "" {
		dsn += "&tls=" + url.QueryEscape(cfg.TLS)
	}

	var db *gorm.DB
	var err error
	for attempt := 1; attempt <= 30; attempt++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			TranslateError: true, // duplicate keys come back as gorm.ErrDuplicatedKey
			Logger:         logger.Default.LogMode(logger.Warn),
			NowFunc:        func() time.Time { return time.Now().UTC() },
		})
		if err == nil {
			var sqlDB interface{ PingContext(context.Context) error }
			if sqlDB, err = db.DB(); err == nil {
				err = sqlDB.PingContext(ctx)
			}
		}
		if err == nil {
			break
		}
		log.Warn("database not ready, retrying", "attempt", attempt, "error", err)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := db.WithContext(ctx).AutoMigrate(&userModel{}, &refreshTokenModel{}, &categoryModel{}, &transactionModel{}, &budgetModel{}, &goalModel{}, &assetModel{}); err != nil {
		return nil, fmt.Errorf("migrate schema: %w", err)
	}
	return db, nil
}
