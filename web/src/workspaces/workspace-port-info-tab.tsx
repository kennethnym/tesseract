import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { Check, Trash2, X } from "lucide-react";
import { useContext, useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { type Infer, number, object, pattern, size, string } from "superstruct";
import { create } from "zustand";
import { useAddWorkspacePort, useDeleteWorkspacePort } from "./api";
import { WorkspaceTableRowContext } from "./workspace-table";

interface PortInfoTabStore {
	isAddingPort: boolean;
	setIsAddingPort: (isAddingPort: boolean) => void;
}

const useStore = create<PortInfoTabStore>()((set) => ({
	isAddingPort: false,
	setIsAddingPort: (isAddingPort) => set({ isAddingPort }),
}));

function PortInfoTab() {
	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Subdomain</TableHead>
						<TableHead>Port</TableHead>
					</TableRow>
				</TableHeader>
				<PortInfoTableBody />
			</Table>
			<AddPortButton />
		</>
	);
}

function PortInfoTableBody() {
	const workspace = useContext(WorkspaceTableRowContext);
	const ports = workspace.ports ?? [];

	return (
		<TableBody>
			{ports.map(({ port, subdomain }) => (
				<TableRow key={subdomain}>
					<TableCell className="py-0">{subdomain}</TableCell>
					<TableCell className="py-0">{port}</TableCell>
					<TableCell className="p-0 text-right">
						<DeletePortMappingButton subdomain={subdomain} />
					</TableCell>
				</TableRow>
			))}
			<NewPortMappingRow />
		</TableBody>
	);
}

function AddPortButton() {
	const isAddingPort = useStore((state) => state.isAddingPort);
	const setIsAddingPort = useStore((state) => state.setIsAddingPort);

	if (isAddingPort) {
		return null;
	}

	return (
		<Button
			variant="secondary"
			size="sm"
			className="mt-4"
			onClick={() => setIsAddingPort(true)}
		>
			Add port
		</Button>
	);
}

const NewPortMappingForm = object({
	subdomain: pattern(string(), /^[\w-]+$/),
	port: size(number(), 1, 65536),
});

function NewPortMappingRow() {
	const { addWorkspacePort, status } = useAddWorkspacePort();
	const workspace = useContext(WorkspaceTableRowContext);
	const isAddingPort = useStore((state) => state.isAddingPort);
	const setIsAddingPort = useStore((state) => state.setIsAddingPort);
	const formId = useId();
	const form = useForm({
		resolver: superstructResolver(NewPortMappingForm),
		disabled: status.type === "loading",
		defaultValues: {
			subdomain: "",
			port: 3000,
		},
	});

	if (!isAddingPort) {
		return null;
	}

	async function submitForm(values: Infer<typeof NewPortMappingForm>) {
		await addWorkspacePort(workspace.name, [
			{
				subdomain: values.subdomain,
				port: values.port,
			},
		]);
		setIsAddingPort(false);
	}

	return (
		<TableRow>
			<TableCell>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(submitForm)} id={formId}>
						<FormField
							control={form.control}
							name="subdomain"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input type="text" placeholder="subdomain" {...field} />
									</FormControl>
								</FormItem>
							)}
						/>
					</form>
				</Form>
			</TableCell>
			<TableCell>
				<FormField
					control={form.control}
					name="port"
					render={({ field }) => (
						<Input
							className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							style={{ MozAppearance: "textfield" }}
							type="number"
							min={0}
							max={65535}
							placeholder="8080"
							form={formId}
							{...field}
							onChange={(value) =>
								field.onChange(value.currentTarget.valueAsNumber)
							}
						/>
					)}
				/>
			</TableCell>
			<TableCell className="px-0">
				<Button
					form={formId}
					disabled={status.type === "loading"}
					variant="ghost"
					size="icon"
					onClick={() => setIsAddingPort(false)}
				>
					<X />
				</Button>
				<Button
					form={formId}
					disabled={status.type === "loading"}
					variant="ghost"
					size="icon"
				>
					{status.type === "loading" ? <LoadingSpinner /> : <Check />}
				</Button>
			</TableCell>
		</TableRow>
	);
}

function DeletePortMappingButton({ subdomain }: { subdomain: string }) {
	const { deleteWorkspacePort, status } = useDeleteWorkspacePort();
	const { toast } = useToast();
	const workspace = useContext(WorkspaceTableRowContext);
	const isDeleting = status.type === "loading";

	useEffect(() => {
		if (status.type === "error") {
			toast({
				variant: "destructive",
				title: "Failed to delete port.",
				description: "Unexpected error.",
			});
		}
	}, [status.type, toast]);

	async function _deleteWorkspacePort() {
		await deleteWorkspacePort(workspace.name, subdomain);
	}

	return (
		<Button
			disabled={isDeleting}
			variant="ghost"
			size="icon"
			onClick={_deleteWorkspacePort}
		>
			{isDeleting ? <LoadingSpinner /> : <Trash2 />}
		</Button>
	);
}

export { PortInfoTab };
