import {
  SchemaListSchema,
  SchemaDetailSchema,
  ApiResponseSchema,
} from "./types";

const API_BASE_URL = "https://jet.cch137.link/agents/schemas";

const apiInit = {
  referrerPolicy: "origin",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
} as const;

export async function fetchSchemaList() {
  try {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "GET",
      ...apiInit,
    });

    const data = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(data);

    if (!parsedResponse.success) {
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaListSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    throw error;
  }
}

export async function fetchSchemaDetail(uuid: string, signal?: AbortSignal) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "GET",
      ...apiInit,
      signal,
    });

    const data = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(data);

    if (!parsedResponse.success || !response.ok) {
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    throw error;
  }
}

export async function createSchema(data: {
  name?: string;
  json: any;
  metadata?: Record<string, any>;
}) {
  const response = await fetch(`${API_BASE_URL}/`, {
    method: "POST",
    ...apiInit,
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  const parsedResponse = ApiResponseSchema.safeParse(responseData);

  if (!parsedResponse.success) {
    throw new Error("Invalid API response format");
  }

  const apiResponse = parsedResponse.data;

  if (!apiResponse.success) {
    throw new Error(apiResponse.error);
  }

  const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

  if (!parsedData.success) {
    throw new Error("Invalid data format received from server");
  }
  return parsedData.data;
}

export async function updateSchema(
  uuid: string,
  data: { json: any; metadata?: Record<string, any> }
) {
  const response = await fetch(`${API_BASE_URL}/${uuid}`, {
    method: "POST",
    ...apiInit,
    body: JSON.stringify({ uuid, ...data }),
  });

  const responseData = await response.json();
  const parsedResponse = ApiResponseSchema.safeParse(responseData);

  if (!parsedResponse.success) {
    throw new Error("Invalid API response format");
  }

  const apiResponse = parsedResponse.data;

  if (!apiResponse.success) {
    throw new Error(apiResponse.error);
  }

  const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

  if (!parsedData.success) {
    throw new Error("Invalid data format received from server");
  }

  return parsedData.data;
}

export async function deleteSchema(uuid: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "DELETE",
      ...apiInit,
    });

    const data = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(data);

    if (!parsedResponse.success) {
      console.error("API response validation error:", parsedResponse.error);
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

export async function renameSchema(uuid: string, name: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "POST",
      ...apiInit,
      body: JSON.stringify({ name }),
    });

    const responseData = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(responseData);

    if (!parsedResponse.success) {
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    throw error;
  }
}
