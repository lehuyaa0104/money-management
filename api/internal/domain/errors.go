package domain

import "errors"

// Kind classifies an error so outer layers can map it (e.g. to an HTTP status)
// without knowing about specific use cases.
type Kind int

const (
	KindValidation Kind = iota + 1
	KindNotFound
	KindConflict
	KindUnauthorized
)

// Error is a business error with a stable machine-readable code and a message
// that is safe to show to end users (Vietnamese, matching the web app).
type Error struct {
	Kind    Kind
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func Validation(code, message string) *Error {
	return &Error{Kind: KindValidation, Code: code, Message: message}
}

var (
	ErrNotFound           = &Error{Kind: KindNotFound, Code: "not_found", Message: "Không tìm thấy dữ liệu"}
	ErrUsernameTaken      = &Error{Kind: KindConflict, Code: "username_taken", Message: "Tên đăng nhập đã tồn tại"}
	ErrInvalidCredentials = &Error{Kind: KindUnauthorized, Code: "invalid_credentials", Message: "Sai tên đăng nhập hoặc mật khẩu"}
	ErrUnauthorized       = &Error{Kind: KindUnauthorized, Code: "unauthorized", Message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"}
)

// AsError returns the *Error inside err, if any.
func AsError(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}
