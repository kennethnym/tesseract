package workspace

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
	"strconv"
	"sync"
	"tesseract/internal/docker"
	"tesseract/internal/service"
	"tesseract/internal/template"
	"time"
)

type createWorkspaceRequestBody struct {
	ImageID string `json:"imageId"`
}

type updateWorkspaceRequestBody struct {
	Status string `json:"status"`
}

func fetchAllWorkspaces(c echo.Context) error {
	db := service.Database(c)
	ctx := c.Request().Context()

	var workspaces []workspace
	err := db.NewSelect().Model(&workspaces).Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusOK, make([]workspace, 0))
		}
		return err
	}

	if len(workspaces) == 0 {
		return c.JSON(http.StatusOK, make([]workspace, 0))
	}

	dockerClient := service.DockerClient(c)
	sshProxy := service.SSHProxy(c)

	var wg sync.WaitGroup
	var mu sync.Mutex
	var errs []error
	for i, w := range workspaces {
		wg.Add(1)
		i, w := i, w
		go func() {
			defer wg.Done()

			inspect, err := dockerClient.ContainerInspect(ctx, w.ContainerID)
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
					if port := sshProxy.FindExternalPort(internalPort); port > 0 {
						workspaces[i].SSHPort = port
					}
				}
			}
		}()
	}

	wg.Wait()

	if err = errors.Join(errs...); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, workspaces)
}

func updateOrCreateWorkspace(c echo.Context) error {
	workspaceName := c.Param("workspaceName")
	if workspaceName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	if !workspaceNameRegex.MatchString(workspaceName) {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	db := service.Database(c)
	ctx := c.Request().Context()

	var w workspace
	err := db.NewSelect().Model(&w).
		Where("name = ?", workspaceName).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return createWorkspace(c, workspaceName)
		}
		return err
	}

	var body updateWorkspaceRequestBody
	if err = json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return err
	}

	dockerClient := service.DockerClient(c)
	sshProxy := service.SSHProxy(c)

	switch status(body.Status) {
	case statusStopped:
		if err = stopContainer(ctx, dockerClient, workspaceName); err != nil {
			return err
		}
		w.Status = statusStopped
		break

	case statusRunning:
		if err = startContainer(ctx, dockerClient, workspaceName); err != nil {
			return err
		}

		inspect, err := dockerClient.ContainerInspect(ctx, w.ContainerID)
		if err != nil {
			return err
		}

		sshPort := docker.ContainerSSHHostPort(ctx, inspect)
		if sshPort > 0 {
			if err = sshProxy.NewProxyEntryTo(sshPort); err != nil {
				return err
			}
		}

		w.Status = statusRunning

		break
	}

	return c.JSON(http.StatusOK, w)
}

func createWorkspace(c echo.Context, workspaceName string) error {
	var body createWorkspaceRequestBody
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest)
	}

	db := service.Database(c)
	ctx := c.Request().Context()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	var img template.TemplateImage
	err = tx.NewSelect().Model(&img).
		Where("image_id = ?", body.ImageID).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusBadRequest, "image id not found")
		}
		return err
	}

	dockerClient := service.DockerClient(c)

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
	}

	res, err := dockerClient.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, workspaceName)
	if err != nil {
		return err
	}

	err = dockerClient.ContainerStart(ctx, res.ID, container.StartOptions{})
	if err != nil {
		return err
	}

	inspect, err := dockerClient.ContainerInspect(ctx, res.ID)
	if err != nil {
		return err
	}

	ports := inspect.NetworkSettings.Ports[containerSSHPort]
	if len(ports) == 0 {
		return errors.New("failed to bind ssh port for container")
	}

	sshProxy := service.SSHProxy(c)
	hostPort, err := strconv.Atoi(ports[0].HostPort)
	if err != nil {
		return err
	}

	if err = sshProxy.NewProxyEntryTo(hostPort); err != nil {
		return err
	}

	id, err := uuid.NewV7()
	if err != nil {
		return err
	}

	w := workspace{
		ID:          id,
		Name:        workspaceName,
		ContainerID: res.ID,
		ImageTag:    img.ImageTag,
		CreatedAt:   time.Now().Format(time.RFC3339),
		SSHPort:     hostPort,
		Status:      statusRunning,
	}
	_, err = tx.NewInsert().Model(&w).Exec(c.Request().Context())
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, w)
}

func deleteWorkspace(c echo.Context) error {
	workspaceName := c.Param("workspaceName")
	if workspaceName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	db := service.Database(c)
	dockerClient := service.DockerClient(c)
	ctx := c.Request().Context()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	var w workspace
	if err = tx.NewSelect().Model(&w).Scan(ctx); err != nil {
		_ = tx.Rollback()
		return echo.NewHTTPError(http.StatusNotFound)
	}

	inspect, err := inspectContainer(ctx, dockerClient, w.ContainerID)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if inspect.State.Running {
		if err = stopContainer(ctx, dockerClient, w.ContainerID); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if err = deleteContainer(ctx, dockerClient, w.ContainerID); err != nil {
		return err
	}

	res, err := tx.NewDelete().
		Table("workspaces").
		Where("name = ?", workspaceName).
		Exec(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	count, err := res.RowsAffected()
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if count == 0 {
		_ = tx.Rollback()
		return echo.NewHTTPError(http.StatusNotFound)
	}
	if count != 1 {
		_ = tx.Rollback()
		return echo.NewHTTPError(http.StatusNotFound)
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return c.NoContent(http.StatusOK)
}
