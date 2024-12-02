package apierror

import "fmt"

type APIError struct {
	StatusCode int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"error"`
}

func New(status int, code, message string) *APIError {
	return &APIError{status, code, message}
}

func (err *APIError) Error() string {
	return fmt.Sprintf("%s: %s", err.Code, err.Message)
}
