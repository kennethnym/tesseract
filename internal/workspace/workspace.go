package workspace

import (
	"context"
	"database/sql"
	"errors"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"regexp"
	"sync"
	"tesseract/internal/docker"
	"tesseract/internal/service"
)

type workspace struct {
	bun.BaseModel `bun:"table:workspaces,alias:workspace"`

	ID uuid.UUID `bun:",type:uuid,pk"`

	Name string `json:"name"`

	// containerId is the ID of the docker container
	ContainerID string `json:"containerId"`

	ImageTag string `json:"imageTag"`

	CreatedAt string `json:"createdAt"`

	SSHPort int `bun:"-" json:"sshPort,omitempty"`

	Status status `bun:"-" json:"status"`
}

// status represents the status of a workspace.
type status string

const (
	statusRunning    status = "running"
	statusStopped    status = "stopped"
	statusPaused     status = "paused"
	statusRestarting status = "restarting"
	statusUnknown    status = "unknown"
)

var workspaceNameRegex = regexp.MustCompile("^[\\w-]+$")

func SyncAll(ctx context.Context, services service.Services) error {
	tx, err := services.Database.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	var workspaces []workspace
	if err = tx.NewSelect().Model(&workspaces).
		Column("id", "container_id").
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
	}
	if len(workspaces) == 0 {
		return nil
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	var errs []error

	var deletedWorkspaces []workspace

	for _, w := range workspaces {
		w := w
		wg.Add(1)
		go func() {
			var err error
			defer wg.Done()
			defer func() {
				mu.Lock()
				errs = append(errs, err)
				mu.Unlock()
			}()

			if err = services.DockerClient.ContainerStart(ctx, w.ContainerID, container.StartOptions{}); err != nil {
				if client.IsErrNotFound(err) {
					err = nil
					mu.Lock()
					deletedWorkspaces = append(deletedWorkspaces, w)
					mu.Unlock()
				}
				return
			}

			inspect, err := services.DockerClient.ContainerInspect(ctx, w.ContainerID)
			if err != nil {
				return
			}

			internalPort := docker.ContainerSSHHostPort(ctx, inspect)
			if internalPort <= 0 {
				return
			}

			err = services.SSHProxy.NewProxyEntryTo(internalPort)
		}()
	}

	if err = errors.Join(errs...); err != nil {
		_ = tx.Rollback()
		return err
	}

	_, err = tx.NewDelete().Model(&deletedWorkspaces).WherePK().Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return nil
}
