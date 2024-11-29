package template

import (
	"net/http"
	"tesseract/internal/service"

	"github.com/labstack/echo/v4"
)

func newTemplateManagerMiddleware(service service.Services) echo.MiddlewareFunc {
	mgr := templateManager{
		db:           service.Database,
		dockerClient: service.DockerClient,
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set("templateManager", &mgr)
			return next(c)
		}
	}
}

func validateTemplateName(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		templateName := c.Param("templateName")
		if templateName == "" || !templateNameRegex.MatchString(templateName) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return next(c)
	}
}

func validateTemplateFilePath(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		filePath := c.Param("filePath")
		if filePath == "" {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return next(c)
	}
}

func templateManagerFrom(c echo.Context) *templateManager {
	return c.Get("templateManager").(*templateManager)
}
