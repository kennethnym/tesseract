package sshproxy

import (
	"fmt"
	"io"
	"net"
	"sync"
)

type proxyConnection struct {
	internalPort int
	externalPort int
	listener     net.Listener
}

func newProxyConnection(toPort int) (*proxyConnection, error) {
	l, err := net.Listen("tcp", ":0")
	if err != nil {
		return nil, err
	}

	externalPort := l.Addr().(*net.TCPAddr).Port

	return &proxyConnection{
		internalPort: toPort,
		externalPort: externalPort,
		listener:     l,
	}, nil
}

func (c *proxyConnection) start() {
	for {
		conn, err := c.listener.Accept()
		if err != nil {
			fmt.Printf("error accepting connection at %v: %v\n", c.listener.Addr(), err)
		}
		go c.forwardConnectionToSSH(conn)
	}
}

func (c *proxyConnection) forwardConnectionToSSH(conn net.Conn) {
	containerConn, err := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", c.internalPort))
	if err != nil {
		fmt.Printf("error connecting to container ssh at port %d\n", c.internalPort)
		return
	}
	defer containerConn.Close()

	var wg sync.WaitGroup
	defer wg.Wait()

	wg.Add(1)
	go func() {
		defer wg.Done()
		defer conn.Close()
		for {
			_, err := io.Copy(conn, containerConn)
			if err != nil {
				fmt.Println("read remote conn err", err)
				break
			}
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		defer conn.Close()
		for {
			_, err := io.Copy(containerConn, conn)
			if err != nil {
				fmt.Println("write remote conn err", err)
				break
			}
		}
	}()
}
