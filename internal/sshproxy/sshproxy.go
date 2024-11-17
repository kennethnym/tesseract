package sshproxy

type SSHProxy struct {
	// internalPorts maps internal docker ssh ports to the corresponding external ssh ports
	// that users use to ssh into workspaces
	internalPorts map[int]int

	connections map[int]*proxyConnection
}

func New() *SSHProxy {
	return &SSHProxy{
		internalPorts: map[int]int{},
		connections:   map[int]*proxyConnection{},
	}
}

func (p *SSHProxy) NewProxyEntryTo(toPort int) error {
	c, err := newProxyConnection(toPort)
	if err != nil {
		return err
	}

	go c.start()

	p.connections[toPort] = c
	p.internalPorts[toPort] = c.externalPort

	return nil
}

func (p *SSHProxy) FindExternalPort(internalPort int) int {
	if port, ok := p.internalPorts[internalPort]; ok {
		return port
	}
	return -1
}
