package template

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/labstack/echo/v4"
	"io"
	"net/http"
	"tesseract/internal/service"
)

type createTemplateRequestBody struct {
	Description   string `json:"description"`
	Content       string `json:"content"`
	Documentation string `json:"documentation"`
	BaseTemplate  string `json:"baseTemplate"`
}

type postTemplateRequestBody struct {
	Description *string        `json:"description"`
	Files       []templateFile `json:"files"`

	ImageTag  *string            `json:"imageTag"`
	BuildArgs map[string]*string `json:"buildArgs"`
}

func fetchAllTemplates(c echo.Context) error {
	mgr := templateManagerFrom(c)
	templates, err := mgr.findAllTemplates(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, templates)
}

func fetchBaseTemplates(c echo.Context) error {
	mgr := templateManagerFrom(c)
	templates, err := mgr.findBaseTemplates(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, templates)
}

func fetchTemplate(c echo.Context) error {
	mgr := templateManagerFrom(c)
	template, err := mgr.findTemplate(c.Request().Context(), c.Param("templateName"))
	if err != nil {
		if errors.Is(err, errTemplateNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}
	return c.JSON(http.StatusOK, template)
}

func createOrUpdateTemplate(c echo.Context) error {
	mgr := templateManagerFrom(c)
	exists, err := mgr.hasTemplate(c.Request().Context(), c.Param("templateName"))
	if err != nil {
		return err
	}
	if !exists {
		return createTemplate(c)
	}

	var body postTemplateRequestBody
	err = json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	if body.ImageTag != nil || body.BuildArgs != nil {
		return buildTemplate(c, body)
	}

	return updateTemplate(c, body)
}

func createTemplate(c echo.Context) error {
	mgr := templateManagerFrom(c)
	name := c.Param("templateName")

	var body createTemplateRequestBody
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	createdTemplate, err := mgr.createTemplate(c.Request().Context(), createTemplateOptions{
		name:         name,
		description:  body.Description,
		baseTemplate: body.BaseTemplate,
	})
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, createdTemplate)
}

func updateTemplate(c echo.Context, body postTemplateRequestBody) error {
	name := c.Param("templateName")
	mgr := templateManagerFrom(c)
	ctx := c.Request().Context()

	updatedTemplate, err := mgr.updateTemplate(ctx, name, updateTemplateOptions{
		description: *body.Description,
	})
	if err != nil {
		if errors.Is(err, errTemplateNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.JSON(http.StatusOK, &updatedTemplate)
}

func buildTemplate(c echo.Context, body postTemplateRequestBody) error {
	mgr := templateManagerFrom(c)
	name := c.Param("templateName")
	ctx := c.Request().Context()

	template, err := mgr.findTemplate(ctx, name)
	if err != nil {
		if errors.Is(err, errTemplateNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	outputChan, err := mgr.buildTemplate(ctx, template, buildTemplateOptions{
		imageTag:  *body.ImageTag,
		buildArgs: body.BuildArgs,
	})
	if err != nil {
		return err
	}

	w := c.Response()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	for o := range outputChan {
		switch o := o.(type) {
		case error:
			return err
		case string:
			if _, err = w.Write([]byte(o)); err != nil {
				return err
			}
			w.Flush()
		}
	}

	return nil
}

func deleteTemplate(c echo.Context) error {
	mgr := templateManagerFrom(c)
	name := c.Param("templateName")

	err := mgr.deleteTemplate(c.Request().Context(), name)
	if err != nil {
		if errors.Is(err, errTemplateNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.NoContent(http.StatusOK)
}

func fetchTemplateFile(c echo.Context) error {
	mgr := templateManagerFrom(c)
	templateName := c.Param("templateName")
	filePath := c.Param("filePath")

	file, err := mgr.findTemplateFile(c.Request().Context(), templateName, filePath)
	if err != nil {
		if errors.Is(err, errTemplateNotFound) || errors.Is(err, errTemplateFileNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.Blob(http.StatusOK, "application/octet-stream", file.Content)
}

func updateTemplateFile(c echo.Context) error {
	mgr := templateManagerFrom(c)
	templateName := c.Param("templateName")
	filePath := c.Param("filePath")

	newContent, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return err
	}

	err = mgr.updateTemplateFile(c.Request().Context(), templateName, filePath, newContent)
	if err != nil {
		if errors.Is(err, errTemplateNotFound) || errors.Is(err, errTemplateFileNotFound) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.NoContent(http.StatusOK)
}

func fetchAllTemplateImages(c echo.Context) error {
	db := service.Database(c)

	var images []Image
	err := db.NewSelect().Model(&images).Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusOK, make([]Image, 0))
		}
		return err
	}

	if len(images) == 0 {
		return c.JSON(http.StatusOK, make([]Image, 0))
	}

	return c.JSON(http.StatusOK, images)
}
