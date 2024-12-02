package template

type baseTemplate struct {
	Name    string `json:"name"`
	ID      string `json:"id"`
	Content string `json:"-"`
}

var baseTemplates = []baseTemplate{fedora40WithSSH, fedora40SSHDocker}

var baseTemplateMap = map[string]baseTemplate{
	"empty": {
		Name:    "Empty",
		ID:      "empty",
		Content: "",
	},
	"fedora-40-openssh":        fedora40WithSSH,
	"fedora-40-openssh-docker": fedora40SSHDocker,
}

var fedora40WithSSH = baseTemplate{
	Name: "Fedora 40 With OpenSSH Server",
	ID:   "fedora-40-openssh",
	Content: `FROM fedora:40

ARG user
ARG password

RUN dnf install -y openssh-server \
    && mkdir -p /etc/ssh \
    && ssh-keygen -q -N "" -t rsa -b 4096 -f /etc/ssh/ssh_host_rsa_key \
    && useradd "$user" \
    && echo "$user:$password" | chpasswd \
    && usermod -aG wheel "$user"

CMD ["/usr/sbin/sshd", "-D"]
`,
}

var fedora40SSHDocker = baseTemplate{
	Name: "Fedora 40 + OpenSSH Server + Docker",
	ID:   "fedora-40-openssh-docker",
	Content: `FROM fedora:40

ARG user
ARG password

RUN dnf install -y openssh-server dnf-plugins-core \
    && dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo \
    && dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
    && mkdir -p /etc/ssh \
    && ssh-keygen -q -N "" -t rsa -b 4096 -f /etc/ssh/ssh_host_rsa_key \
    && useradd "$user" \
    && echo "$user:$password" | chpasswd \
    && usermod -aG wheel,docker "$user"

CMD ["/usr/sbin/sshd", "-D"]
`,
}
