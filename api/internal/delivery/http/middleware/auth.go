package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const userIDKey = "userID"

// TokenVerifier checks an access token and returns its user ID.
type TokenVerifier interface {
	Verify(token string) (userID string, err error)
}

// RequireAuth rejects requests without a valid "Authorization: Bearer <token>" header.
func RequireAuth(verifier TokenVerifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
		if !ok || token == "" {
			abortUnauthorized(c)
			return
		}
		userID, err := verifier.Verify(token)
		if err != nil {
			abortUnauthorized(c)
			return
		}
		c.Set(userIDKey, userID)
		c.Next()
	}
}

// UserID returns the authenticated user's ID; only valid behind RequireAuth.
func UserID(c *gin.Context) string { return c.GetString(userIDKey) }

func abortUnauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": gin.H{
		"code": "unauthorized", "message": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
	}})
}
