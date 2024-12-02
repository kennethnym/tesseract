import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useTemplateImages } from "@/templates/api";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { nonempty, object, pattern, string, type Infer } from "superstruct";
import { useCreateWorkspace, useWorkspaceRuntimes } from "./api";
import type { TemplateImage } from "@/templates/types";
import type { WorkspaceRuntime } from "./types";

interface NewWorkspaceDialogProps {
	onCreateSuccess: () => void;
}

const NewWorkspaceFormSchema = object({
	workspaceName: pattern(string(), /^[\w-]+$/),
	imageId: nonempty(string()),
	runtime: nonempty(string()),
});

function NewWorkspaceDialog({ onCreateSuccess }: NewWorkspaceDialogProps) {
	const {
		data: templateImages,
		isLoading: isLoadingImages,
		error,
	} = useTemplateImages();
	const { data: runtimes, isLoading: isLoadingRuntimes } =
		useWorkspaceRuntimes();
	const isLoading = isLoadingImages || isLoadingRuntimes;

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
					<LoadingSpinner />
				</div>
			);
		}
		if (!templateImages || !runtimes) {
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
			<NewWorkspaceForm
				templateImages={templateImages}
				runtimes={runtimes}
				onCreateSuccess={onCreateSuccess}
			/>
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

function NewWorkspaceForm({
	templateImages,
	runtimes,
	onCreateSuccess,
}: {
	templateImages: TemplateImage[];
	runtimes: WorkspaceRuntime[];
	onCreateSuccess: () => void;
}) {
	const form = useForm({
		resolver: superstructResolver(NewWorkspaceFormSchema),
		defaultValues: {
			workspaceName: "",
			imageId: "",
			runtime: "",
		},
	});
	const { createWorkspace, status } = useCreateWorkspace();
	const { toast } = useToast();
	const formRef = useRef<HTMLFormElement | null>(null);

	useEffect(() => {
		switch (status.type) {
			case "error":
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
				break;
			case "ok":
				onCreateSuccess();
				break;
			default:
				break;
		}
	}, [status.type, toast, onCreateSuccess]);

	async function onSubmit(values: Infer<typeof NewWorkspaceFormSchema>) {
		await createWorkspace({
			workspaceName: values.workspaceName,
			imageId: values.imageId,
			runtime: values.runtime,
		});
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
							<Select onValueChange={field.onChange} value={field.value}>
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

				<FormField
					control={form.control}
					name="runtime"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Docker runtime</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a Docker runtime" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{runtimes.map((runtime) => (
										<SelectItem key={runtime.name} value={runtime.name}>
											{runtime.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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

export { NewWorkspaceDialog };
