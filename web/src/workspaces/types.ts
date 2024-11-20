enum WorkspaceStatus {
	Running = "running",
	Stopped = "stopped",
	Restarting = "restarting",
	Unknown = "unknown",
}

interface WorkspacePortMapping {
	subdomain: string;
	port: number;
}

interface Workspace {
	name: string;
	containerId: string;
	imageTag: string;
	createdAt: string;
	status: WorkspaceStatus;
	sshPort?: number;
	ports?: WorkspacePortMapping[];
}

export { WorkspaceStatus };
export type { Workspace, WorkspacePortMapping };
