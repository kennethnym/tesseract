package workspace

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/docker/docker/api/types/container"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
	"tesseract/internal/service"
	"tesseract/internal/template"
	"time"
)

type createWorkspaceRequestBody struct {
	ImageID string `json:"imageId"`
}

func fetchAllWorkspaces(c echo.Context) error {
	db := service.Database(c)

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

	return c.JSON(http.StatusOK, workspaces)
}

func createWorkspace(c echo.Context) error {
	workspaceName := c.Param("workspaceName")
	if workspaceName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	if !workspaceNameRegex.MatchString(workspaceName) {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	body := createWorkspaceRequestBody{}
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest)
	}

	db := service.Database(c)

	tx, err := db.BeginTx(c.Request().Context(), nil)
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

	docker := service.DockerClient(c)

	res, err := docker.ContainerCreate(c.Request().Context(), &container.Config{
		Image: img.ImageID,
	}, nil, nil, nil, workspaceName)
	if err != nil {
		return err
	}

	err = docker.ContainerStart(c.Request().Context(), res.ID, container.StartOptions{})
	if err != nil {
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
