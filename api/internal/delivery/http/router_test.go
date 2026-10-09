package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	httpdelivery "github.com/leduchuy/money-management/api/internal/delivery/http"
	"github.com/leduchuy/money-management/api/internal/domain"
	"github.com/leduchuy/money-management/api/internal/infrastructure/security"
	"github.com/leduchuy/money-management/api/internal/testutil"
	"github.com/leduchuy/money-management/api/internal/usecase"
)

// End-to-end through Gin, the real use case, bcrypt and JWT; only the database is faked.
func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	gin.SetMode(gin.TestMode)
	jwtService, err := security.NewJWTService(strings.Repeat("s", 32), time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	hasher := &security.BcryptHasher{Cost: bcrypt.MinCost}
	auth, err := usecase.NewAuthUsecase(&testutil.MemoryUsers{}, &testutil.MemoryRefreshTokens{}, 30*24*time.Hour, hasher, jwtService, time.Now, uuid.NewString)
	if err != nil {
		t.Fatal(err)
	}
	categories := &testutil.MemoryCategories{}
	transactions := &testutil.MemoryTransactions{}
	return httpdelivery.NewRouter(httpdelivery.RouterDeps{
		Auth:          auth,
		Categories:    usecase.NewCategoryUsecase(categories, time.Now, uuid.NewString),
		Transactions:  usecase.NewTransactionUsecase(transactions, categories, time.Now, uuid.NewString),
		Budgets:       usecase.NewBudgetUsecase(&testutil.MemoryBudgets{Transactions: transactions}, categories, time.Now, uuid.NewString),
		Goals:         usecase.NewGoalUsecase(&testutil.MemoryGoals{}, time.Now, uuid.NewString),
		Assets:        usecase.NewAssetUsecase(&testutil.MemoryAssets{}, time.Now, uuid.NewString),
		TokenVerifier: jwtService,
		PingDB:        func(context.Context) error { return nil },
	})
}

type response struct {
	status int
	body   map[string]any
}

func do(t *testing.T, h http.Handler, method, path, body, token string) response {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var parsed map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &parsed)
	return response{rec.Code, parsed}
}

func errorCode(r response) string {
	e, _ := r.body["error"].(map[string]any)
	code, _ := e["code"].(string)
	return code
}

func TestAuthFlow(t *testing.T) {
	h := newTestServer(t)

	reg := do(t, h, "POST", "/api/v1/auth/register", `{"fullName":"Nguyễn Văn A","username":"demo_user","password":"demo12345"}`, "")
	if reg.status != http.StatusCreated {
		t.Fatalf("register status = %d, body = %v", reg.status, reg.body)
	}
	user := reg.body["user"].(map[string]any)
	if user["username"] != "demo_user" || user["fullName"] != "Nguyễn Văn A" || reg.body["token"] == "" {
		t.Fatalf("register body = %v", reg.body)
	}
	if _, leaked := user["passwordHash"]; leaked {
		t.Fatal("password hash must not be returned")
	}

	if r := do(t, h, "POST", "/api/v1/auth/register", `{"fullName":"B","username":"Demo_User","password":"demo12345"}`, ""); r.status != http.StatusConflict || errorCode(r) != "username_taken" {
		t.Fatalf("duplicate register = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/auth/register", `{"fullName":"B","username":"x","password":"demo12345"}`, ""); r.status != http.StatusBadRequest || errorCode(r) != "username_length" {
		t.Fatalf("invalid register = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/auth/register", `not json`, ""); r.status != http.StatusBadRequest || errorCode(r) != "invalid_request" {
		t.Fatalf("malformed register = %d %v", r.status, r.body)
	}

	if r := do(t, h, "POST", "/api/v1/auth/login", `{"username":"demo_user","password":"wrong-pass"}`, ""); r.status != http.StatusUnauthorized || errorCode(r) != "invalid_credentials" {
		t.Fatalf("wrong password = %d %v", r.status, r.body)
	}
	login := do(t, h, "POST", "/api/v1/auth/login", `{"username":"DEMO_USER","password":"demo12345"}`, "")
	if login.status != http.StatusOK {
		t.Fatalf("login = %d %v", login.status, login.body)
	}
	token := login.body["token"].(string)

	me := do(t, h, "GET", "/api/v1/auth/me", "", token)
	if me.status != http.StatusOK || me.body["user"].(map[string]any)["username"] != "demo_user" {
		t.Fatalf("me = %d %v", me.status, me.body)
	}
	if me.body["user"].(map[string]any)["cycleStartDay"] != float64(1) {
		t.Fatalf("default cycleStartDay: %v", me.body)
	}
	if r := do(t, h, "PATCH", "/api/v1/auth/me", `{"cycleStartDay":25}`, token); r.status != http.StatusOK || r.body["user"].(map[string]any)["cycleStartDay"] != float64(25) {
		t.Fatalf("set cycleStartDay = %d %v", r.status, r.body)
	}
	if r := do(t, h, "PATCH", "/api/v1/auth/me", `{"cycleStartDay":32}`, token); r.status != http.StatusBadRequest || errorCode(r) != "cycle_start_day_invalid" {
		t.Fatalf("bad cycleStartDay = %d %v", r.status, r.body)
	}
	if r := do(t, h, "PATCH", "/api/v1/auth/me", `{"cycleStartDay":5}`, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("patch me without token = %d", r.status)
	}
	if r := do(t, h, "PUT", "/api/v1/auth/password", `{"currentPassword":"nope","newPassword":"newpass123"}`, token); r.status != http.StatusBadRequest || errorCode(r) != "current_password_wrong" {
		t.Fatalf("wrong current password = %d %v", r.status, r.body)
	}
	if r := do(t, h, "PUT", "/api/v1/auth/password", `{"currentPassword":"demo12345","newPassword":"newpass123"}`, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("change password without token = %d", r.status)
	}
	refreshed := do(t, h, "POST", "/api/v1/auth/refresh", `{"refreshToken":"`+login.body["refreshToken"].(string)+`"}`, "")
	if refreshed.status != http.StatusOK || refreshed.body["token"] == "" || refreshed.body["refreshToken"] == login.body["refreshToken"] {
		t.Fatalf("refresh = %d %v", refreshed.status, refreshed.body)
	}
	if r := do(t, h, "POST", "/api/v1/auth/refresh", `{"refreshToken":"`+login.body["refreshToken"].(string)+`"}`, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("reused refresh token = %d %v", r.status, r.body)
	}
	changed := do(t, h, "PUT", "/api/v1/auth/password", `{"currentPassword":"demo12345","newPassword":"newpass123"}`, token)
	if changed.status != http.StatusOK || changed.body["refreshToken"] == "" {
		t.Fatalf("change password = %d %v", changed.status, changed.body)
	}
	if r := do(t, h, "POST", "/api/v1/auth/refresh", `{"refreshToken":"`+refreshed.body["refreshToken"].(string)+`"}`, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("other sessions must end after a password change = %d", r.status)
	}
	if r := do(t, h, "POST", "/api/v1/auth/login", `{"username":"demo_user","password":"newpass123"}`, ""); r.status != http.StatusOK {
		t.Fatalf("login with new password = %d %v", r.status, r.body)
	}
	for _, bad := range []string{"", "not-a-token", token + "x"} {
		if r := do(t, h, "GET", "/api/v1/auth/me", "", bad); r.status != http.StatusUnauthorized {
			t.Fatalf("me with token %q = %d", bad, r.status)
		}
	}

	if r := do(t, h, "GET", "/healthz", "", ""); r.status != http.StatusOK {
		t.Fatalf("healthz = %d", r.status)
	}
}

func register(t *testing.T, h http.Handler, username string) string {
	t.Helper()
	r := do(t, h, "POST", "/api/v1/auth/register", `{"fullName":"Test","username":"`+username+`","password":"demo12345"}`, "")
	if r.status != http.StatusCreated {
		t.Fatalf("register %s = %d %v", username, r.status, r.body)
	}
	return r.body["token"].(string)
}

func TestCategoriesFlow(t *testing.T) {
	h := newTestServer(t)
	alice := register(t, h, "alice")
	bob := register(t, h, "bob")

	if r := do(t, h, "GET", "/api/v1/categories", "", ""); r.status != http.StatusUnauthorized {
		t.Fatalf("list without token = %d", r.status)
	}
	if r := do(t, h, "GET", "/api/v1/categories", "", alice); r.status != http.StatusOK || len(r.body["categories"].([]any)) != 0 {
		t.Fatalf("empty list = %d %v", r.status, r.body)
	}

	created := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#8B5CF6"}`, alice)
	if created.status != http.StatusCreated {
		t.Fatalf("create = %d %v", created.status, created.body)
	}
	cat := created.body["category"].(map[string]any)
	if cat["name"] != "Cà phê" || cat["icon"] != "Coffee" || cat["color"] != "#8b5cf6" || cat["type"] != "expense" || cat["id"] == "" {
		t.Fatalf("created category = %v", cat)
	}
	if r := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"cà phê","icon":"Coffee","color":"#000000"}`, alice); r.status != http.StatusConflict || errorCode(r) != "category_name_taken" {
		t.Fatalf("duplicate = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"X","icon":"Coffee","color":"blue"}`, alice); r.status != http.StatusBadRequest || errorCode(r) != "color_invalid" {
		t.Fatalf("invalid color = %d %v", r.status, r.body)
	}

	defaults := do(t, h, "POST", "/api/v1/categories/defaults", "", alice)
	if defaults.status != http.StatusOK || int(defaults.body["created"].(float64)) != len(domain.DefaultCategories) || len(defaults.body["categories"].([]any)) != len(domain.DefaultCategories)+1 {
		t.Fatalf("defaults = %d %v", defaults.status, defaults.body)
	}
	if again := do(t, h, "POST", "/api/v1/categories/defaults", "", alice); int(again.body["created"].(float64)) != 0 {
		t.Fatalf("defaults again created %v", again.body["created"])
	}

	// Each user only sees their own categories.
	if r := do(t, h, "GET", "/api/v1/categories", "", bob); len(r.body["categories"].([]any)) != 0 {
		t.Fatalf("bob sees %v", r.body["categories"])
	}

	// Delete: only the owner can, and only once.
	id := cat["id"].(string)
	if r := do(t, h, "DELETE", "/api/v1/categories/"+id, "", bob); r.status != http.StatusNotFound {
		t.Fatalf("bob deleting alice's category = %d", r.status)
	}
	if r := do(t, h, "DELETE", "/api/v1/categories/"+id, "", alice); r.status != http.StatusNoContent {
		t.Fatalf("delete = %d %v", r.status, r.body)
	}
	if r := do(t, h, "DELETE", "/api/v1/categories/"+id, "", alice); r.status != http.StatusNotFound {
		t.Fatalf("delete again = %d", r.status)
	}
	if r := do(t, h, "GET", "/api/v1/categories", "", alice); len(r.body["categories"].([]any)) != len(domain.DefaultCategories) {
		t.Fatalf("after delete: %d categories", len(r.body["categories"].([]any)))
	}
	// The name is free again.
	if r := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#8B5CF6"}`, alice); r.status != http.StatusCreated {
		t.Fatalf("re-create after delete = %d %v", r.status, r.body)
	}
}

func TestCreateTransactionFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "spender")
	other := register(t, h, "other")
	coffee := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#78716c"}`, token)
	coffeeID := coffee.body["category"].(map[string]any)["id"].(string)

	body := `{"type":"expense","amount":45000,"categoryId":"` + coffeeID + `","date":"2026-10-08","note":"Highlands","occurredAt":"2026-10-08T02:30:00Z"}`
	if r := do(t, h, "POST", "/api/v1/transactions", body, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("without token = %d", r.status)
	}

	created := do(t, h, "POST", "/api/v1/transactions", body, token)
	if created.status != http.StatusCreated {
		t.Fatalf("create = %d %v", created.status, created.body)
	}
	tx := created.body["transaction"].(map[string]any)
	if tx["categoryId"] != coffeeID || tx["categoryName"] != "Cà phê" || tx["amount"] != float64(45000) ||
		tx["date"] != "2026-10-08" || tx["occurredAt"] != "2026-10-08T02:30:00Z" || tx["id"] == "" {
		t.Fatalf("created transaction = %v", tx)
	}

	if r := do(t, h, "POST", "/api/v1/transactions", body, other); r.status != http.StatusBadRequest || errorCode(r) != "category_not_found" {
		t.Fatalf("someone else's category = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/transactions", `{"type":"income","amount":45000,"categoryId":"`+coffeeID+`","date":"2026-10-08"}`, token); r.status != http.StatusBadRequest || errorCode(r) != "category_type_mismatch" {
		t.Fatalf("type mismatch = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/transactions", `{"type":"expense","amount":"lots","categoryId":"x","date":"2026-10-08"}`, token); r.status != http.StatusBadRequest || errorCode(r) != "invalid_request" {
		t.Fatalf("malformed = %d %v", r.status, r.body)
	}
}

func TestListTransactionsFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "lister")
	other := register(t, h, "someone")

	if r := do(t, h, "GET", "/api/v1/transactions", "", ""); r.status != http.StatusUnauthorized {
		t.Fatalf("without token = %d", r.status)
	}
	empty := do(t, h, "GET", "/api/v1/transactions", "", token)
	if list, ok := empty.body["transactions"].([]any); empty.status != http.StatusOK || !ok || len(list) != 0 {
		t.Fatalf("empty list must be [] (not null): %d %v", empty.status, empty.body)
	}

	coffee := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#78716c"}`, token)
	coffeeID := coffee.body["category"].(map[string]any)["id"].(string)
	for _, day := range []string{"2026-09-30", "2026-10-08", "2026-10-01"} {
		body := `{"type":"expense","amount":1000,"categoryId":"` + coffeeID + `","date":"` + day + `"}`
		if r := do(t, h, "POST", "/api/v1/transactions", body, token); r.status != http.StatusCreated {
			t.Fatalf("create %s = %d %v", day, r.status, r.body)
		}
	}

	dates := func(r response) []any {
		out := []any{}
		for _, tx := range r.body["transactions"].([]any) {
			out = append(out, tx.(map[string]any)["date"])
		}
		return out
	}
	if got := dates(do(t, h, "GET", "/api/v1/transactions", "", token)); len(got) != 3 || got[0] != "2026-10-08" || got[2] != "2026-09-30" {
		t.Fatalf("all, newest first = %v", got)
	}
	if got := dates(do(t, h, "GET", "/api/v1/transactions?from=2026-10-01&to=2026-10-31", "", token)); len(got) != 2 {
		t.Fatalf("october = %v", got)
	}
	if r := do(t, h, "GET", "/api/v1/transactions?from=2026-10-31&to=2026-10-01", "", token); r.status != http.StatusBadRequest || errorCode(r) != "date_range_invalid" {
		t.Fatalf("reversed range = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/transactions", "", other); len(r.body["transactions"].([]any)) != 0 {
		t.Fatalf("another user sees %v", r.body["transactions"])
	}

	// Delete: only the owner can, and only once.
	first := do(t, h, "GET", "/api/v1/transactions", "", token).body["transactions"].([]any)[0].(map[string]any)
	id := first["id"].(string)

	// Update: only the owner can.
	edit := `{"type":"expense","amount":2500,"categoryId":"` + coffeeID + `","date":"2026-10-08","note":"sửa"}`
	if r := do(t, h, "PUT", "/api/v1/transactions/"+id, edit, other); r.status != http.StatusNotFound {
		t.Fatalf("someone else updating = %d", r.status)
	}
	if r := do(t, h, "PUT", "/api/v1/transactions/"+id, edit, token); r.status != http.StatusOK ||
		r.body["transaction"].(map[string]any)["amount"] != float64(2500) || r.body["transaction"].(map[string]any)["note"] != "sửa" {
		t.Fatalf("update = %d %v", r.status, r.body)
	}
	if r := do(t, h, "DELETE", "/api/v1/transactions/"+id, "", other); r.status != http.StatusNotFound {
		t.Fatalf("someone else deleting = %d", r.status)
	}
	if r := do(t, h, "DELETE", "/api/v1/transactions/"+id, "", token); r.status != http.StatusNoContent {
		t.Fatalf("delete = %d %v", r.status, r.body)
	}
	if r := do(t, h, "DELETE", "/api/v1/transactions/"+id, "", token); r.status != http.StatusNotFound {
		t.Fatalf("delete again = %d", r.status)
	}
	if got := dates(do(t, h, "GET", "/api/v1/transactions", "", token)); len(got) != 2 {
		t.Fatalf("after delete = %v", got)
	}
}

func TestCreateBudgetFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "budgeter")
	other := register(t, h, "stranger")
	create := func(body string) string {
		r := do(t, h, "POST", "/api/v1/categories", body, token)
		return r.body["category"].(map[string]any)["id"].(string)
	}
	coffee := create(`{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#78716c"}`)
	salary := create(`{"type":"income","name":"Lương","icon":"Banknote","color":"#16a34a"}`)

	body := `{"categoryId":"` + coffee + `","limit":1000000}`
	if r := do(t, h, "POST", "/api/v1/budgets", body, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("without token = %d", r.status)
	}
	created := do(t, h, "POST", "/api/v1/budgets", body, token)
	if created.status != http.StatusCreated {
		t.Fatalf("create = %d %v", created.status, created.body)
	}
	b := created.body["budget"].(map[string]any)
	if b["categoryId"] != coffee || b["limit"] != float64(1000000) || b["id"] == "" {
		t.Fatalf("budget = %v", b)
	}

	for name, tc := range map[string]struct {
		token, body, code string
		status            int
	}{
		"duplicate":       {token, body, "budget_exists", http.StatusConflict},
		"income category": {token, `{"categoryId":"` + salary + `","limit":1000}`, "budget_category_not_expense", http.StatusBadRequest},
		"someone else":    {other, body, "category_not_found", http.StatusBadRequest},
		"zero limit":      {token, `{"categoryId":"` + coffee + `","limit":0}`, "limit_invalid", http.StatusBadRequest},
		"malformed":       {token, `{"categoryId":"x","limit":"lots"}`, "invalid_request", http.StatusBadRequest},
	} {
		if r := do(t, h, "POST", "/api/v1/budgets", tc.body, tc.token); r.status != tc.status || errorCode(r) != tc.code {
			t.Fatalf("%s = %d %v, want %d %s", name, r.status, r.body, tc.status, tc.code)
		}
	}
}

func TestBudgetsFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "monthly")
	other := register(t, h, "nosy")
	cat := do(t, h, "POST", "/api/v1/categories", `{"type":"expense","name":"Cà phê","icon":"Coffee","color":"#78716c"}`, token)
	coffee := cat.body["category"].(map[string]any)["id"].(string)
	for _, day := range []string{"2026-10-02", "2026-10-15", "2026-09-20"} {
		do(t, h, "POST", "/api/v1/transactions", `{"type":"expense","amount":30000,"categoryId":"`+coffee+`","date":"`+day+`"}`, token)
	}
	created := do(t, h, "POST", "/api/v1/budgets", `{"categoryId":"`+coffee+`","limit":50000}`, token)
	id := created.body["budget"].(map[string]any)["id"].(string)

	list := do(t, h, "GET", "/api/v1/budgets?month=2026-10", "", token)
	b := list.body["budgets"].([]any)[0].(map[string]any)
	if list.status != http.StatusOK || b["spent"] != float64(60000) || b["remaining"] != float64(-10000) || b["limit"] != float64(50000) {
		t.Fatalf("october = %d %v", list.status, list.body)
	}
	if r := do(t, h, "GET", "/api/v1/budgets?month=2026-11", "", token); r.body["budgets"].([]any)[0].(map[string]any)["spent"] != float64(0) {
		t.Fatalf("new month should start at 0: %v", r.body)
	}
	// Cycle 15/09 – 14/10 holds the 20/09 and 02/10 expenses.
	if r := do(t, h, "GET", "/api/v1/budgets?month=2026-09&startDay=15", "", token); r.body["budgets"].([]any)[0].(map[string]any)["spent"] != float64(60000) {
		t.Fatalf("cycle from the 15th: %v", r.body)
	}
	if r := do(t, h, "GET", "/api/v1/budgets?month=2026-09&startDay=abc", "", token); r.status != http.StatusBadRequest || errorCode(r) != "cycle_start_day_invalid" {
		t.Fatalf("bad startDay = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/budgets", "", token); r.status != http.StatusBadRequest || errorCode(r) != "month_invalid" {
		t.Fatalf("missing month = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/budgets?month=2026-10", "", other); len(r.body["budgets"].([]any)) != 0 {
		t.Fatalf("other user sees %v", r.body["budgets"])
	}

	if r := do(t, h, "PUT", "/api/v1/budgets/"+id, `{"limit":80000}`, token); r.status != http.StatusOK || r.body["budget"].(map[string]any)["limit"] != float64(80000) {
		t.Fatalf("update = %d %v", r.status, r.body)
	}
	if r := do(t, h, "PUT", "/api/v1/budgets/"+id, `{"limit":80000}`, other); r.status != http.StatusNotFound {
		t.Fatalf("other user's update = %d", r.status)
	}
	if r := do(t, h, "DELETE", "/api/v1/budgets/"+id, "", other); r.status != http.StatusNotFound {
		t.Fatalf("other user's delete = %d", r.status)
	}
	if r := do(t, h, "DELETE", "/api/v1/budgets/"+id, "", token); r.status != http.StatusNoContent {
		t.Fatalf("delete = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/budgets?month=2026-10", "", token); len(r.body["budgets"].([]any)) != 0 {
		t.Fatalf("after delete: %v", r.body)
	}
}

func TestGoalsFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "saver")
	other := register(t, h, "nosy")

	if r := do(t, h, "GET", "/api/v1/goals", "", ""); r.status != http.StatusUnauthorized {
		t.Fatalf("no token = %d", r.status)
	}
	created := do(t, h, "POST", "/api/v1/goals", `{"name":"Du lịch","target":20000000,"saved":1000000,"color":"pink","image":"data:image/jpeg;base64,/9j/"}`, token)
	if created.status != http.StatusCreated {
		t.Fatalf("create = %d %v", created.status, created.body)
	}
	goal := created.body["goal"].(map[string]any)
	id := goal["id"].(string)
	if _, has := goal["deadline"]; has || goal["image"] != "data:image/jpeg;base64,/9j/" || goal["saved"] != float64(1000000) {
		t.Fatalf("created goal = %v", goal)
	}
	if r := do(t, h, "POST", "/api/v1/goals", `{"name":"x","target":1,"color":"red"}`, token); r.status != http.StatusBadRequest || errorCode(r) != "color_invalid" {
		t.Fatalf("bad color = %d %v", r.status, r.body)
	}

	if r := do(t, h, "GET", "/api/v1/goals", "", token); r.status != http.StatusOK || len(r.body["goals"].([]any)) != 1 {
		t.Fatalf("list = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/goals", "", other); len(r.body["goals"].([]any)) != 0 {
		t.Fatalf("other user sees %v", r.body["goals"])
	}

	r := do(t, h, "POST", "/api/v1/goals/"+id+"/deposit", `{"amount":500000}`, token)
	if r.status != http.StatusOK || r.body["goal"].(map[string]any)["saved"] != float64(1500000) {
		t.Fatalf("deposit = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/goals/"+id+"/withdraw", `{"amount":2000000}`, token); r.status != http.StatusBadRequest || errorCode(r) != "withdraw_too_large" {
		t.Fatalf("over-withdraw = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/goals/"+id+"/withdraw", `{"amount":1500000}`, token); r.body["goal"].(map[string]any)["saved"] != float64(0) {
		t.Fatalf("withdraw = %d %v", r.status, r.body)
	}
	if r := do(t, h, "POST", "/api/v1/goals/"+id+"/deposit", `{"amount":1}`, other); r.status != http.StatusNotFound {
		t.Fatalf("other user's deposit = %d", r.status)
	}

	r = do(t, h, "PUT", "/api/v1/goals/"+id, `{"name":"Du lịch Đà Lạt","target":8000000,"saved":0,"deadline":"2027-02","color":"teal"}`, token)
	updated, _ := r.body["goal"].(map[string]any)
	if _, has := updated["image"]; r.status != http.StatusOK || has || updated["deadline"] != "2027-02" || updated["name"] != "Du lịch Đà Lạt" {
		t.Fatalf("update = %d %v", r.status, r.body)
	}
	if r := do(t, h, "PUT", "/api/v1/goals/"+id, `{"name":"x","target":1,"color":"teal"}`, other); r.status != http.StatusNotFound {
		t.Fatalf("other user's update = %d", r.status)
	}

	if r := do(t, h, "DELETE", "/api/v1/goals/"+id, "", other); r.status != http.StatusNotFound {
		t.Fatalf("other user's delete = %d", r.status)
	}
	if r := do(t, h, "DELETE", "/api/v1/goals/"+id, "", token); r.status != http.StatusNoContent {
		t.Fatalf("delete = %d", r.status)
	}
	if r := do(t, h, "GET", "/api/v1/goals", "", token); len(r.body["goals"].([]any)) != 0 {
		t.Fatalf("after delete: %v", r.body)
	}
}

func TestAssetsFlow(t *testing.T) {
	h := newTestServer(t)
	token := register(t, h, "investor")
	other := register(t, h, "peeker")

	if r := do(t, h, "GET", "/api/v1/assets", "", ""); r.status != http.StatusUnauthorized {
		t.Fatalf("without token = %d", r.status)
	}
	fund := `{"kind":"fund","name":"Quỹ DCDS","details":{"code":"dcds","manager":"Dragon Capital","nav":0,"navDate":"",` +
		`"transactions":[{"id":"t1","type":"buy","date":"2026-03-05","units":100.5,"amount":9000000,"nav":89552.24}]}}`
	created := do(t, h, "POST", "/api/v1/assets", fund, token)
	asset, _ := created.body["asset"].(map[string]any)
	details, _ := asset["details"].(map[string]any)
	if created.status != http.StatusCreated || details["code"] != "DCDS" || details["transactions"].([]any)[0].(map[string]any)["units"] != 100.5 {
		t.Fatalf("create = %d %v", created.status, created.body)
	}
	id := asset["id"].(string)

	bad := `{"kind":"fund","details":{"code":"DCDS","manager":"","nav":0,"navDate":"","transactions":[],"price":1}}`
	if r := do(t, h, "POST", "/api/v1/assets", bad, token); r.status != http.StatusBadRequest || errorCode(r) != "details_invalid" {
		t.Fatalf("unknown field = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/assets", "", other); len(r.body["assets"].([]any)) != 0 {
		t.Fatalf("another user sees %v", r.body)
	}
	savings := `{"kind":"savings","name":"","details":{"bank":"VCB","amount":80000000,"rate":4.7,"termMonths":6,` +
		`"openedAt":"2026-01-05","interestPayout":"maturity","onMaturity":"rollover_all"}}`
	if r := do(t, h, "PUT", "/api/v1/assets/"+id, savings, other); r.status != http.StatusNotFound {
		t.Fatalf("someone else updating = %d", r.status)
	}
	if r := do(t, h, "PUT", "/api/v1/assets/"+id, savings, token); r.status != http.StatusOK || r.body["asset"].(map[string]any)["details"].(map[string]any)["rate"] != 4.7 {
		t.Fatalf("update = %d %v", r.status, r.body)
	}
	if r := do(t, h, "GET", "/api/v1/assets", "", token); len(r.body["assets"].([]any)) != 1 {
		t.Fatalf("list = %v", r.body)
	}
	if r := do(t, h, "DELETE", "/api/v1/assets/"+id, "", token); r.status != http.StatusNoContent {
		t.Fatalf("delete = %d", r.status)
	}
	if r := do(t, h, "GET", "/api/v1/assets", "", token); len(r.body["assets"].([]any)) != 0 {
		t.Fatalf("after delete: %v", r.body)
	}
}
