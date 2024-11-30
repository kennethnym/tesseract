interface TemplateMeta {
	name: string;
	description: string;
	createdOn: string;
	lastModifiedOn: string;
}

interface Template extends TemplateMeta {
	files: Record<string, FileInTemplate>;
}

interface TemplateImage {
	imageTag: string;
	imageId: string;
}

interface FileInTemplate {
	path: string;
	content: string;
}

interface BaseTemplate {
	name: string;
	id: string;
}

export type {
	TemplateMeta,
	Template,
	FileInTemplate,
	TemplateImage,
	BaseTemplate,
};
