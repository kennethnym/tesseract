import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Hammer, Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { BuildTemplateDialog } from "./build-template-dialog";
import { useTemplateEditorStore } from "./template-editor-store";

function TemplateEditorTopBar() {
	const currentFilePath = useTemplateEditorStore(
		(state) => state.currentFilePath,
	);
	return (
		<header className="sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b bg-background p-4">
			<p className="font-bold">{currentFilePath}</p>
			<div className="flex space-x-6">
				<VimModeToggle />
				<BuildTemplateButton />
			</div>
		</header>
	);
}

function BuildTemplateButton() {
	const isBuildInProgress = useTemplateEditorStore(
		(state) => state.isBuildInProgress,
	);
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>
					{isBuildInProgress ? (
						<Loader2 className="animate-spin" />
					) : (
						<Hammer />
					)}{" "}
					Build
				</Button>
			</DialogTrigger>
			<BuildTemplateDialog />
		</Dialog>
	);
}

function VimModeToggle() {
	const id = useId();
	const isVimModeEnabled = useTemplateEditorStore(
		(state) => state.isVimModeEnabled,
	);
	const setIsVimModeEnabled = useTemplateEditorStore(
		(state) => state.setIsVimModeEnabled,
	);

	useEffect(() => {
		localStorage.setItem("vimModeEnabled", `${isVimModeEnabled}`);
	}, [isVimModeEnabled]);

	return (
		<div className="flex items-center space-x-2">
			<Switch
				id={id}
				checked={isVimModeEnabled}
				onCheckedChange={setIsVimModeEnabled}
			/>
			<Label htmlFor={id}>Vim mode</Label>
		</div>
	);
}

export { TemplateEditorTopBar };
