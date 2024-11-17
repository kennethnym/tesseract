package docker

import (
	"context"
	"github.com/docker/docker/api/types"
	"github.com/docker/go-connections/nat"
	"strconv"
)

// ContainerSSHHostPort returns the port on the host that is exposing the internal ssh port of the given container info
func ContainerSSHHostPort(ctx context.Context, container types.ContainerJSON) int {
	ports := container.NetworkSettings.Ports[nat.Port("22/tcp")]
	if len(ports) == 0 {
		return -1
	}
	port, err := strconv.Atoi(ports[0].HostPort)
	if err != nil {
		return -1
	}
	return port
}
