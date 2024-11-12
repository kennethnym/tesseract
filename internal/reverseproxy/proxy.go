package reverseproxy

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
	"strings"
	"tesseract/internal/service"
)

type ReverseProxy struct {
	*echo.Echo

	services    service.Services
	httpProxies map[string]*httputil.ReverseProxy
}

type portMapping struct {
	subdomain     string
	containerPort int
	hostPort      int
}

const keyReverseProxy = "reverseProxy"

func New(services service.Services) *ReverseProxy {
	e := echo.New()
	proxy := &ReverseProxy{
		e,
		services,
		make(map[string]*httputil.ReverseProxy),
	}

	e.Any("/*", proxy.handleRequest)

	return proxy
}

func From(c echo.Context) *ReverseProxy {
	return c.Get(keyReverseProxy).(*ReverseProxy)
}

func (p *ReverseProxy) Start() error {
	rows, err := p.services.Database.Query("SELECT container_port, host_port, subdomain FROM port_mappings;")
	if err != nil {
		return err
	}
	defer rows.Close()

	var mappings []portMapping
	for rows.Next() {
		mapping := portMapping{}
		err = rows.Scan(&mapping.containerPort, &mapping.hostPort, &mapping.subdomain)
		if err != nil {
			return err
		}
	}

	for _, m := range mappings {
		if m.subdomain == "" {
			continue
		}

		u, err := url.Parse(fmt.Sprintf("http://localhost:%d", m.hostPort))
		if err != nil {
			continue
		}

		proxy := httputil.NewSingleHostReverseProxy(u)
		p.httpProxies[m.subdomain] = proxy
	}

	return nil
}

func (p *ReverseProxy) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set(keyReverseProxy, p)
			return next(c)
		}
	}
}

func (p *ReverseProxy) ShouldHandleRequest(c echo.Context) bool {
	config := p.services.Config
	h := strings.Replace(config.HostName, ".", "\\.", -1)
	reg, err := regexp.Compile(".*\\." + h)
	if err != nil {
		return false
	}
	return reg.MatchString(c.Request().Host)
}

func (p *ReverseProxy) handleRequest(c echo.Context) error {
	req := c.Request()
	res := c.Response()
	config := p.services.Config

	h := strings.Replace(config.HostName, ".", "\\.", -1)
	reg, err := regexp.Compile(fmt.Sprintf("(?P<subdomain>.*)\\.%v", h))
	if err != nil {
		return err
	}

	matches := reg.FindStringSubmatch(req.Host)
	if len(matches) == 0 {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	var subdomain string
	for i, name := range reg.SubexpNames() {
		if i != 0 && name == "subdomain" {
			subdomain = matches[i]
			break
		}
	}
	if subdomain == "" {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	proxy, ok := p.httpProxies[subdomain]
	if !ok {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	proxy.ServeHTTP(res, req)

	return nil
}
