package template

import (
	"github.com/labstack/echo/v4"
	"tesseract/internal/service"
)

func DefineRoutes(g *echo.Group, services service.Services) {
	g.Use(newTemplateManagerMiddleware(services))
	g.GET("/templates", fetchAllTemplates)
	g.GET("/templates/:templateName", fetchTemplate, validateTemplateName)
	g.PUT("/templates/:templateName", createTemplate, validateTemplateName)
	g.POST("/templates/:templateName", updateOrBuildTemplate, validateTemplateName)
	g.DELETE("/templates/:templateName", deleteTemplate, validateTemplateName)
	g.GET("/templates/:templateName/:filePath", fetchTemplateFile, validateTemplateName, validateTemplateFilePath)
	g.POST("/templates/:templateName/:filePath", updateTemplateFile, validateTemplateName, validateTemplateFilePath)
	g.GET("/template-images", fetchAllTemplateImages)
	g.GET("/base-templates", fetchBaseTemplates)
}
