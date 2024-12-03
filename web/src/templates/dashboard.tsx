import { MainSidebar } from "@/components/main-sidebar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header.tsx";
import { Page } from "@/components/ui/page.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@radix-ui/react-toast";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";
import React from "react";
import { useDeleteTemplate, useTemplates } from "./api";
import { NewTemplateDialog } from "./new-template-dialog";

function TemplatesDashboard() {
	return (
		<SidebarProvider>
			<aside>
				<MainSidebar />
			</aside>
			<Page>
				<PageHeader>Templates</PageHeader>
				<Main />
				<Toaster />
			</Page>
		</SidebarProvider>
	);
}

function Main() {
	return (
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
	);
}

const TemplateTable = React.memo(_TemplateTable, () => true);
function _TemplateTable() {
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

export { TemplatesDashboard };
