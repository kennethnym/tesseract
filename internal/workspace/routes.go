package workspace

import (
	"github.com/labstack/echo/v4"
)

func DefineRoutes(g *echo.Group) {
	g.GET("/workspaces", fetchAllWorkspaces)
	g.POST("/workspaces/:workspaceName", updateOrCreateWorkspace)
	g.DELETE("/workspaces/:workspaceName", deleteWorkspace)
}
