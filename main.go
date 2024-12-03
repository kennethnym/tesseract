package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"tesseract/internal/apierror"
	"tesseract/internal/migration"
	"tesseract/internal/service"
	"tesseract/internal/template"
	"tesseract/internal/workspace"

	"github.com/golang-migrate/migrate/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

//go:embed web/dist/*
var web embed.FS

func main() {
	execPath, err := os.Executable()
	if err != nil {
		log.Fatalln(err)
	}

	var configPath string
	flag.StringVar(&configPath, "config", filepath.Join(filepath.Dir(execPath), "config.json"), "absolute/relative path to the config file.")

	flag.Parse()

	configPath, err = filepath.Abs(configPath)
	if err != nil {
		log.Fatalln(err)
	}

	f, err := os.Open(configPath)
	if err != nil {
		log.Fatalln(err)
	}

	config, err := service.ReadConfigFrom(f)
	if err != nil {
		log.Fatalln(err)
	}

	services, err := service.Initialize(config)
	if err != nil {
		log.Fatalln(err)
	}

	err = migration.Up(fmt.Sprintf("sqlite://%s", config.DatabasePath))
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalln(err)
	}

	log.Println("syncing all workspaces...")
	syncCtx, cancel := context.WithCancel(context.Background())
	if err = workspace.SyncAll(syncCtx, services); err != nil {
		log.Fatalln(err)
	}
	cancel()

	apiServer := echo.New()
	apiServer.Use(services.ReverseProxy.Middleware(), services.Middleware(), middleware.CORS())
	apiServer.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		HTML5:      true,
		Root:       "web/dist",
		Filesystem: http.FS(web),
	}))

	g := apiServer.Group("/api")
	workspace.DefineRoutes(g, services)
	template.DefineRoutes(g, services)

	apiServer.HTTPErrorHandler = func(err error, c echo.Context) {
		var he *echo.HTTPError
		if errors.As(err, &he) {
			if err = c.JSON(he.Code, he.Message); err != nil {
				c.Logger().Error(err)
				_ = c.NoContent(http.StatusInternalServerError)
			}
			return
		}

		var apiErr *apierror.APIError
		if errors.As(err, &apiErr) {
			if err = c.JSON(apiErr.StatusCode, apiErr); err != nil {
				c.Logger().Error(err)
				_ = c.NoContent(http.StatusInternalServerError)
			}
			return
		}

		c.Logger().Error(err)
		_ = c.NoContent(http.StatusInternalServerError)
	}

	apiServer.Logger.Fatal(apiServer.Start(fmt.Sprintf(":%d", config.Port)))
}
