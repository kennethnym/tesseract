import { Badge } from "@/components/ui/badge.tsx";
import { PageHeader } from "@/components/ui/page-header.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table.tsx";
import dayjs from "dayjs";
import { Page } from "@/components/ui/page.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { MainSidebar } from "@/components/main-sidebar.tsx";
import { useCreateWorkspace, useWorkspaces } from "./api";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { nonempty, object, pattern, string, type Infer } from "superstruct";
import { useTemplateImages } from "@/templates/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@radix-ui/react-toast";
import { Toaster } from "@/components/ui/toaster";

const NewWorkspaceForm = object({
	workspaceName: pattern(string(), /^[\w-]+$/),
	imageId: nonempty(string()),
});

function WorkspaceDashboard() {
	return (
		<SidebarProvider>
			<aside>
				<MainSidebar />
			</aside>
			<Page>
				<header>
					<PageHeader>Workspaces</PageHeader>
				</header>
				<Dialog>
					<main>
						<DialogTrigger asChild>
							<div className="flex flex-row py-4">
								<Button variant="secondary" size="sm">
									<Plus /> New workspace
								</Button>
							</div>
						</DialogTrigger>
						<WorkspaceTable />
					</main>

					<NewWorkspaceDialog />
				</Dialog>
				<Toaster />
			</Page>
		</SidebarProvider>
	);
}

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
						<TableHead className="text-right">Created at</TableHead>
					</TableRow>
				</TableHeader>
				{workspaces ? (
					<TableBody>
						{workspaces.map((workspace) => (
							<TableRow key={workspace.containerId}>
								<TableCell>{workspace.name}</TableCell>
								<TableCell>{workspace.imageTag}</TableCell>
								<TableCell>
									<Badge>Running</Badge>
								</TableCell>
								<TableCell className="text-right">
									{dayjs(workspace.createdAt).format("YYYY/MM/DD HH:mm")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				) : null}
			</Table>
			{placeholder()}
		</>
	);
}

function NewWorkspaceDialog() {
	const { data: templateImages, isLoading, error } = useTemplateImages();
	const form = useForm({
		resolver: superstructResolver(NewWorkspaceForm),
		defaultValues: {
			workspaceName: "",
			imageId: "",
		},
	});
	const { createWorkspace, status } = useCreateWorkspace();
	const { toast } = useToast();
	const formRef = useRef<HTMLFormElement | null>(null);

	useEffect(() => {
		if (status.type === "error") {
			toast({
				variant: "destructive",
				title: "Failed to create the workspace.",
				action: (
					<ToastAction
						onClick={() => {
							formRef.current?.requestSubmit();
						}}
						altText="Try again"
					>
						Try again
					</ToastAction>
				),
			});
		}
	}, [status.type, toast]);

	async function onSubmit(values: Infer<typeof NewWorkspaceForm>) {
		await createWorkspace({
			workspaceName: values.workspaceName,
			imageId: values.imageId,
		});
	}

	function content() {
		if (error) {
			console.log(error);
			return (
				<p className="opacity-80">
					An error occurred when fetching available options.
				</p>
			);
		}
		if (isLoading) {
			return (
				<div className="w-full flex items-center justify-center">
					<Loader2 className="animate-spin" />
				</div>
			);
		}
		if (!templateImages) {
			return null;
		}
		if (templateImages.length === 0) {
			return (
				<>
					<p className="opacity-80">
						No images found. Create and build a template, and the resulting
						image will show up here.
					</p>
					<Alert>
						<AlertTitle>What are images?</AlertTitle>
						<AlertDescription>
							An image is used to bootstrap a workspace, including the operating
							system, the environment, and packages, as specified by a template.
						</AlertDescription>
					</Alert>
				</>
			);
		}

		return (
			<Form {...form}>
				<form
					ref={formRef}
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<FormField
						control={form.control}
						name="workspaceName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Workspace name</FormLabel>
								<FormControl>
									<Input placeholder="my-workspace" {...field} />
								</FormControl>
								<FormDescription>
									Must only contain alphanumeric characters and "-".
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="imageId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Image for this workspace</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select an image" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{templateImages.map((image) => (
											<SelectItem key={image.imageId} value={image.imageId}>
												{image.imageTag}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit">Create</Button>
					</DialogFooter>
				</form>
			</Form>
		);
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>New workspace</DialogTitle>
			</DialogHeader>
			{content()}
		</DialogContent>
	);
}

export { WorkspaceDashboard };
