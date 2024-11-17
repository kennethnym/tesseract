enum WorkspaceStatus {
	Running = "running",
	Stopped = "stopped",
	Restarting = "restarting",
	Unknown = "unknown",
}

interface Workspace {
	name: string;
	containerId: string;
	imageTag: string;
	createdAt: string;
	status: WorkspaceStatus;
	sshPort?: number;
}

export { WorkspaceStatus };
export type { Workspace };
