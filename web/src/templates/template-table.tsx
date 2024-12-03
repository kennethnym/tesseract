import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@radix-ui/react-toast";
import dayjs from "dayjs";
import { Pencil, Trash2 } from "lucide-react";
import React, { useEffect } from "react";
import { useTemplates, useDeleteTemplate } from "./api";
import { Link } from "@tanstack/react-router";
import type { TemplateMeta } from "./types";

const TemplateTable = React.memo(_TemplateTable, () => true);

function _TemplateTable() {
	const { data: templates, isLoading } = useTemplates();

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
							<TemplateTableRow key={template.name} template={template} />
						))}
					</TableBody>
				) : null}
			</Table>
			{placeholder()}
		</>
	);
}

function TemplateTableRow({ template }: { template: TemplateMeta }) {
	return (
		<TableRow>
			<TableCell>{template.name}</TableCell>
			<TableCell>{template.description || "No description"}</TableCell>
			<TableCell>{dayjs(template.createdOn).format("YYYY/MM/DD")}</TableCell>
			<TableCell className="flex justify-end space-x-1">
				<Button variant="outline" size="icon" asChild>
					<Link to={`/templates/${template.name}`} preload="intent">
						<div>
							<Pencil />
							<span className="sr-only">Edit template</span>
						</div>
					</Link>
				</Button>
				<DeleteTemplateButton template={template} />
			</TableCell>
		</TableRow>
	);
}

function DeleteTemplateButton({ template }: { template: TemplateMeta }) {
	const { deleteTemplate, status } = useDeleteTemplate();
	const { toast } = useToast();

	useEffect(() => {
		if (status.type === "error") {
			let toastDescription: string;
			switch (status.error.type) {
				case "NETWORK":
					toastDescription = "Network error";
					break;
				default:
					toastDescription = "Unexpected error";
					break;
			}
			toast({
				variant: "destructive",
				title: "Failed to delete template",
				description: toastDescription,
			});
		}
	}, [status, toast]);

	async function _deleteTemplate() {
		await deleteTemplate(template.name);
		toast({ title: "Template deleted!" });
	}

	return (
		<Button variant="outline" size="icon" onClick={_deleteTemplate}>
			<Trash2 className="text-destructive" />
		</Button>
	);
}

export { TemplateTable };
