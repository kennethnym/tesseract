package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"github.com/golang-migrate/migrate/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"tesseract/internal/migration"
	"tesseract/internal/service"
	"tesseract/internal/template"
	"tesseract/internal/workspace"
)

func main() {
	execPath, err := os.Executable()
	if err != nil {
		log.Fatalln(err)
	}

	var configPath string
	flag.StringVar(&configPath, "config", filepath.Join(execPath, "config.json"), "absolute/relative path to the config file.")

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

	err = migration.Up(fmt.Sprintf("sqlite3://%s", config.DatabasePath))
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
	apiServer.Use(services.Middleware())
	g := apiServer.Group("/api")
	workspace.DefineRoutes(g, services)
	template.DefineRoutes(g)

	root := echo.New()
	root.Use(services.ReverseProxy.Middleware(), middleware.CORS())

	root.Any("/*", func(c echo.Context) error {
		req := c.Request()
		res := c.Response()
		apiServer.ServeHTTP(res, req)
		return nil
	})

	apiServer.HTTPErrorHandler = func(err error, c echo.Context) {
		var he *echo.HTTPError
		if errors.As(err, &he) {
			if err = c.JSON(he.Code, he.Message); err != nil {
				c.Logger().Error(err)
				_ = c.NoContent(http.StatusInternalServerError)
			}
		} else {
			c.Logger().Error(err)
			_ = c.NoContent(http.StatusInternalServerError)
		}
	}

	root.Logger.Fatal(root.Start(":8080"))
}
