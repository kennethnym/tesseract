package template

type errBadTemplate struct {
	message string
}

func (err *errBadTemplate) Error() string {
	return err.message
}
