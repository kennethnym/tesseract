import { fetchApi, type ApiError } from "@/api";
import type { QueryStatus } from "@/lib/query";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
	type Workspace,
	type WorkspacePortMapping,
	type WorkspaceRuntime,
	WorkspaceStatus,
} from "./types";

interface CreateWorkspaceConfig {
	workspaceName: string;
	imageId: string;
	runtime: string;
}

function useWorkspaces() {
	return useSWR(
		"/workspaces",
		(): Promise<Workspace[]> =>
			fetchApi("/workspaces").then((res) => res.json()),
	);
}

function useCreateWorkspace() {
	const [status, setStatus] = useState<QueryStatus<ApiError>>({ type: "idle" });
	const { mutate } = useSWRConfig();

	const createWorkspace = useCallback(
		async ({
			workspaceName,
			imageId,
			runtime,
		}: CreateWorkspaceConfig): Promise<Workspace | null> => {
			setStatus({ type: "loading" });
			try {
				const workspace = await mutate(
					"/workspaces",
					fetchApi(`/workspaces/${workspaceName}`, {
						method: "POST",
						body: JSON.stringify({ imageId, runtime }),
						headers: {
							"Content-Type": "application/json",
						},
					}).then((res): Promise<Workspace> => res.json()),
					{
						populateCache: (createdWorkspace, workspaces) => [
							...workspaces,
							createdWorkspace,
						],
						throwOnError: true,
					},
				);
				setStatus({ type: "ok" });
				return workspace ?? null;
			} catch (error: unknown) {
				setStatus({ type: "error", error });
				return null;
			}
		},
		[mutate],
	);

	return { createWorkspace, status };
}

function useChangeWorkspaceStatus() {
	const [status, setStatus] = useState<QueryStatus>({ type: "idle" });
	const { mutate } = useSWRConfig();

	const startWorkspace = useCallback(
		async (workspaceName: string) => {
			setStatus({ type: "loading" });
			try {
				await mutate(
					"/workspaces",
					fetchApi(`/workspaces/${workspaceName}`, {
						method: "POST",
						body: JSON.stringify({ status: WorkspaceStatus.Running }),
						headers: {
							"Content-Type": "application/json",
						},
					}).then((res): Promise<Workspace> => res.json()),
					{
						populateCache: (updatedWorkspace, workspaces) =>
							workspaces.map((workspace: Workspace) =>
								workspace.containerId === updatedWorkspace.containerId
									? updatedWorkspace
									: workspace,
							),
						throwOnError: true,
					},
				);
				setStatus({ type: "ok" });
			} catch (error: unknown) {
				setStatus({ type: "error", error });
			}
		},
		[mutate],
	);

	const stopWorkspace = useCallback(
		async (workspaceName: string) => {
			setStatus({ type: "loading" });
			try {
				await mutate(
					"/workspaces",
					fetchApi(`/workspaces/${workspaceName}`, {
						method: "POST",
						body: JSON.stringify({ status: WorkspaceStatus.Stopped }),
						headers: {
							"Content-Type": "application/json",
						},
					}).then((res): Promise<Workspace> => res.json()),
					{
						populateCache: (updatedWorkspace, workspaces) =>
							workspaces.map((workspace: Workspace) =>
								workspace.containerId === updatedWorkspace.containerId
									? updatedWorkspace
									: workspace,
							),
						throwOnError: true,
					},
				);
				setStatus({ type: "ok" });
			} catch (error: unknown) {
				setStatus({ type: "error", error });
			}
		},
		[mutate],
	);

	return { startWorkspace, stopWorkspace, status };
}

function useDeleteWorkspace() {
	const [status, setStatus] = useState<QueryStatus>({ type: "idle" });
	const { mutate } = useSWRConfig();

	const deleteWorkspace = useCallback(
		async (workspaceName: string) => {
			setStatus({ type: "loading" });
			try {
				await mutate(
					"/workspaces",
					fetchApi(`/workspaces/${workspaceName}`, { method: "DELETE" }),
					{
						populateCache: (_, workspaces) =>
							workspaces.filter(
								(workspace: Workspace) => workspace.name === workspaceName,
							),
						throwOnError: true,
					},
				);
				setStatus({ type: "ok" });
			} catch (error: unknown) {
				setStatus({ type: "error", error });
			}
		},
		[mutate],
	);

	return { deleteWorkspace, status };
}

function useAddWorkspacePort() {
	const [status, setStatus] = useState<QueryStatus>({ type: "idle" });
	const { mutate } = useSWRConfig();

	const addWorkspacePort = useCallback(
		async (workspaceName: string, ports: WorkspacePortMapping[]) => {
			setStatus({ type: "loading" });
			try {
				await mutate(
					"/workspaces",
					fetchApi(`/workspaces/${workspaceName}`, {
						method: "POST",
						body: JSON.stringify({ ports }),
						headers: {
							"Content-Type": "application/json",
						},
					}).then((res): Promise<Workspace> => res.json()),
					{
						populateCache: (workspace, workspaces) =>
							workspaces.map((it: Workspace) =>
								it.name === workspace.name ? workspace : it,
							),
						throwOnError: true,
					},
				);
				setStatus({ type: "ok" });
			} catch (error: unknown) {
				setStatus({ type: "error", error });
			}
		},
		[mutate],
	);

	return { addWorkspacePort, status };
}

function useWorkspaceRuntimes() {
	return useSWR(
		"/workspace-runtimes",
		(): Promise<WorkspaceRuntime[]> =>
			fetchApi("/workspace-runtimes").then((res) => res.json()),
	);
}

export {
	useWorkspaces,
	useCreateWorkspace,
	useChangeWorkspaceStatus,
	useDeleteWorkspace,
	useAddWorkspacePort,
	useWorkspaceRuntimes,
};
