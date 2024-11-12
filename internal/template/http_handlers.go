package template

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labstack/echo/v4"
	"io"
	"net/http"
	"strings"
	"tesseract/internal/service"
)

type createTemplateRequestBody struct {
	Description   string `json:"description"`
	Content       string `json:"content"`
	Documentation string `json:"documentation"`
}

type updateTemplateRequestBody struct {
	Description *string        `json:"description"`
	Files       []templateFile `json:"files"`

	ImageTag  *string            `json:"imageTag"`
	BuildArgs map[string]*string `json:"buildArgs"`
}

type templateBuildLogEvent struct {
	Type       string `json:"type"`
	LogContent string `json:"logContent"`
}

type templateBuildFinishedEvent struct {
	Type     string    `json:"type"`
	Template *template `json:"template"`
}

func fetchAllTemplates(c echo.Context) error {
	db := service.Database(c)

	var templates []template
	err := db.NewSelect().Model(&templates).Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusOK, make([]template, 0))
		}
		return err
	}

	if len(templates) == 0 {
		return c.JSON(http.StatusOK, make([]template, 0))
	}
	return c.JSON(http.StatusOK, templates)
}

func fetchTemplate(c echo.Context) error {
	db := service.Database(c)

	name := c.Param("templateName")
	if strings.TrimSpace(name) == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	var tmpl template
	err := db.NewSelect().Model(&tmpl).
		Relation("Files").
		Where("name = ?", name).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	if len(tmpl.Files) > 0 {
		tmpl.FileMap = make(map[string]*templateFile)
	}
	for _, f := range tmpl.Files {
		tmpl.FileMap[f.FilePath] = f
	}

	return c.JSON(http.StatusOK, tmpl)
}

func createOrUpdateTemplate(c echo.Context) error {
	db := service.Database(c)

	name := c.Param("templateName")
	if strings.TrimSpace(name) == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	exists, err := db.NewSelect().
		Table("templates").
		Where("name = ?", name).
		Exists(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return createTemplate(c)
		}
		return err
	}

	if !exists {
		return createTemplate(c)
	}

	return updateTemplate(c)
}

func createTemplate(c echo.Context) error {
	db := service.Database(c)
	name := c.Param("templateName")

	var body createTemplateRequestBody
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return err
	}

	createdTemplate, err := createDockerTemplate(c.Request().Context(), tx, createTemplateOptions{
		name:        name,
		description: body.Description,
	})
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return c.JSON(http.StatusOK, createdTemplate)
}

func updateTemplate(c echo.Context) error {
	db := service.Database(c)
	name := c.Param("templateName")

	var body updateTemplateRequestBody
	err := json.NewDecoder(c.Request().Body).Decode(&body)
	if err != nil {
		return err
	}

	if body.BuildArgs != nil && body.ImageTag == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Image tag must be specified if buildArgs is passed")
	}

	tx, err := db.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return err
	}

	var tmpl template
	err = tx.NewSelect().Model(&tmpl).
		Where("name = ?", name).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	if body.Description != nil {
		tmpl.Description = *body.Description
		_, err = tx.NewUpdate().Model(&tmpl).
			Column("description").
			WherePK().
			Exec(c.Request().Context())
		if err != nil {
			_ = tx.Rollback()
			return err
		}

		if err = tx.Commit(); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if body.ImageTag != nil {
		err = tx.NewSelect().Model(&tmpl.Files).
			Where("template_id = ?", tmpl.ID).
			Scan(c.Request().Context())
		if err != nil {
			_ = tx.Rollback()
			return err
		}

		docker := service.DockerClient(c)
		log, err := buildDockerTemplate(c.Request().Context(), docker, &tmpl, templateBuildOptions{
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

		scanner := bufio.NewScanner(log)

		var imageID string

		for scanner.Scan() {
			t := scanner.Text()

			fmt.Println("DOCKER LOG: ", t)

			var msg map[string]any
			err = json.Unmarshal([]byte(t), &msg)
			if err != nil {
				return err
			}

			if stream, ok := msg["stream"].(string); ok {
				if _, err = w.Write([]byte(stream)); err != nil {
					return err
				}
				w.Flush()
			} else if errmsg, ok := msg["error"].(string); ok {
				if _, err = w.Write([]byte(errmsg + "\n")); err != nil {
					return err
				}
				w.Flush()
			} else if status, ok := msg["status"].(string); ok {
				var text string
				if progress, ok := msg["progress"].(string); ok {
					text = fmt.Sprintf("%v: %v\n", status, progress)
				} else {
					text = status + "\n"
				}
				if _, err = w.Write([]byte(text)); err != nil {
					return err
				}
				w.Flush()
			} else if aux, ok := msg["aux"].(map[string]any); ok {
				if id, ok := aux["ID"].(string); ok {
					imageID = id
				}
			}
		}

		if imageID != "" {
			img := TemplateImage{
				TemplateID: tmpl.ID,
				ImageTag:   *body.ImageTag,
				ImageID:    imageID,
			}

			_, err = tx.NewInsert().Model(&img).Exec(c.Request().Context())
			if err != nil {
				_ = tx.Rollback()
				return err
			}
		}

		if err = tx.Commit(); err != nil {
			_ = tx.Rollback()
			return err
		}

		return nil
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return c.JSON(http.StatusOK, &tmpl)
}

func deleteTemplate(c echo.Context) error {
	templateName := c.Param("templateName")
	if templateName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	db := service.Database(c)

	tx, err := db.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return err
	}

	res, err := tx.NewDelete().Table("templates").
		Where("name = ?", templateName).
		Exec(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		_ = tx.Rollback()
		return err
	}

	count, err := res.RowsAffected()
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	if count != 1 {
		_ = tx.Rollback()
		return echo.NewHTTPError(http.StatusInternalServerError)
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return c.NoContent(http.StatusOK)
}

func fetchTemplateFile(c echo.Context) error {
	templateName := c.Param("templateName")
	if templateName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	filePath := c.Param("filePath")
	if filePath == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	db := service.Database(c)

	var tmpl template
	err := db.NewSelect().Model(&tmpl).
		Column("id").
		Where("name = ?", templateName).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	var file templateFile
	err = db.NewSelect().Model(&file).
		Where("template_id = ?", tmpl.ID).
		Where("file_path = ?", filePath).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	return c.Blob(http.StatusOK, "application/octet-stream", file.Content)
}

func updateTemplateFile(c echo.Context) error {
	templateName := c.Param("templateName")
	if templateName == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	filePath := c.Param("filePath")
	if filePath == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	db := service.Database(c)

	tx, err := db.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return err
	}

	var tmpl template
	err = tx.NewSelect().Model(&tmpl).
		Column("id").
		Where("name = ?", templateName).
		Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	newContent, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return err
	}

	_, err = tx.NewUpdate().Table("template_files").
		Set("content = ?", newContent).
		Where("template_id = ?", tmpl.ID).
		Where("file_path = ?", filePath).
		Exec(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound)
		}
		return err
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return c.NoContent(http.StatusOK)
}

func fetchAllTemplateImages(c echo.Context) error {
	db := service.Database(c)

	var images []TemplateImage
	err := db.NewSelect().Model(&images).Scan(c.Request().Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusOK, make([]TemplateImage, 0))
		}
		return err
	}

	if len(images) == 0 {
		return c.JSON(http.StatusOK, make([]TemplateImage, 0))
	}

	return c.JSON(http.StatusOK, images)
}
