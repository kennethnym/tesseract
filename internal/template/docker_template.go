package template

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"io"
	"time"
)

type createTemplateOptions struct {
	name        string
	description string
}

type templateBuildOptions struct {
	imageTag  string
	buildArgs map[string]*string
}

func createDockerTemplate(ctx context.Context, tx bun.Tx, opts createTemplateOptions) (*template, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	now := time.Now().Format(time.RFC3339)

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
		Content:    make([]byte, 0),
	}
	readme := templateFile{
		TemplateID: id,
		FilePath:   "README.md",
		Content:    make([]byte, 0),
	}
	files := []templateFile{dockerfile, readme}

	if err = tx.NewInsert().Model(&t).Returning("*").Scan(ctx); err != nil {
		return nil, err
	}

	if err = tx.NewInsert().Model(&files).Scan(ctx); err != nil {
		return nil, err
	}

	return &t, nil
}

func buildDockerTemplate(ctx context.Context, docker *client.Client, tmpl *template, opts templateBuildOptions) (io.ReadCloser, error) {
	if len(tmpl.Files) == 0 {
		return nil, errors.New("cannot build docker template: no files in template")
	}

	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	defer tw.Close()

	var dockerfile []byte
	for _, file := range tmpl.Files {
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

	res, err := docker.ImageBuild(ctx, r, types.ImageBuildOptions{
		Context:   r,
		Tags:      []string{opts.imageTag},
		BuildArgs: opts.buildArgs,
	})
	if err != nil {
		return nil, err
	}

	return res.Body, nil
}
