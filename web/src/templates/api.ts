import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import type { Template, TemplateMeta, TemplateImage } from "./types";
import { fetchApi } from "@/api";

function useTemplates() {
	return useSWR(
		"/templates",
		async (): Promise<TemplateMeta[]> =>
			fetchApi("/templates").then((res) => res.json()),
	);
}

function useTemplate(name: string) {
	return useSWR(
		["/templates", name],
		async (): Promise<Template> =>
			fetchApi(`/templates/${name}`).then((res) => res.json()),
	);
}

function useDeleteTemplate() {
	const { mutate } = useSWRConfig();
	const deleteTemplate = useCallback(
		async (templateName: string) => {
			mutate(
				"/templates",
				fetchApi(`/templates/${templateName}`, { method: "DELETE" }),
				{
					populateCache: (_, templates) =>
						templates?.filter((it: TemplateMeta) => it.name !== templateName),
					revalidate: false,
				},
			);
		},
		[mutate],
	);
	return deleteTemplate;
}

function useCreateTemplate() {
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<unknown | null>(null);
	const { mutate } = useSWRConfig();

	const createTemplate = useCallback(
		async ({
			name,
			description,
		}: { name: string; description: string }): Promise<Template | null> => {
			try {
				const res = await fetchApi(`/templates/${name}`, {
					method: "POST",
					body: JSON.stringify({ description }),
					headers: {
						"Content-Type": "application/json",
					},
				});

				const template: Template = await res.json();
				mutate(["/templates", name], template, {
					populateCache: (newTemplate) => newTemplate,
					revalidate: false,
				});

				return template;
			} catch (err: unknown) {
				setError(err);
				return null;
			} finally {
				setIsCreating(false);
			}
		},
		[mutate],
	);

	return { createTemplate, isCreatingTemplate: isCreating, error };
}

function useTemplateFile(templateName: string, filePath: string) {
	return useSWR(filePath ? ["/templates", templateName, filePath] : null, () =>
		fetchApi(`/templates/${templateName}/${filePath}`).then((res) =>
			res.text(),
		),
	);
}

function useUpdateTemplateFile(name: string) {
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<unknown | null>(null);
	const { mutate } = useSWRConfig();

	const updateTemplateFile = useCallback(
		async (path: string, content: string) => {
			setIsUpdating(true);

			try {
				await fetchApi(`/templates/${name}/${path}`, {
					method: "POST",
					body: content,
					headers: {
						"Content-Type": "text/plain",
					},
				});
				mutate(["/templates", name, path], content);
			} catch (err: unknown) {
				console.error(err);
				setError(err);
			} finally {
				setIsUpdating(false);
			}
		},
		[name, mutate],
	);

	return { updateTemplateFile, isUpdating, error };
}

async function buildTemplate({
	imageTag,
	templateName,
	onBuildOutput,
}: {
	imageTag: string;
	templateName: string;
	onBuildOutput: (chunk: string) => void;
}) {
	const res = await fetchApi(`/templates/${templateName}`, {
		method: "POST",
		body: JSON.stringify({ imageTag }),
		headers: {
			Accept: "text/event-stream",
		},
	});
	const stream = res.body?.pipeThrough(new TextDecoderStream()).getReader();
	if (stream) {
		while (true) {
			const { value, done } = await stream.read();
			if (done) break;
			onBuildOutput(value);
		}
	}
}

function useTemplateImages() {
	return useSWR(
		"/template-images",
		(): Promise<TemplateImage[]> =>
			fetchApi("/template-images").then((res) => res.json()),
	);
}

export {
	useTemplates,
	useTemplate,
	useTemplateFile,
	useCreateTemplate,
	useUpdateTemplateFile,
	buildTemplate,
	useDeleteTemplate,
	useTemplateImages,
};
