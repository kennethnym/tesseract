import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import type {
	Template,
	TemplateMeta,
	TemplateImage,
	BaseTemplate,
} from "./types";
import { ApiError, fetchApi } from "@/api";
import { promiseOrThrow } from "@/lib/errors";

function useTemplates() {
	return useSWR(
		"/templates",
		async (): Promise<TemplateMeta[]> =>
			fetchApi("/templates").then((res) => res.json()),
	);
}

function useTemplate(name: string) {
	return useSWR<Template, ApiError>(
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
	const [error, setError] = useState<ApiError | null>(null);
	const { mutate } = useSWRConfig();

	const createTemplate = useCallback(
		async ({
			name,
			description,
			baseTemplate,
		}: {
			name: string;
			description: string;
			baseTemplate: string;
		}): Promise<Template | null> => {
			try {
				const res = await fetchApi(`/templates/${name}`, {
					method: "PUT",
					body: JSON.stringify({ description, baseTemplate }),
					headers: {
						"Content-Type": "application/json",
					},
				});

				const template = await promiseOrThrow<Template, ApiError>(
					res.json(),
					() => ({ type: "INTERNAL" }),
				);
				mutate(["/templates", name], template, {
					populateCache: (newTemplate) => newTemplate,
					revalidate: false,
				});

				return template;
			} catch (err: unknown) {
				setError(err as ApiError);
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
	return useSWR<string, ApiError>(
		filePath ? ["/templates", templateName, filePath] : null,
		() =>
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
	buildArgs,
	onBuildOutput,
}: {
	imageTag: string;
	templateName: string;
	buildArgs: Record<string, string>;
	onBuildOutput: (chunk: string) => void;
}) {
	const res = await fetchApi(`/templates/${templateName}`, {
		method: "POST",
		body: JSON.stringify({ imageTag, buildArgs }),
		headers: {
			Accept: "text/event-stream",
		},
	});
	if (res.status !== 200) {
		const errBody = await res.json();
		throw errBody;
	}
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

function useBaseTemplates() {
	return useSWR(
		"/base-templates",
		(): Promise<BaseTemplate[]> =>
			fetchApi("/base-templates").then((res) => res.json()),
		{ refreshInterval: Number.POSITIVE_INFINITY },
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
	useBaseTemplates,
};
