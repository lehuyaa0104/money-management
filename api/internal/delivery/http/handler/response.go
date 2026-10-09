package handler

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/leduchuy/money-management/api/internal/domain"
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

var statusByKind = map[domain.Kind]int{
	domain.KindValidation:   http.StatusBadRequest,
	domain.KindNotFound:     http.StatusNotFound,
	domain.KindConflict:     http.StatusConflict,
	domain.KindUnauthorized: http.StatusUnauthorized,
}

// WriteError maps business errors to their HTTP status; anything else is a 500
// whose details are logged but never sent to the client.
func WriteError(c *gin.Context, err error) {
	if e, ok := domain.AsError(err); ok {
		c.AbortWithStatusJSON(statusByKind[e.Kind], errorBody{Error: errorDetail{Code: e.Code, Message: e.Message}})
		return
	}
	slog.ErrorContext(c.Request.Context(), "request failed", "path", c.FullPath(), "error", err)
	c.AbortWithStatusJSON(http.StatusInternalServerError, errorBody{Error: errorDetail{
		Code: "internal_error", Message: "Đã có lỗi xảy ra, vui lòng thử lại",
	}})
}

func writeBadRequest(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusBadRequest, errorBody{Error: errorDetail{
		Code: "invalid_request", Message: "Dữ liệu gửi lên không hợp lệ",
	}})
}
