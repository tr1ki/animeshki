export const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const getErrorMessage = (payload, fallbackMessage) => {
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (payload.message) {
    return payload.message;
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    return payload.errors.map((entry) => entry.msg || entry.message).filter(Boolean).join(", ");
  }

  return fallbackMessage;
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
};

const parseSuccessBody = async (response, responseType) => {
  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "text") {
    return response.text();
  }

  return parseResponseBody(response);
};

export const apiRequest = async (
  endpoint,
  {
    method = "GET",
    authToken = null,
    body = null,
    formData = null,
    headers = {},
    responseType = "json",
  } = {},
) => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  const options = {
    method,
    mode: "cors",
    headers: requestHeaders,
  };

  if (authToken) {
    options.headers.Authorization = `Bearer ${authToken}`;
  }

  if (formData) {
    options.body = formData;
    delete options.headers["Content-Type"];
  } else if (body !== null) {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new ApiError("Network error. Check backend availability.");
  }

  if (!response.ok) {
    const payload = await parseResponseBody(response);
    const fallback = `Request failed with status ${response.status}`;
    const message = getErrorMessage(payload, fallback);
    throw new ApiError(message, response.status, payload);
  }

  return parseSuccessBody(response, responseType);
};
