package template

type baseTemplate struct {
	Name    string `json:"name"`
	ID      string `json:"id"`
	Content string `json:"-"`
}

var baseTemplates = []baseTemplate{fedora40WithSSH}

var baseTemplateMap = map[string]baseTemplate{
	"empty": {
		Name:    "Empty",
		ID:      "empty",
		Content: "",
	},
	"fedora-40-openssh": fedora40WithSSH,
}

var fedora40WithSSH = baseTemplate{
	Name: "Fedora 40 With OpenSSH Server",
	ID:   "fedora-40-openssh",
	Content: `FROM fedora:40

RUN dnf install -y openssh-server \
    && mkdir -p /etc/ssh \
    && ssh-keygen -q -N "" -t rsa -b 4096 -f /etc/ssh/ssh_host_rsa_key \
    && useradd testuser \
    && echo "testuser:12345678" | chpasswd
    && usermod -aG wheel testuser

CMD ["/usr/sbin/sshd", "-D"]
`,
}
