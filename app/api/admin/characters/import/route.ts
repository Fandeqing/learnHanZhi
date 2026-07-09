import { handleRouteError, ok } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { importCharactersFromJson } from "@/modules/admin/character-import.service";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let json: unknown;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return Response.json(
          {
            success: false,
            error: {
              code: "FILE_REQUIRED",
              message: "Upload a JSON file with the form field name 'file'.",
            },
          },
          { status: 400 },
        );
      }

      json = parseJson(await file.text());
    } else {
      json = parseJson(await request.text());
    }

    return ok(await importCharactersFromJson(json), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The uploaded content is not valid JSON.");
  }
}
