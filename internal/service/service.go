package service

import (
	"database/sql"
	"github.com/docker/docker/client"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/labstack/echo/v4"
	"github.com/olahol/melody"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/extra/bundebug"
	_ "modernc.org/sqlite"
	"net/http"
	"tesseract/internal/reverseproxy"
	"tesseract/internal/sshproxy"
)

const (
	keyHTTPClient   = "httpClient"
	keyDockerClient = "dockerClient"
	keyDB           = "db"
	keyConfig       = "config"
	keySSHProxy     = "sshProxy"
	keyReverseProxy = "reverseProxy"
)

type Services struct {
	HTTPClient   *http.Client
	DockerClient *client.Client
	Database     *bun.DB
	Config       Config
	SSHProxy     *sshproxy.SSHProxy
	ReverseProxy *reverseproxy.ReverseProxy
	Melody       *melody.Melody
}

func HTTPClient(c echo.Context) *http.Client {
	return c.Get(keyHTTPClient).(*http.Client)
}

func DockerClient(c echo.Context) *client.Client {
	return c.Get(keyDockerClient).(*client.Client)
}

func Database(c echo.Context) *bun.DB {
	return c.Get(keyDB).(*bun.DB)
}

func SSHProxy(c echo.Context) *sshproxy.SSHProxy {
	return c.Get(keySSHProxy).(*sshproxy.SSHProxy)
}

func ReverseProxy(c echo.Context) *reverseproxy.ReverseProxy {
	return c.Get(keyReverseProxy).(*reverseproxy.ReverseProxy)
}

func Initialize(config Config) (Services, error) {
	hc := &http.Client{}

	docker, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return Services{}, err
	}

	db, err := sql.Open(sqliteshim.ShimName, config.DatabasePath)
	if err != nil {
		return Services{}, err
	}
	bundb := bun.NewDB(db, sqlitedialect.New())
	bundb.AddQueryHook(bundebug.NewQueryHook(bundebug.WithVerbose(true)))

	sshProxy := sshproxy.New()

	return Services{
		HTTPClient:   hc,
		DockerClient: docker,
		Database:     bundb,
		Config:       config,
		Melody:       melody.New(),
		SSHProxy:     sshProxy,
		ReverseProxy: reverseproxy.New(config.HostName),
	}, nil
}

func (s Services) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set(keyHTTPClient, s.HTTPClient)
			c.Set(keyDockerClient, s.DockerClient)
			c.Set(keyDB, s.Database)
			c.Set(keyConfig, s.Config)
			c.Set(keySSHProxy, s.SSHProxy)
			c.Set(keyReverseProxy, s.ReverseProxy)
			return next(c)
		}
	}
}
