import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import {
	DialogContent,
	DialogDescription,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type Infer, nonempty, object, pattern, string } from "superstruct";
import { useBaseTemplates, useCreateTemplate } from "./api";
import type { BaseTemplate } from "./types";

const NewTemplateForm = object({
	baseTemplate: nonempty(string()),
	templateName: pattern(string(), /^[\w-]+$/),
	templateDescription: string(),
});

function NewTemplateDialog() {
	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>New template</DialogTitle>
				<DialogDescription>
					Create a new template for workspaces
				</DialogDescription>
			</DialogHeader>
			<TemplateFormContainer />
		</DialogContent>
	);
}

function TemplateFormContainer() {
	const { data: baseTemplates, isLoading, error } = useBaseTemplates();

	if (isLoading) {
		return (
			<div className="w-full flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (error || !baseTemplates) {
		return (
			<p className="opacity-80">
				An error occurred when fetching available options.
			</p>
		);
	}

	return <TemplateForm baseTemplates={baseTemplates} />;
}

function TemplateForm({ baseTemplates }: { baseTemplates: BaseTemplate[] }) {
	const router = useRouter();
	const { createTemplate, isCreatingTemplate, error } = useCreateTemplate();
	const { toast } = useToast();
	const form = useForm({
		resolver: superstructResolver(NewTemplateForm),
		disabled: isCreatingTemplate,
		defaultValues: {
			baseTemplate: "empty",
			templateName: "",
			templateDescription: "",
		},
	});

	useEffect(() => {
		if (!error) return;

		switch (error.type) {
			case "CONFLICT":
				toast({
					variant: "destructive",
					title: "Template already exists",
					description: "Please use another name for the template",
				});
				break;

			case "NETWORK":
				toast({
					variant: "destructive",
					title: "Failed to create the template",
					description: "Network error",
				});
				break;

			default:
				toast({
					variant: "destructive",
					title: "Failed to create the template",
					description: "Unknown error",
				});
				break;
		}
	}, [error, toast]);

	async function onSubmit(values: Infer<typeof NewTemplateForm>) {
		const createdTemplate = await createTemplate({
			name: values.templateName,
			description: values.templateDescription,
			baseTemplate: values.baseTemplate,
		});
		if (createdTemplate) {
			router.navigate({ to: `/templates/${createdTemplate.name}` });
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="baseTemplate"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Base template</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a base template" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="empty">Empty</SelectItem>
									{baseTemplates.map((template) => (
										<SelectItem key={template.id} value={template.id}>
											{template.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="templateName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Template name</FormLabel>
							<FormControl>
								<Input placeholder="my-template" {...field} />
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
					name="templateDescription"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormDescription>
								Optional description for this template
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<DialogFooter>
					<Button disabled={isCreatingTemplate} type="submit">
						{isCreatingTemplate ? <Loader2 className="animate-spin" /> : null}
						Create
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}

export { NewTemplateDialog };
