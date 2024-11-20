package workspace

import (
	"github.com/labstack/echo/v4"
	"tesseract/internal/service"
)

func DefineRoutes(g *echo.Group, services service.Services) {
	g.Use(newWorkspaceManagerMiddleware(services))
	g.GET("/workspaces", fetchAllWorkspaces)
	g.POST("/workspaces/:workspaceName", updateOrCreateWorkspace)
	g.DELETE("/workspaces/:workspaceName", deleteWorkspace)
}
