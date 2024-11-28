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
import { Info, Loader2, Play, Plus, Trash2 } from "lucide-react";
import {
	Fragment,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	useAddWorkspacePort,
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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { number, object, pattern, size, string, type Infer } from "superstruct";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { WorkspaceInfoDialog } from "./workspace-info-dialog";

const WorkspaceTableRowContext = createContext<Workspace>(
	null as unknown as Workspace,
);

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
							<WorkspaceTableRowContext.Provider
								key={workspace.containerId}
								value={workspace}
							>
								<WorkspaceTableRow key={workspace.containerId} />
							</WorkspaceTableRowContext.Provider>
						))}
					</TableBody>
				) : null}
			</Table>
			{placeholder()}
		</>
	);
}

function WorkspaceTableRow() {
	const workspace = useContext(WorkspaceTableRowContext);

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
				<WorkspaceInfoButton />
				<WorkspaceStatusButton />
				<DeleteWorkspaceButton workspace={workspace} />
			</TableCell>
		</TableRow>
	);
}

function WorkspaceStatusButton() {
	const workspace = useContext(WorkspaceTableRowContext);
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
		<Button variant="destructive" size="icon" onClick={_deleteWorkspace}>
			{status.type === "loading" ? <LoadingSpinner /> : <Trash2 />}
		</Button>
	);
}

function WorkspaceInfoButton() {
	return (
		<Dialog>
			<DialogTrigger>
				<Button variant="outline" size="icon">
					<Info />
				</Button>
			</DialogTrigger>
			<WorkspaceInfoDialog />
		</Dialog>
	);
}

function WorkspaceInfoPopoverContent() {
	const workspace = useContext(WorkspaceTableRowContext);
	return (
		<div className="flex flex-col">
			<div className="grid grid-cols-3 gap-2">
				{workspace.sshPort ? (
					<>
						<div className="col-span-2">
							<p>SSH Port</p>
						</div>
						<p className="text-right">{workspace.sshPort}</p>
					</>
				) : null}
			</div>
			<hr className="my-2" />
			<p className="text-sm text-muted-foreground col-span-3 mb-1">
				Forwarded ports
			</p>
			<div className="grid grid-cols-3 gap-2">
				{workspace?.ports?.map(({ port, subdomain }) => (
					<Fragment key={port}>
						<div className="col-span-2 flex items-center">
							<p>{subdomain}</p>
						</div>
						<div className="flex items-center space-x-2">
							<p className="text-right">{port}</p>
							<Button variant="destructive" size="icon">
								<Trash2 />
							</Button>
						</div>
					</Fragment>
				))}
			</div>
			<PortEntry />
		</div>
	);
}

const PortEntryForm = object({
	portName: pattern(string(), /^[\w-]+$/),
	port: size(number(), 0, 65536),
});

function PortEntry() {
	const [isAddingPort, setIsAddingPort] = useState(false);
	const { addWorkspacePort, status } = useAddWorkspacePort();
	const workspace = useContext(WorkspaceTableRowContext);
	const form = useForm({
		resolver: superstructResolver(PortEntryForm),
		disabled: status.type === "loading",
		defaultValues: {
			port: 1234,
			portName: "",
		},
	});

	function onAddPortButtonClick() {
		if (isAddingPort) {
		} else {
			setIsAddingPort(true);
		}
	}

	async function onSubmit(values: Infer<typeof PortEntryForm>) {
		await addWorkspacePort(workspace.name, [
			{ subdomain: values.portName, port: values.port },
		]);
	}

	if (!isAddingPort) {
		return (
			<Button
				className="col-span-3 mt-4"
				variant="secondary"
				size="sm"
				onClick={onAddPortButtonClick}
			>
				<Plus /> Add port
			</Button>
		);
	}

	return (
		<Form {...form}>
			<form
				className="grid grid-cols-subgrid col-span-3 gap-2"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				{isAddingPort ? (
					<>
						<FormField
							control={form.control}
							name="portName"
							render={({ field }) => (
								<FormItem className="col-span-2">
									<FormControl>
										<Input placeholder="Subdomain" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="port"
							render={({ field }) => (
								<FormItem className="col-span-1">
									<FormControl>
										<Input
											className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
											// @ts-ignore
											style={{ "-moz-appearance": "textfield" }}
											type="number"
											min={0}
											max={65535}
											placeholder="8080"
											{...field}
											onChange={(value) =>
												field.onChange(value.currentTarget.valueAsNumber)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				) : null}
				<Button
					type="submit"
					className="col-span-3 mt-2"
					variant="secondary"
					size="sm"
					disabled={status.type === "loading"}
					onClick={onAddPortButtonClick}
				>
					{status.type === "loading" ? (
						<LoadingSpinner />
					) : (
						<>
							<Plus /> Done
						</>
					)}
				</Button>
			</form>
		</Form>
	);
}

export { WorkspaceTable, WorkspaceTableRowContext };
