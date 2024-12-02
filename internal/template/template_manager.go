package template

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/docker/docker/errdefs"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"tesseract/internal/docker"
	"time"
)

type templateManager struct {
	db           *bun.DB
	dockerClient *client.Client
}

type createTemplateOptions struct {
	baseTemplate string
	name         string
	description  string
}

type updateTemplateOptions struct {
	tx          *bun.Tx
	description string
}

type buildTemplateOptions struct {
	tx        *bun.Tx
	imageTag  string
	buildArgs map[string]*string
}

var errTemplateNotFound = errors.New("template not found")
var errBaseTemplateNotFound = errors.New("base template not found")
var errTemplateFileNotFound = errors.New("template file not found")

func (mgr *templateManager) beginTx(ctx context.Context) (bun.Tx, error) {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return bun.Tx{}, err
	}
	return tx, nil
}

func (mgr *templateManager) findBaseTemplates(ctx context.Context) ([]baseTemplate, error) {
	return baseTemplates, nil
}

func (mgr *templateManager) findAllTemplates(ctx context.Context) ([]template, error) {
	var templates []template
	err := mgr.db.NewSelect().Model(&templates).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return make([]template, 0), nil
		}
		return nil, err
	}

	if len(templates) == 0 {
		return make([]template, 0), nil
	}

	return templates, nil
}

func (mgr *templateManager) findTemplate(ctx context.Context, name string) (*template, error) {
	var template template
	err := mgr.db.NewSelect().Model(&template).
		Relation("Files").
		Where("Name = ?", name).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errTemplateNotFound
		}
		return nil, err
	}

	if len(template.Files) > 0 {
		template.FileMap = make(map[string]*templateFile)
	}
	for _, f := range template.Files {
		template.FileMap[f.FilePath] = f
	}

	return &template, nil
}

func (mgr *templateManager) hasTemplate(ctx context.Context, name string) (bool, error) {
	exists, err := mgr.db.NewSelect().
		Table("templates").
		Where("Name = ?", name).
		Exists(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}

func (mgr *templateManager) createTemplate(ctx context.Context, opts createTemplateOptions) (*template, error) {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}

	id, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	now := time.Now().Format(time.RFC3339)

	baseTemplate, ok := baseTemplateMap[opts.baseTemplate]
	if !ok {
		return nil, errBaseTemplateNotFound
	}

	t := template{
		ID:             id,
		Name:           opts.name,
		Description:    opts.description,
		CreatedOn:      now,
		LastModifiedOn: now,
		IsBuilt:        false,
	}
	dockerfile := templateFile{
		TemplateID: id,
		FilePath:   "Dockerfile",
		Content:    []byte(baseTemplate.Content),
	}
	readme := templateFile{
		TemplateID: id,
		FilePath:   "README.md",
		Content:    make([]byte, 0),
	}
	files := []*templateFile{&dockerfile, &readme}

	if err = tx.NewInsert().Model(&t).Returning("*").Scan(ctx); err != nil {
		return nil, err
	}

	if err = tx.NewInsert().Model(&files).Scan(ctx); err != nil {
		return nil, err
	}

	t.Files = files

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	return &t, nil
}

func (mgr *templateManager) updateTemplate(ctx context.Context, name string, opts updateTemplateOptions) (*template, error) {
	tx := opts.tx
	autoCommit := false
	if tx == nil {
		_tx, err := mgr.db.BeginTx(ctx, nil)
		if err != nil {
			return nil, err
		}
		autoCommit = true
		tx = &_tx
	}

	var template template
	err := tx.NewUpdate().Model(&template).
		Where("Name = ?", name).
		Set("description = ?", opts.description).
		Returning("*").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errTemplateNotFound
		}
		return nil, err
	}

	if autoCommit {
		if err = tx.Commit(); err != nil {
			_ = tx.Rollback()
			return nil, err
		}
	}

	return &template, nil
}

func (mgr *templateManager) buildTemplate(ctx context.Context, template *template, opts buildTemplateOptions) (<-chan any, error) {
	tx := opts.tx
	autoCommit := false
	if tx == nil {
		_tx, err := mgr.db.BeginTx(ctx, nil)
		if err != nil {
			return nil, err
		}
		autoCommit = true
		tx = &_tx
	}

	if len(template.Files) == 0 {
		return nil, errors.New("cannot build docker template: no files in template")
	}

	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	defer tw.Close()

	var dockerfile []byte
	for _, file := range template.Files {
		if file.FilePath == "Dockerfile" {
			dockerfile = file.Content
			break
		}
	}
	if len(dockerfile) == 0 {
		return nil, errors.New("cannot build docker template: template does not contain Dockerfile")
	}

	h := tar.Header{
		Name: "Dockerfile",
		Size: int64(len(dockerfile)),
	}
	err := tw.WriteHeader(&h)
	if err != nil {
		return nil, err
	}

	_, err = tw.Write(dockerfile)
	if err != nil {
		return nil, err
	}

	r := bytes.NewReader(buf.Bytes())

	res, err := mgr.dockerClient.ImageBuild(ctx, r, types.ImageBuildOptions{
		Context:   r,
		Tags:      []string{opts.imageTag},
		BuildArgs: opts.buildArgs,
	})
	if err != nil {
		if errdefs.IsInvalidParameter(err) {
			return nil, &errBadTemplate{
				// the docker sdk returns an error message that looks like:
				// "Error response from daemon: dockerfile parse error on line 1: unknown instruction: FR (did you mean FROM?)"
				// we don't want the "error response..." part because it is meaningless
				message: docker.CleanErrorMessage(err.Error()),
			}
		}
		return nil, err
	}

	outputChan := make(chan any)

	go func() {
		defer close(outputChan)

		scanner := bufio.NewScanner(res.Body)
		var imageID string

		for scanner.Scan() {
			t := scanner.Text()

			fmt.Println("DOCKER LOG: ", t)

			var msg map[string]any
			err = json.Unmarshal([]byte(t), &msg)
			if err != nil {
				outputChan <- err
			}

			if stream, ok := msg["stream"].(string); ok {
				outputChan <- stream
			} else if errmsg, ok := msg["error"].(string); ok {
				outputChan <- errmsg + "\n"
			} else if status, ok := msg["status"].(string); ok {
				var text string
				if progress, ok := msg["progress"].(string); ok {
					text = fmt.Sprintf("%v: %v\n", status, progress)
				} else {
					text = status + "\n"
				}
				outputChan <- text
			} else if aux, ok := msg["aux"].(map[string]any); ok {
				if id, ok := aux["ID"].(string); ok {
					imageID = id
				}
			}
		}

		var img *Image

		if imageID != "" {
			img = &Image{
				TemplateID: template.ID,
				ImageTag:   opts.imageTag,
				ImageID:    imageID,
			}

			_, err = tx.NewInsert().Model(img).Exec(ctx)
			if err != nil {
				_ = tx.Rollback()
				outputChan <- err
			}
		}

		if autoCommit {
			if err = tx.Commit(); err != nil {
				_ = tx.Rollback()
				outputChan <- err
			}
		}

		if img != nil {
			outputChan <- img
		}
	}()

	return outputChan, nil
}

func (mgr *templateManager) deleteTemplate(ctx context.Context, name string) error {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	res, err := tx.NewDelete().Table("templates").
		Where("Name = ?", name).
		Exec(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errTemplateNotFound
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
		return errors.New("unexpected number of templates deleted")
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return nil
}

func (mgr *templateManager) findTemplateFile(ctx context.Context, templateName, filePath string) (*templateFile, error) {
	var tmpl template
	err := mgr.db.NewSelect().Model(&tmpl).
		Column("id").
		Where("Name = ?", templateName).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errTemplateNotFound
		}
		return nil, err
	}

	var file templateFile
	err = mgr.db.NewSelect().Model(&file).
		Where("template_id = ?", tmpl.ID).
		Where("file_path = ?", filePath).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errTemplateFileNotFound
		}
		return nil, err
	}

	return &file, nil
}

func (mgr *templateManager) updateTemplateFile(ctx context.Context, templateName, filePath string, content []byte) error {
	tx, err := mgr.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	var template template
	err = tx.NewSelect().Model(&template).
		Column("id").
		Where("Name = ?", templateName).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errTemplateNotFound
		}
		return err
	}

	_, err = tx.NewUpdate().Table("template_files").
		Set("content = ?", content).
		Where("template_id = ?", template.ID).
		Where("file_path = ?", filePath).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		if errors.Is(err, sql.ErrNoRows) {
			return errTemplateFileNotFound
		}
		return err
	}

	if err = tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return nil
}
