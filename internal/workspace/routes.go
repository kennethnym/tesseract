package workspace

import (
	"github.com/labstack/echo/v4"
	"tesseract/internal/service"
)

func DefineRoutes(g *echo.Group, services service.Services) {
	g.Use(newWorkspaceManagerMiddleware(services))
	g.GET("/workspaces", fetchAllWorkspaces)
	g.POST("/workspaces/:workspaceName", updateOrCreateWorkspace, currentWorkspaceMiddleware(true))
	g.DELETE("/workspaces/:workspaceName", deleteWorkspace, currentWorkspaceMiddleware(false))
	g.DELETE("/workspaces/:workspaceName/forwarded-ports/:portName", deleteWorkspacePortMapping, currentWorkspaceMiddleware(false))
	g.GET("/workspace-runtimes", fetchWorkspaceRuntimes)
}
