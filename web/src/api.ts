import { promiseOrThrow } from "./lib/errors";

interface ApiErrorDetails {
	code: string;
	error: string;
}

const API_ERROR_BAD_TEMPLATE = "BAD_TEMPLATE";
const API_ERROR_WORKSPACE_EXISTS = "WORKSPACE_EXISTS";

type ApiError =
	| { type: "NOT_FOUND" }
	| { type: "NETWORK" }
	| { type: "CONFLICT" }
	| { type: "INTERNAL" }
	| { type: "BAD_REQUEST"; details: ApiErrorDetails };

async function fetchApi(
	url: URL | RequestInfo,
	init?: RequestInit,
): Promise<Response> {
	const res = await promiseOrThrow(
		fetch(`${import.meta.env.VITE_API_URL}/api${url}`, init),
		() => ({ type: "NETWORK" }),
	);
	if (res.status !== 200) {
		switch (res.status) {
			case 400:
				throw {
					type: "BAD_REQUEST",
					details: await res.json(),
				};
			case 404:
				throw { type: "NOT_FOUND" };
			case 409:
				throw { type: "CONFLICT" };
			default:
				throw { type: "INTERNAL" };
		}
	}
	return res;
}

function isApiErrorResponse(error: unknown): error is ApiErrorDetails {
	return (
		error !== null &&
		error !== undefined &&
		typeof error === "object" &&
		"code" in error &&
		"error" in error
	);
}

export {
	API_ERROR_BAD_TEMPLATE,
	API_ERROR_WORKSPACE_EXISTS,
	fetchApi,
	isApiErrorResponse,
};
export type { ApiError, ApiErrorDetails };
