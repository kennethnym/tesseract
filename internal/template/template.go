package template

import (
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type template struct {
	bun.BaseModel `bun:"table:templates,alias:template"`

	ID             uuid.UUID `bun:"type:uuid,pk" json:"-"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	CreatedOn      string    `json:"createdOn"`
	LastModifiedOn string    `json:"lastModifiedOn"`
	IsBuilt        bool      `json:"isBuilt"`

	Files   []*templateFile          `bun:"rel:has-many,join:id=template_id" json:"-"`
	FileMap map[string]*templateFile `bun:"-" json:"files"`
}

type templateFile struct {
	bun.BaseModel `bun:"table:template_files,alias:template_file"`

	TemplateID uuid.UUID `bun:"type:uuid" json:"-"`
	FilePath   string    `json:"path"`
	Content    []byte    `bun:"type:blob" json:"content"`
}

type TemplateImage struct {
	bun.BaseModel `bun:"table:template_images,alias:template_images"`

	TemplateID uuid.UUID `bun:"type:uuid" json:"-"`
	ImageTag   string    `json:"imageTag"`
	ImageID    string    `json:"imageId"`
}
