import { promiseOrThrow } from "./lib/errors";

interface ApiErrorResponse {
	code: string;
	error: string;
}

const API_ERROR_BAD_TEMPLATE = "BAD_TEMPLATE";

enum ApiError {
	NotFound = "NOT_FOUND",
	BadRequest = "BAD_REQUEST",
	Internal = "INTERNAL",
	Network = "NETWORK",
}

async function fetchApi(
	url: URL | RequestInfo,
	init?: RequestInit,
): Promise<Response> {
	const res = await promiseOrThrow(
		fetch(`${import.meta.env.VITE_API_URL}/api${url}`, init),
		() => ApiError.Network,
	);
	if (res.status !== 200) {
		switch (res.status) {
			case 400:
				throw await res.json();
			case 404:
				throw ApiError.NotFound;
			default:
				throw ApiError.Internal;
		}
	}
	return res;
}

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
	return (
		error !== null &&
		error !== undefined &&
		typeof error === "object" &&
		"code" in error &&
		"error" in error
	);
}

export { API_ERROR_BAD_TEMPLATE, ApiError, fetchApi, isApiErrorResponse };
export type { ApiErrorResponse };
