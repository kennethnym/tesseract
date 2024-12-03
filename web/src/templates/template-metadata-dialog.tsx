import { Button } from "@/components/ui/button";
import {
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type Infer, object, optional, pattern, string } from "superstruct";
import { useUpdateTemplateMetadata } from "./api";
import { useTemplateEditorStore } from "./template-editor-store";

const TemplateMetadataFormSchema = object({
	name: pattern(string(), /^[\w-]+$/),
	description: optional(string()),
});

function TemplateMetadataDialog() {
	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Edit metadata</DialogTitle>
			</DialogHeader>
			<TemplateMetadataForm />
		</DialogContent>
	);
}

function TemplateMetadataForm() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	const templateDescription = useTemplateEditorStore(
		(state) => state.template.description,
	);
	const updateTemplateMetadataInStore = useTemplateEditorStore(
		(state) => state.updateTemplateMetadata,
	);
	const { updateTemplateMetadata, status } = useUpdateTemplateMetadata();
	const { toast } = useToast();
	const isUpdating = status.type === "loading";

	const form = useForm({
		resolver: superstructResolver(TemplateMetadataFormSchema),
		disabled: isUpdating,
		defaultValues: {
			name: templateName,
			description: templateDescription,
		},
	});

	useEffect(() => {
		switch (status.type) {
			case "error":
				switch (status.error.type) {
					case "CONFLICT":
						toast({
							variant: "destructive",
							title: "This name is already in use.",
							description: "Please choose another name.",
						});
						break;

					case "NETWORK":
						toast({
							variant: "destructive",
							title: "Failed to update template",
							description: "Network error",
						});
						break;

					default:
						toast({
							variant: "destructive",
							title: "Failed to update template",
							description: "Unknown error",
						});
						break;
				}
				break;

			case "ok":
				toast({
					title: "Template updated!",
				});
		}
	}, [status, toast]);

	async function onSubmit(values: Infer<typeof TemplateMetadataFormSchema>) {
		const updated = await updateTemplateMetadata({
			currentName: templateName,
			newName: values.name,
			description: values.description,
		});
		if (updated) {
			console.log(updated);
			updateTemplateMetadataInStore(updated);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Template name</FormLabel>
							<FormControl>
								<Input {...field} />
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
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormDescription>
								Must only contain alphanumeric characters and "-".
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<DialogFooter>
					<Button disabled={isUpdating} type="submit">
						{isUpdating ? <LoadingSpinner /> : null}
						Save
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}

export { TemplateMetadataDialog };
