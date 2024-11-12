package workspace

import (
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"regexp"
)

type workspace struct {
	bun.BaseModel `bun:"table:workspaces,alias:workspace"`

	ID uuid.UUID `bun:",type:uuid,pk"`

	Name string `json:"name"`

	// containerId is the ID of the docker container
	ContainerID string `json:"containerId"`

	ImageTag string `json:"imageTag"`

	CreatedAt string `json:"createdAt"`
}

var workspaceNameRegex = regexp.MustCompile("^[\\w-]+$")
