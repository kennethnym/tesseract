package migration

import (
	"embed"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "modernc.org/sqlite"
)

//go:embed sql/*.sql
var migrationFS embed.FS

func Up(url string) error {
	d, err := iofs.New(migrationFS, "sql")
	if err != nil {
		return err
	}

	m, err := migrate.NewWithSourceInstance("iofs", d, url)
	if err != nil {
		return err
	}

	return m.Up()
}
