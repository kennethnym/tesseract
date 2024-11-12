import { fetchApi } from "@/api";
import useSWR, { useSWRConfig } from "swr";
import type { Workspace } from "./types";
import { useCallback, useState } from "react";
import { QueryStatus } from "@/lib/query";

function useWorkspaces() {
	return useSWR(
		"/workspaces",
		(): Promise<Workspace[]> =>
			fetchApi("/workspaces").then((res) => res.json()),
	);
}

function useCreateWorkspace() {
	const [status, setStatus] = useState<QueryStatus>({ type: "idle" });
	const { mutate } = useSWRConfig();

	const createWorkspace = useCallback(
		async ({
			workspaceName,
			imageId,
		}: { workspaceName: string; imageId: string }): Promise<Workspace> => {
			setStatus({ type: "loading" });
			try {
				const res = await fetchApi(`/workspaces/${workspaceName}`, {
					method: "POST",
					body: JSON.stringify({ imageId }),
					headers: {
						"Content-Type": "application/json",
					},
				});
				const workspace = await res.json();

				setStatus({ type: "ok" });

				return workspace;
			} catch (error: unknown) {
				setStatus({ type: "error", error });
			}
		},
		[],
	);

	return { createWorkspace, status };
}

export { useWorkspaces, useCreateWorkspace };
