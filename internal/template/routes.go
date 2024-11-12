package template

import (
	"github.com/labstack/echo/v4"
)

func DefineRoutes(g *echo.Group) {
	g.GET("/templates", fetchAllTemplates)
	g.GET("/templates/:templateName", fetchTemplate)
	g.POST("/templates/:templateName", createOrUpdateTemplate)
	g.DELETE("/templates/:templateName", deleteTemplate)
	g.GET("/templates/:templateName/:filePath", fetchTemplateFile)
	g.POST("/templates/:templateName/:filePath", updateTemplateFile)
	g.GET("/template-images", fetchAllTemplateImages)
}
