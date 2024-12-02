import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DialogHeader,
	DialogFooter,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { useFieldArray, useForm } from "react-hook-form";
import { array, object, pattern, string, type Infer } from "superstruct";
import { useTemplateEditorStore } from "./template-editor-store";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

interface BuildArg {
	argName: string;
	arg: string;
}

const BuildOptionForm = object({
	imageName: pattern(string(), /^[\w-]+$/),
	buildArgs: array(
		object({
			argName: string(),
			arg: string(),
		}),
	),
});

function BuildTemplateDialog() {
	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Build options</DialogTitle>
				<DialogDescription>
					Build options for this Docker image
				</DialogDescription>
			</DialogHeader>
			<BuildTemplateForm />
		</DialogContent>
	);
}

function BuildTemplateForm() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	const startBuild = useTemplateEditorStore((state) => state.startBuild);
	const form = useForm({
		resolver: superstructResolver(BuildOptionForm),
		defaultValues: {
			imageName: templateName,
			buildArgs: [],
		},
	});

	function onSubmit(values: Infer<typeof BuildOptionForm>) {
		startBuild({
			imageTag: values.imageName,
			buildArgs: values.buildArgs.reduce<Record<string, string>>(
				(allArgs, { argName, arg }) => {
					allArgs[argName] = arg;
					return allArgs;
				},
				{},
			),
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="imageName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Image name</FormLabel>
							<FormControl>
								<Input placeholder={templateName} {...field} />
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
					name="buildArgs"
					render={BuildArgControl}
				/>

				<DialogFooter className="pt-4">
					<DialogClose asChild>
						<Button type="submit">Build template</Button>
					</DialogClose>
				</DialogFooter>
			</form>
		</Form>
	);
}

function BuildArgControl() {
	const [isAdding, setIsAdding] = useState(false);
	const {
		fields: buildArgs,
		append,
		update,
		remove,
	} = useFieldArray<Infer<typeof BuildOptionForm>>({ name: "buildArgs" });

	function addRow(arg: BuildArg) {
		append(arg);
		setIsAdding(false);
	}

	return (
		<FormItem>
			<FormLabel>Build arguments</FormLabel>
			<FormControl>
				<div className="flex flex-col items-start">
					<div className="grid grid-cols-[1fr_1fr_min-content] gap-2">
						{buildArgs.map((arg, i) => (
							<BuildArgRow
								key={arg.argName}
								initialArg={arg}
								onFinish={(arg) => update(i, arg)}
								onDelete={() => remove(i)}
							/>
						))}
						{isAdding ? (
							<BuildArgRow
								isNew
								onFinish={addRow}
								onCancel={() => setIsAdding(false)}
							/>
						) : null}
					</div>
					{isAdding ? null : (
						<Button
							type="button"
							variant="secondary"
							size="sm"
							className="mt-3"
							onClick={() => setIsAdding(true)}
						>
							<Plus /> Add
						</Button>
					)}
				</div>
			</FormControl>
		</FormItem>
	);
}

function BuildArgRow({
	initialArg = { argName: "", arg: "" },
	isNew = false,
	onFinish,
	onCancel,
	onDelete,
}: {
	initialArg?: BuildArg;
	isNew?: boolean;
	onFinish: (arg: BuildArg) => void;
	onCancel?: () => void;
	onDelete?: () => void;
}) {
	const [argName, setArgName] = useState(initialArg.argName);
	const [arg, setArg] = useState(initialArg.arg);
	const [isEditing, setIsEditing] = useState(isNew);

	const cancelEditing = useCallback(() => {
		if (isNew) {
			onCancel?.();
		} else {
			setIsEditing(false);
		}
	}, [isNew, onCancel]);

	const enableEditing = useCallback(() => {
		setIsEditing(true);
	}, []);

	const finishEditing = useCallback(() => {
		onFinish({ argName, arg });
		setIsEditing(false);
	}, [argName, arg, onFinish]);

	const onArgNameChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setArgName(event.currentTarget.value);
		},
		[],
	);

	const onArgChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setArg(event.currentTarget.value);
		},
		[],
	);

	return (
		<>
			<Input
				type="text"
				disabled={!isEditing}
				placeholder="Argument name"
				value={argName}
				onChange={onArgNameChange}
			/>
			<Input
				type="text"
				disabled={!isEditing}
				placeholder="Argument value"
				value={arg}
				onChange={onArgChange}
			/>
			<div className="flex flex-row">
				{isEditing ? (
					<Button
						type="button"
						disabled={!argName || !arg}
						variant="ghost"
						size="icon"
						onClick={finishEditing}
					>
						<Check />
					</Button>
				) : (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={enableEditing}
					>
						<Pencil />
					</Button>
				)}
				{isEditing ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={cancelEditing}
					>
						<X />
					</Button>
				) : (
					<Button type="button" variant="ghost" size="icon" onClick={onDelete}>
						<Trash2 />
					</Button>
				)}
			</div>
		</>
	);
}

export { BuildTemplateDialog };
