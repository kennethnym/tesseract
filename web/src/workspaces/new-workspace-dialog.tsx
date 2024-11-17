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
import { useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { nonempty, object, pattern, string, type Infer } from "superstruct";
import { useCreateWorkspace } from "./api";

const NewWorkspaceForm = object({
	workspaceName: pattern(string(), /^[\w-]+$/),
	imageId: nonempty(string()),
});

function NewWorkspaceDialog({
	onCreateSuccess,
}: { onCreateSuccess: () => void }) {
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

	const _onCreateSuccess = useCallback(onCreateSuccess, []);

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
				_onCreateSuccess();
				break;
			default:
				break;
		}
	}, [status.type, toast, _onCreateSuccess]);

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
					<LoadingSpinner />
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

export { NewWorkspaceDialog };
