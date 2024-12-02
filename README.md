# tesseract

tesseract is a Docker-based cloud development environments that lets you create and manage isolated development
environments. it is created because existing solutions are overengineered and missing things that i need.

tesseract was created because I needed a machine to test my other projects without polluting my machine's global
environment with project dependencies such as JDKs and other tools. As some of you reading this can relate, I like to
overengineer solutions to my problem, which is why I decided to build a container-based development environment for
myself.

tesseract is not complete - it does not support multiuser and therefore no authentication system is currently in place.
tesseract is designed to be used in an internal high-trust environment (such as a tailnet) where exposure to the machine
is limited. there is also no automated testing in place as i do not want to waste more time than i need to on this
project.

i am open to feature requests. however, limited time/effort will be spent on this project because unfortunately there are only 24 hours in a day.

---

# Documentation

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [User guide](#user-guide)
    - [Creating a template](#creating-a-template)
    - [Creating a workspace](#creating-a-workspace)
    - [Port forwarding](#port-forwarding)
    - [SSH access](#ssh-access)
    - [Docker runtime](#docker-runtime)

## Features

- Create isolated development environments through the web dashboard
- Create _templates_ to reuse and recreate environments easily
- Built-in SSH, HTTP, and WebSocket port forwarding
- Subdomain support for workspaces
- Train multiple machine learning models at the same time
  via [nvidia container toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)

## Installation

> [!IMPORTANT]
> Before installing tesseract, make sure that your machine has docker installed.

The installation script will install tesseract to `/opt/tesseract/`. To start tesseract, run the `tesseract` binary,
which runs tesseract in foreground.

## Configuration

A `config.json` must be present in `/opt/tesseract`. It contains configurable options for tesseract:

- `port`: which port tesseract should be listening on. The default is `8080`.
- `databasePath` (required): relative path (relative to the binary) to where the SQLite database is located.
- `hostName` (required): the host name hosting tesseract.

## User guide

Tesseract uses Docker under-the-hood to manage all your development environments, called _workspaces_.
Each workspace is provisioned by an _image_ which is built from a _template_. A template defines the steps to set up a
workspace using a `Dockerfile`. Tesseract provides base templates out of the box that you can then customize to suit
your needs.

### Creating a template

To start, first head to the "Templates" section and create a new template by clicking on the "New Template" button:

![The template dashboard](/docs/screenshots/template-dashboard.png)

You should see a dialog:

![Dialog for creating a new template](/docs/screenshots/new-template-dialog.png)

To start from a base template, click on the "Base template" dropdown, and select the base template you want to start
from. Once you are satisfied, hit "Create", and you should be greeted with the template editor. Go ahead and select "
Dockerfile" on the left:

![The template editor](/docs/screenshots/template-editor.png)

If you selected a base template, then you should see some content in the editor. For example, in the screenshot above,
the "Fedora 40 with OpenSSH Server" was selected, which configures a workspace with an OpenSSH server to enable SSH
access.

You can now start editing the template. tesseract will auto save any changes you save. To build a template, click on
the "Build button", which should present you with a build dialog:

![The build dialog](/docs/screenshots/build-dialog.png)

**Image name** is self-explanatory. Keep in mind that if you provide an existing image name, the existing image will be
overwritten.

**Build arguments** allow you to provide argument values for `ARG`s you defined in your template.

Once you are happy, click on "Build template". The dialog should disappear, and the "Build output" panel should appear
below the editor:

![Build output panel when a build is active](/docs/screenshots/build-output-panel.png)

### Creating a workspace

Once an image is built from a template, you can now create a workspace! Head to the workspaces page, and click on the "
New workspace" button. You should be presented with the following dialog:

![Dialog for creating a new workspace](/docs/screenshots/workspace-dialog.png)

Here, you give your workspace a name, as well as the image to bootstrap the workspace. The **Docker runtime** allows you
to pick a Docker runtime that should be used to run this workspace. For example, if you want docker-in-docker in your
workspace, you should select `sysbox-runc` as the runtime.

### Port forwarding

tesseract provides a built-in proxy that enables both HTTP/WebSocket port forwarding via a subdomain under the host on which tesseract is deployed. To open a port, open the workspace info dialog, and switch to the "Forwarded Ports" tab:

![Workspace information dialog with the forwarded ports tab open](/docs/screenshots/workspace-info-dialog.png)

Click on "Add port":

![Workspace information dialog when adding a new port](/docs/screenshots/workspace-info-dialog-adding-port.png)

For "subdomain", enter a subdomain that you want to forward the port to. For example, you can forward port 80 to the `web` subdomain. Port 80 of the workspace is now accessible via `web.myhost.com`, where `myhost.com` is where you are hosting tesseract.

### SSH access

If a workspace has OpenSSH server installed and running, tesseract will automatically expose that under a randomly assigned SSH port. To access the workspace, SSH using host IP/name and the provided port.

### Docker runtime

To use a Docker runtime to run your workspaces, you need to first ensure that the runtime is set up and installed on
your host machine. Below is a table that lists some Docker runtimes and what feature they provide:

|                                      Name                                      |               Description               |
|:------------------------------------------------------------------------------:|:---------------------------------------:|
|                  [sysbox](https://github.com/nestybox/sysbox)                  |  Enables isolated Docker in workspaces  |
| [nvidia-container-toolkit](https://github.com/NVIDIA/nvidia-container-toolkit) | Enables nvidia GPU access in workspaces |

> [!WARNING]
> I don't have access to an nvidia machine to verify whether nvidia-container-toolkit works well with tesseract, but it should work on paper. Please donate to my kofi or GitHub sponsor if you want me to test it out.
