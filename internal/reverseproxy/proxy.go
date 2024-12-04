package reverseproxy

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
	"strings"
)

type ReverseProxy struct {
	*echo.Echo
	hostName    string
	httpProxies map[string]*httputil.ReverseProxy
}

const keyReverseProxy = "reverseProxy"

func New(hostName string) *ReverseProxy {
	e := echo.New()
	proxy := &ReverseProxy{
		e,
		hostName,
		make(map[string]*httputil.ReverseProxy),
	}

	e.Any("/*", proxy.handleRequest)

	return proxy
}

func (p *ReverseProxy) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if p.shouldHandleRequest(c) {
				return p.handleRequest(c)
			}
			c.Set(keyReverseProxy, p)
			return next(c)
		}
	}
}

func (p *ReverseProxy) AddEntry(subdomain string, url *url.URL) error {
	_, ok := p.httpProxies[subdomain]
	if ok {
		return ErrPortMappingConflict
	}
	proxy := httputil.NewSingleHostReverseProxy(url)
	p.httpProxies[subdomain] = proxy
	return nil
}

func (p *ReverseProxy) RemoveEntry(subdomain string) {
	delete(p.httpProxies, subdomain)
}

func (p *ReverseProxy) shouldHandleRequest(c echo.Context) bool {
	h := strings.Replace(p.hostName, ".", "\\.", -1)
	reg, err := regexp.Compile(".*\\." + h)
	if err != nil {
		return false
	}
	return reg.MatchString(c.Request().Host)
}

func (p *ReverseProxy) handleRequest(c echo.Context) error {
	req := c.Request()
	res := c.Response()

	h := strings.Replace(p.hostName, ".", "\\.", -1)
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

	ps := strings.Split(subdomain, ".")
	first := ps[len(ps)-1]
	proxy, ok := p.httpProxies[first]
	if !ok {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	proxy.ServeHTTP(res, req)

	return nil
}
