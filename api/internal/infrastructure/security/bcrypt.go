package security

import "golang.org/x/crypto/bcrypt"

// BcryptHasher implements usecase.PasswordHasher.
type BcryptHasher struct {
	Cost int
}

func NewBcryptHasher() *BcryptHasher { return &BcryptHasher{Cost: bcrypt.DefaultCost} }

func (h *BcryptHasher) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), h.Cost)
	return string(hash), err
}

func (h *BcryptHasher) Compare(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
