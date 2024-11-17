package sshproxy

type SSHProxy struct {
	// internalPorts maps internal docker ssh ports to the corresponding external ssh ports
	// that users use to ssh into workspaces
	internalPorts map[int]int

	connections map[int]*proxyConnection

	closedConnections chan *proxyConnection
}

func New() *SSHProxy {
	p := &SSHProxy{
		internalPorts:     map[int]int{},
		connections:       map[int]*proxyConnection{},
		closedConnections: make(chan *proxyConnection),
	}

	go p.handleClosedConnections()

	return p
}

func (p *SSHProxy) NewProxyEntryTo(toPort int) error {
	c, err := newProxyConnection(toPort, p.closedConnections)
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

func (p *SSHProxy) handleClosedConnections() {
	for c := range p.closedConnections {
		delete(p.internalPorts, c.internalPort)
		delete(p.connections, c.internalPort)
	}
}
