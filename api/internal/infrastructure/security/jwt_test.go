package security

import (
	"strings"
	"testing"
	"time"
)

func TestJWTRoundTripAndExpiry(t *testing.T) {
	svc, err := NewJWTService(strings.Repeat("k", 32), time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	token, _, err := svc.Issue("user-1")
	if err != nil {
		t.Fatal(err)
	}
	if id, err := svc.Verify(token); err != nil || id != "user-1" {
		t.Fatalf("verify = %q, %v", id, err)
	}

	other, _ := NewJWTService(strings.Repeat("x", 32), time.Hour)
	if _, err := other.Verify(token); err == nil {
		t.Fatal("token signed with another secret must be rejected")
	}

	svc.now = func() time.Time { return time.Now().Add(2 * time.Hour) }
	if _, err := svc.Verify(token); err == nil {
		t.Fatal("expired token must be rejected")
	}

	if _, err := NewJWTService("short", time.Hour); err == nil {
		t.Fatal("short secret must be rejected")
	}
}
