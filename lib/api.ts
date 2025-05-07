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
      console.error("API response validation error:", parsedResponse.error);
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaListSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      console.error("Schema validation error:", parsedData.error);
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    console.error("Error fetching schema list:", error);
    throw error;
  }
}

export async function fetchSchemaDetail(uuid: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "GET",
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

    const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      console.error("Schema validation error:", parsedData.error);
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    console.error("Error fetching schema detail:", error);
    throw error;
  }
}

export async function createSchema(data: {
  name?: string;
  json: any;
  metadata?: Record<string, any>;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: "POST",
      ...apiInit,
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(responseData);

    if (!parsedResponse.success) {
      console.error("API response validation error:", parsedResponse.error);
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      console.error("Schema validation error:", parsedData.error);
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    console.error("Error creating schema:", error);
    throw error;
  }
}

export async function updateSchema(
  uuid: string,
  data: { json: any; metadata?: Record<string, any> }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "POST",
      ...apiInit,
      body: JSON.stringify({ uuid, ...data }),
    });

    const responseData = await response.json();
    const parsedResponse = ApiResponseSchema.safeParse(responseData);

    if (!parsedResponse.success) {
      console.error("API response validation error:", parsedResponse.error);
      throw new Error("Invalid API response format");
    }

    const apiResponse = parsedResponse.data;

    if (!apiResponse.success) {
      throw new Error(apiResponse.error);
    }

    const parsedData = SchemaDetailSchema.safeParse(apiResponse.value);

    if (!parsedData.success) {
      console.error("Schema validation error:", parsedData.error);
      throw new Error("Invalid data format received from server");
    }

    return parsedData.data;
  } catch (error) {
    console.error("Error updating schema:", error);
    throw error;
  }
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
    console.error("Error deleting schema:", error);
    throw error;
  }
}

export async function renameSchema(uuid: string, name: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/${uuid}`, {
      method: "POST",
      ...apiInit,
      body: JSON.stringify({ name, json: { title: name } }),
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
    console.error("Error renaming schema:", error);
    throw error;
  }
}
