CREATE TABLE IF NOT EXISTS workspaces
(
    id           TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL UNIQUE,
    container_id TEXT NOT NULL,
    image_tag    TEXT NOT NULL,
    created_at   TEXT NOT NULL,

    CONSTRAINT pk_workspaces PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS templates
(
    id               TEXT    NOT NULL UNIQUE,
    name             TEXT    NOT NULL UNIQUE,
    description      TEXT    NOT NULL,
    created_on       TEXT    NOT NULL,
    last_modified_on TEXT    NOT NULL,
    is_built         INTEGER NOT NULL,

    CONSTRAINT pk_templates PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS template_files
(
    template_id TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    content     BLOB NOT NULL,

    CONSTRAINT pk_template_files PRIMARY KEY (template_id, file_path)
);

CREATE TABLE IF NOT EXISTS template_images
(
    template_id TEXT NOT NULL,
    image_tag   TEXT NOT NULL,
    image_id    TEXT NOT NULL,

    CONSTRAINT pk_template_images PRIMARY KEY (template_id, image_tag, image_id)
);

CREATE TABLE IF NOT EXISTS port_mappings
(
    workspace_id   TEXT    NOT NULL,
    container_port INTEGER NOT NULL,
    subdomain      TEXT,

    CONSTRAINT pk_port_mappings PRIMARY KEY (workspace_id, container_port, subdomain)
)