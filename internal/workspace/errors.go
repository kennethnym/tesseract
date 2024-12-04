package workspace

import "strings"

type errWorkspaceExists struct {
	message string
}

type errPortMappingConflicts struct {
	conflicts []string
}

func (err *errWorkspaceExists) Error() string {
	return err.message
}

func (err *errPortMappingConflicts) Error() string {
	return "Subdomain(s) already in use: " + strings.Join(err.conflicts, ", ")
}
