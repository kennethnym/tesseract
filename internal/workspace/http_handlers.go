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

const keyCurrentWorkspace = "currentWorkspace"

func fetchAllWorkspaces(c echo.Context) error {
	mgr := workspaceManagerFrom(c)
	workspaces, err := mgr.findAllWorkspaces(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, workspaces)
}

func currentWorkspace(c echo.Context) *workspace {
	return c.Get(keyCurrentWorkspace).(*workspace)
}

func currentWorkspaceMiddleware(ignoreMissing bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			workspaceName := c.Param("workspaceName")
			if workspaceName == "" || !workspaceNameRegex.MatchString(workspaceName) {
				return echo.NewHTTPError(http.StatusNotFound)
			}

			mgr := workspaceManagerFrom(c)
			workspace, err := mgr.findWorkspace(c.Request().Context(), workspaceName)
			if err != nil {
				if errors.Is(err, errWorkspaceNotFound) {
					if ignoreMissing {
						c.Set(keyCurrentWorkspace, nil)
					} else {
						return echo.NewHTTPError(http.StatusNotFound)
					}
				} else {
					return err
				}
			}
			c.Set(keyCurrentWorkspace, workspace)

			return next(c)
		}
	}
}

func updateOrCreateWorkspace(c echo.Context) error {
	workspace := currentWorkspace(c)
	if workspace == nil {
		return createWorkspace(c, c.Param("workspaceName"))
	}
	return updateWorkspace(c, workspace)
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

func updateWorkspace(c echo.Context, workspace *workspace) error {
	ctx := c.Request().Context()

	var body updateWorkspaceRequestBody
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	mgr := workspaceManagerFrom(c)

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
	workspace := currentWorkspace(c)
	mgr := workspaceManagerFrom(c)
	if err := mgr.deleteWorkspace(c.Request().Context(), workspace); err != nil {
		if errors.Is(err, errWorkspaceNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.NoContent(http.StatusOK)
}

func deleteWorkspacePortMapping(c echo.Context) error {
	workspace := currentWorkspace(c)
	mgr := workspaceManagerFrom(c)

	portName := c.Param("portName")
	if portName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	var portMapping *portMapping
	for _, m := range workspace.PortMappings {
		if m.Subdomain == portName {
			portMapping = &m
			break
		}
	}
	if portMapping == nil {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	err := mgr.deletePortMapping(c.Request().Context(), workspace, portMapping)
	if err != nil {
		return err
	}

	return c.NoContent(http.StatusOK)
}
