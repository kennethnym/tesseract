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

interface WorkspaceRuntime {
	name: string;
	path: string;
}

export { WorkspaceStatus };
export type { Workspace, WorkspaceRuntime, WorkspacePortMapping };
