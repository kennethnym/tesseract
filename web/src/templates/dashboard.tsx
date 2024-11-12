import { PageHeader } from "@/components/ui/page-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Info, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Page } from "@/components/ui/page.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { MainSidebar } from "@/components/main-sidebar.tsx";
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@/components/ui/table";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@tanstack/react-router";
import { object, pattern, string, type Infer } from "superstruct";
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
import { useCreateTemplate, useDeleteTemplate, useTemplates } from "./api";
import { Skeleton } from "@/components/ui/skeleton";
import dayjs from "dayjs";
import { ToastAction } from "@radix-ui/react-toast";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const NewTemplateForm = object({
	templateName: pattern(string(), /^[\w-]+$/),
	templateDescription: string(),
});

function TemplatesDashboard() {
	return (
		<SidebarProvider>
			<aside>
				<MainSidebar />
			</aside>
			<Page>
				<PageHeader>Templates</PageHeader>
				<Dialog>
					<main>
						<DialogTrigger asChild>
							<div className="flex flex-row py-4">
								<Button variant="secondary" size="sm">
									<Plus /> New template
								</Button>
							</div>
						</DialogTrigger>
						<TemplateTable />
					</main>
					<NewTemplateDialog />
				</Dialog>
				<Toaster />
			</Page>
		</SidebarProvider>
	);
}

function TemplateTable() {
	const { data: templates, isLoading } = useTemplates();
	const deleteTemplate = useDeleteTemplate();
	const { toast } = useToast();

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
		if (templates?.length === 0) {
			return <p className="text-center py-2 opacity-80">No templates found.</p>;
		}
		return null;
	}

	async function _deleteTemplate(templateName: string) {
		try {
			await deleteTemplate(templateName);
			toast({
				title: "Template deleted!",
			});
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Failed to delete template.",
				action: (
					<ToastAction
						altText="Try again"
						onClick={() => _deleteTemplate(templateName)}
					>
						Try again
					</ToastAction>
				),
			});
		}
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Created at</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>

				{templates ? (
					<TableBody>
						{templates.map((template) => (
							<TableRow key={template.name}>
								<TableCell>{template.name}</TableCell>
								<TableCell>
									{template.description || "No description"}
								</TableCell>
								<TableCell>
									{dayjs(template.createdOn).format("YYYY/MM/DD")}
								</TableCell>
								<TableCell className="flex justify-end space-x-1">
									<Button variant="outline" size="icon" asChild>
										<Link to={`/templates/${template.name}`} preload="intent">
											<div>
												<Pencil />
												<span className="sr-only">Edit template</span>
											</div>
										</Link>
									</Button>
									<Button variant="outline" size="icon">
										<Info />
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => _deleteTemplate(template.name)}
									>
										<Trash2 className="text-destructive" />
									</Button>
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

function NewTemplateDialog() {
	const router = useRouter();
	const { createTemplate, isCreatingTemplate } = useCreateTemplate();

	const form = useForm({
		resolver: superstructResolver(NewTemplateForm),
		disabled: isCreatingTemplate,
		defaultValues: {
			templateName: "",
			templateDescription: "",
		},
	});

	async function onSubmit(values: Infer<typeof NewTemplateForm>) {
		const createdTemplate = await createTemplate({
			name: values.templateName,
			description: values.templateDescription,
		});
		if (createdTemplate) {
			router.navigate({ to: `/templates/${createdTemplate.name}` });
		}
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>New template</DialogTitle>
				<DialogDescription>
					Create a new template for workspaces
				</DialogDescription>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
		</DialogContent>
	);
}

export { TemplatesDashboard };
