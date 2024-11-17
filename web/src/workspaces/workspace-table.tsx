import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { StopIcon } from "@radix-ui/react-icons";
import { ToastAction } from "@radix-ui/react-toast";
import dayjs from "dayjs";
import { Info, Loader2, Play, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
	useChangeWorkspaceStatus,
	useDeleteWorkspace,
	useWorkspaces,
} from "./api";
import { type Workspace, WorkspaceStatus } from "./types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

function WorkspaceTable() {
	const { data: workspaces, isLoading } = useWorkspaces();

	function placeholder() {
		if (isLoading) {
			return (
				<div className="w-full py-2 space-y-2">
					<Skeleton className="w-full h-10" />
					<Skeleton className="w-full h-10" />
					<Skeleton className="w-full h-10" />
					<Skeleton className="w-full h-10" />
					<Skeleton className="w-full h-10" />
				</div>
			);
		}
		if (workspaces?.length === 0) {
			return (
				<p className="text-center py-2 opacity-80">No workspaces found.</p>
			);
		}
		return null;
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Image</TableHead>
						<TableHead className="w-min">Status</TableHead>
						<TableHead>Created at</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				{workspaces ? (
					<TableBody>
						{workspaces.map((workspace) => (
							<WorkspaceTableRow
								key={workspace.containerId}
								workspace={workspace}
							/>
						))}
					</TableBody>
				) : null}
			</Table>
			{placeholder()}
		</>
	);
}

function WorkspaceTableRow({ workspace }: { workspace: Workspace }) {
	function statusLabel() {
		switch (workspace.status) {
			case WorkspaceStatus.Running:
				return "Running";
			case WorkspaceStatus.Stopped:
				return "Stopped";
			case WorkspaceStatus.Restarting:
				return "Restarting";
			case WorkspaceStatus.Unknown:
				return "Unknown";
		}
	}

	return (
		<TableRow>
			<TableCell>{workspace.name}</TableCell>
			<TableCell>{workspace.imageTag}</TableCell>
			<TableCell>
				<Badge>{statusLabel()}</Badge>
			</TableCell>
			<TableCell>
				{dayjs(workspace.createdAt).format("YYYY/MM/DD HH:mm")}
			</TableCell>
			<TableCell className="flex justify-end space-x-1">
				<WorkspaceInfoButton workspace={workspace} />
				<WorkspaceStatusButton workspace={workspace} />
				<DeleteWorkspaceButton workspace={workspace} />
			</TableCell>
		</TableRow>
	);
}

function WorkspaceStatusButton({ workspace }: { workspace: Workspace }) {
	const { toast } = useToast();
	const { startWorkspace, stopWorkspace, status } = useChangeWorkspaceStatus();

	useEffect(() => {
		switch (status.type) {
			case "error":
				toast({
					variant: "destructive",
					title: "Failed to change workspace status.",
					action: (
						<ToastAction onClick={startOrStopWorkspace} altText="Try again">
							Try again
						</ToastAction>
					),
				});
				break;
		}
	}, [toast, status.type]);

	async function startOrStopWorkspace() {
		switch (workspace.status) {
			case WorkspaceStatus.Running:
				await stopWorkspace(workspace.name);
				break;
			case WorkspaceStatus.Stopped:
				await startWorkspace(workspace.name);
				break;
			default:
				break;
		}
	}

	function statusIcon() {
		if (status.type === "loading") {
			return <Loader2 className="animate-spin" />;
		}
		switch (workspace.status) {
			case WorkspaceStatus.Running:
				return <StopIcon />;
			case WorkspaceStatus.Stopped:
				return <Play />;
			case WorkspaceStatus.Restarting:
			case WorkspaceStatus.Unknown:
				return null;
		}
	}

	switch (workspace.status) {
		case WorkspaceStatus.Running:
		case WorkspaceStatus.Stopped:
			return (
				<Button
					variant="outline"
					size="icon"
					disabled={status.type === "loading"}
					onClick={startOrStopWorkspace}
				>
					{statusIcon()}
				</Button>
			);

		default:
			return null;
	}
}

function DeleteWorkspaceButton({ workspace }: { workspace: Workspace }) {
	const { toast } = useToast();
	const { deleteWorkspace, status } = useDeleteWorkspace();

	useEffect(() => {
		console.log(status.type);
		if (status.type === "error") {
			toast({
				title: `Failed to delete workspace ${workspace.name}.`,
				action: (
					<ToastAction onClick={_deleteWorkspace} altText="Try again">
						Try again
					</ToastAction>
				),
			});
		}
	}, [toast, status.type, workspace.name]);

	async function _deleteWorkspace() {
		await deleteWorkspace(workspace.name);
	}

	return (
		<Button variant="outline" size="icon" onClick={_deleteWorkspace}>
			{status.type === "loading" ? (
				<LoadingSpinner />
			) : (
				<Trash2 className="text-destructive" />
			)}
		</Button>
	);
}

function WorkspaceInfoButton({ workspace }: { workspace: Workspace }) {
	return (
		<Popover>
			<PopoverTrigger>
				<Button variant="outline" size="icon">
					<Info />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="grid grid-cols-3">
					{workspace.sshPort ? (
						<>
							<div className="col-span-2">
								<p>SSH Port</p>
							</div>
							<p className="text-right">{workspace.sshPort}</p>
						</>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export { WorkspaceTable };
