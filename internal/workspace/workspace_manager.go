package workspace

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/errdefs"
	"github.com/docker/go-connections/nat"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"net/url"
	"strconv"
	"sync"
	"tesseract/internal/docker"
	"tesseract/internal/reverseproxy"
	"tesseract/internal/sshproxy"
	"tesseract/internal/template"
	"time"
)

// workspaceManager provides functions to manipulate workspaces.
type workspaceManager struct {
	db           *bun.DB
	dockerClient *client.Client
	reverseProxy *reverseproxy.ReverseProxy
	sshProxy     *sshproxy.SSHProxy
}

type createWorkspaceOptions struct {
	name    string
	imageID string
	runtime string
}

var errImageNotFound = errors.New("image not found")
var errWorkspaceNotFound = errors.New("workspace not found")
var errRuntimeNotFound = errors.New("runtime not found")

func (mgr workspaceManager) findAllWorkspaces(ctx context.Context) ([]workspace, error) {
	var workspaces []workspace
	err := mgr.db.NewSelect().Model(&workspaces).Relation("PortMappings").Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return make([]workspace, 0), nil
		}
		return nil, err
	}

	if len(workspaces) == 0 {
		return make([]workspace, 0), nil
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	var errs []error

	for i := range workspaces {
		i := i
		wg.Add(1)
		go func() {
			defer wg.Done()

			inspect, err := mgr.dockerClient.ContainerInspect(ctx, workspaces[i].ContainerID)
			if err != nil {
				mu.Lock()
				errs = append(errs, err)
				mu.Unlock()
			} else {
				switch inspect.State.Status {
				case "running":
					workspaces[i].Status = statusRunning
				case "exited":
					workspaces[i].Status = statusStopped
				case "paused":
					workspaces[i].Status = statusPaused
				case "restarting":
					workspaces[i].Status = statusRestarting
				default:
					workspaces[i].Status = statusUnknown
				}

				if internalPort := docker.ContainerSSHHostPort(ctx, inspect); internalPort > 0 {
					if port := mgr.sshProxy.FindExternalPort(internalPort); port > 0 {
						workspaces[i].SSHPort = port
					}
				}
			}
		}()
	}

	wg.Wait()

	if err = errors.Join(errs...); err != nil {
		return nil, err
	}

	return workspaces, nil
}

func (mgr workspaceManager) findWorkspace(ctx context.Context, name string) (*workspace, error) {
	var w workspace
	err := mgr.db.NewSelect().Model(&w).
		Relation("PortMappings").
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errWorkspaceNotFound
		}
		return nil, err
	}
	return &w, nil
}

func (mgr workspaceManager) hasWorkspace(ctx context.Context, name string) (bool, error) {
	exists, err := mgr.db.NewSelect().Table("workspaces").
		Where("name = ?", name).
		Exists(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}

func (mgr workspaceManager) createWorkspace(ctx context.Context, opts createWorkspaceOptions) (*workspace, error) {
	info, err := mgr.dockerClient.Info(ctx)
	if err != nil {
		return nil, err
	}

	_, ok := info.Runtimes[opts.runtime]
	if !ok {
		return nil, errRuntimeNotFound
	}

	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}

	var img template.Image
	err = tx.NewSelect().Model(&img).
		Where("image_id = ?", opts.imageID).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errImageNotFound
		}
		return nil, err
	}

	containerSSHPort := nat.Port("22/tcp")
	containerConfig := &container.Config{
		Tty:   true,
		Image: img.ImageID,
		ExposedPorts: nat.PortSet{
			containerSSHPort: {},
		},
	}

	hostConfig := &container.HostConfig{
		PortBindings: nat.PortMap{
			containerSSHPort: {
				{"127.0.0.1", ""},
			},
		},
		Runtime: opts.runtime,
	}

	res, err := mgr.dockerClient.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, opts.name)
	if err != nil {
		if errdefs.IsConflict(err) {
			return nil, &errWorkspaceExists{
				message: docker.CleanErrorMessage(err.Error()),
			}
		}
		return nil, err
	}

	err = mgr.dockerClient.ContainerStart(ctx, res.ID, container.StartOptions{})
	if err != nil {
		return nil, err
	}

	inspect, err := mgr.dockerClient.ContainerInspect(ctx, res.ID)
	if err != nil {
		return nil, err
	}

	ports := inspect.NetworkSettings.Ports[containerSSHPort]
	if len(ports) == 0 {
		return nil, errors.New("failed to bind ssh port for container")
	}

	hostPort, err := strconv.Atoi(ports[0].HostPort)
	if err != nil {
		return nil, err
	}

	if err = mgr.sshProxy.NewProxyEntryTo(hostPort); err != nil {
		return nil, err
	}

	id, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	w := workspace{
		ID:          id,
		Name:        opts.name,
		ContainerID: res.ID,
		ImageTag:    img.ImageTag,
		CreatedAt:   time.Now().Format(time.RFC3339),
		SSHPort:     hostPort,
		Status:      statusRunning,
	}
	_, err = tx.NewInsert().Model(&w).Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &w, nil
}

func (mgr workspaceManager) deleteWorkspace(ctx context.Context, workspace *workspace) error {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	inspect, err := mgr.dockerClient.ContainerInspect(ctx, workspace.ContainerID)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if inspect.State.Running {
		if err = mgr.dockerClient.ContainerStop(ctx, workspace.ContainerID, container.StopOptions{}); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if err = mgr.dockerClient.ContainerRemove(ctx, workspace.ContainerID, container.RemoveOptions{
		RemoveVolumes: true,
	}); err != nil {
		return err
	}

	res, err := tx.NewDelete().
		Model(workspace).
		WherePK().
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	count, err := res.RowsAffected()
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if count == 0 {
		_ = tx.Rollback()
		return errWorkspaceNotFound
	}
	if count != 1 {
		_ = tx.Rollback()
		return errors.New("unexpected number of workspaces deleted")
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return nil
}

func (mgr workspaceManager) startWorkspace(ctx context.Context, workspace *workspace) error {
	err := mgr.dockerClient.ContainerStart(ctx, workspace.ContainerID, container.StartOptions{})
	if err != nil {
		return err
	}

	inspect, err := mgr.dockerClient.ContainerInspect(ctx, workspace.ContainerID)
	if err != nil {
		return err
	}

	sshPort := docker.ContainerSSHHostPort(ctx, inspect)
	if sshPort <= 0 {
		return nil
	}

	if err = mgr.sshProxy.NewProxyEntryTo(sshPort); err != nil {
		return err
	}

	workspace.Status = statusRunning

	return nil
}

func (mgr workspaceManager) stopWorkspace(ctx context.Context, workspace *workspace) error {
	err := mgr.dockerClient.ContainerStop(ctx, workspace.ContainerID, container.StopOptions{})
	if err != nil {
		return err
	}
	workspace.Status = statusStopped
	return nil
}

func (mgr workspaceManager) addPortMappings(ctx context.Context, workspace *workspace, portMappings []portMapping) error {
	inspect, err := mgr.dockerClient.ContainerInspect(ctx, workspace.ContainerID)
	if err != nil {
		return err
	}

	containerIP := inspect.NetworkSettings.IPAddress

	urls := make([]*url.URL, len(portMappings))
	for i, m := range portMappings {
		u, err := url.Parse(fmt.Sprintf("http://%s:%d", containerIP, m.ContainerPort))
		if err != nil {
			return err
		}
		urls[i] = u
	}

	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	for i := range portMappings {
		portMappings[i].WorkspaceID = workspace.ID
		mgr.reverseProxy.AddEntry(portMappings[i].Subdomain, urls[i])
	}

	_, err = tx.NewInsert().Model(&portMappings).Exec(ctx)
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	workspace.PortMappings = portMappings

	return nil
}

func (mgr workspaceManager) deletePortMapping(ctx context.Context, workspace *workspace, portMapping *portMapping) error {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	_, err = tx.NewDelete().Model(portMapping).
		Where("workspace_id = ?", workspace.ID).
		Where("subdomain = ?", portMapping.Subdomain).
		Where("container_port = ?", portMapping.ContainerPort).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	mgr.reverseProxy.RemoveEntry(portMapping.Subdomain)

	return nil
}

func (mgr workspaceManager) findAvailableWorkspaceRuntimes(ctx context.Context) ([]workspaceRuntime, error) {
	info, err := mgr.dockerClient.Info(ctx)
	if err != nil {
		return nil, err
	}

	runtimes := make([]workspaceRuntime, 0, len(info.Runtimes))
	for name, r := range info.Runtimes {
		runtimes = append(runtimes, workspaceRuntime{
			Name: name,
			Path: r.Path,
		})
	}

	return runtimes, nil
}
