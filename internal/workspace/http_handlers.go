package workspace

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labstack/echo/v4"
	"net/http"
)

type createWorkspaceRequestBody struct {
	ImageID string `json:"imageId"`
}

type updateWorkspaceRequestBody struct {
	Status       string        `json:"status"`
	PortMappings []portMapping `json:"ports"`
}

func fetchAllWorkspaces(c echo.Context) error {
	mgr := workspaceManagerFrom(c)
	workspaces, err := mgr.findAllWorkspaces(c.Request().Context())
	if err != nil {
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

	ctx := c.Request().Context()
	mgr := workspaceManagerFrom(c)

	exists, err := mgr.hasWorkspace(ctx, workspaceName)
	if err != nil {
		return err
	}
	if !exists {
		return createWorkspace(c, workspaceName)
	}

	return updateWorkspace(c, workspaceName)
}

func createWorkspace(c echo.Context, workspaceName string) error {
	var body createWorkspaceRequestBody
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest)
	}

	mgr := workspaceManagerFrom(c)

	w, err := mgr.createWorkspace(c.Request().Context(), createWorkspaceOptions{
		name:    workspaceName,
		imageID: body.ImageID,
	})
	if err != nil {
		if errors.Is(err, errImageNotFound) {
			return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("no image with id %v exists", body.ImageID))
		}
		return err
	}

	return c.JSON(http.StatusOK, w)
}

func updateWorkspace(c echo.Context, workspaceName string) error {
	ctx := c.Request().Context()

	var body updateWorkspaceRequestBody
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	mgr := workspaceManagerFrom(c)

	workspace, err := mgr.findWorkspace(ctx, workspaceName)
	if err != nil {
		if errors.Is(err, errWorkspaceNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	switch status(body.Status) {
	case statusStopped:
		if err = mgr.stopWorkspace(ctx, workspace); err != nil {
			return err
		}
		break

	case statusRunning:
		if err = mgr.startWorkspace(ctx, workspace); err != nil {
			return err
		}
		break
	}

	if len(body.PortMappings) > 0 {
		if err = mgr.addPortMappings(ctx, workspace, body.PortMappings); err != nil {
			return err
		}
	}

	return c.JSON(http.StatusOK, workspace)
}

func deleteWorkspace(c echo.Context) error {
	workspaceName := c.Param("workspaceName")
	if workspaceName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	mgr := workspaceManagerFrom(c)
	if err := mgr.deleteWorkspace(c.Request().Context(), workspaceName); err != nil {
		if errors.Is(err, errWorkspaceNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.NoContent(http.StatusOK)
}
