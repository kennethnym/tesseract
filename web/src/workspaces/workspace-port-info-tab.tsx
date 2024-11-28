import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormControl, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
	Table,
} from "@/components/ui/table";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { Check, Trash2, X } from "lucide-react";
import { useContext, useId } from "react";
import { useForm } from "react-hook-form";
import { object, pattern, string, size, number, type Infer } from "superstruct";
import { WorkspaceTableRowContext } from "./workspace-table";
import { create } from "zustand";
import { useAddWorkspacePort } from "./api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
						<DeletePortMappingButton />
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

function DeletePortMappingButton() {
	return (
		<Button variant="ghost" size="icon">
			<Trash2 />
		</Button>
	);
}

export { PortInfoTab };
