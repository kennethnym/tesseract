package workspace

import (
	"tesseract/internal/service"

	"github.com/labstack/echo/v4"
)

func newWorkspaceManagerMiddleware(services service.Services) echo.MiddlewareFunc {
	mgr := workspaceManager{
		db:           services.Database,
		dockerClient: services.DockerClient,
		reverseProxy: services.ReverseProxy,
		sshProxy:     services.SSHProxy,
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set("workspaceManager", mgr)
			return next(c)
		}
	}
}

func workspaceManagerFrom(c echo.Context) workspaceManager {
	return c.Get("workspaceManager").(workspaceManager)
}
