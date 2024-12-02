package workspace

type errWorkspaceExists struct {
	message string
}

func (err *errWorkspaceExists) Error() string {
	return err.message
}
