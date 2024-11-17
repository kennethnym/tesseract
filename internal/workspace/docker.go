package workspace

import (
	"context"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"io"
)

type spawnedShell struct {
	io.Reader
	io.Writer

	execID string
}

func stopContainer(ctx context.Context, docker *client.Client, containerID string) error {
	return docker.ContainerStop(ctx, containerID, container.StopOptions{})
}

func startContainer(ctx context.Context, docker *client.Client, containerID string) error {
	return docker.ContainerStart(ctx, containerID, container.StartOptions{})
}

func deleteContainer(ctx context.Context, docker *client.Client, containerID string) error {
	return docker.ContainerRemove(ctx, containerID, container.RemoveOptions{
		RemoveVolumes: true,
	})
}

func inspectContainer(ctx context.Context, docker *client.Client, containerID string) (types.ContainerJSON, error) {
	return docker.ContainerInspect(ctx, containerID)
}

func spawnNewShell(ctx context.Context, docker *client.Client, containerID string) (*spawnedShell, error) {
	res, err := docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Tty:    true,
		Detach: true,
	})
	if err != nil {
		return nil, err
	}

	attached, err := docker.ContainerExecAttach(ctx, res.ID, container.ExecAttachOptions{})
	if err != nil {
		return nil, err
	}

	return &spawnedShell{
		Reader: attached.Reader,
		Writer: attached.Conn,
		execID: res.ID,
	}, nil
}
