import axios from "axios";
import { logger } from "../../utils/logger.js";
import {
  WATCH_DIRECT_FIELDS,
  WATCH_DROPDOWN_FIELDS,
  WATCH_DROPDOWN_TRANSLATIONS_AR,
  type WatchDropdownFieldName,
} from "../constants/watch-fields.constants.js";

export interface EnrichWatchFieldsInput {
  sku: string;
  brand_name: string;
  image_url: string;
}

export type DropdownFieldOutput = {
  new_dropdown: boolean;
  value: string;
  [diffKey: string]: string | boolean;
};

export type EnrichedWatchFields = Record<string, string | DropdownFieldOutput>;

export interface EnrichWatchFieldsResult {
  fields_en: EnrichedWatchFields;
  fields_ar: EnrichedWatchFields;
  reasoning_en?: string;
  reasoning_ar?: string;
  raw?: Record<string, any>;
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function buildAllowedValuesText(): string {
  // Keep prompt deterministic and readable.
  return JSON.stringify(WATCH_DROPDOWN_FIELDS, null, 2);
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true;
  if (host.endsWith(".local")) return true;

  // Basic IPv4 checks (best-effort; we avoid DNS resolution here).
  // Reject obvious private ranges if the hostname is already an IP literal.
  const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4Match) return false;
  const a = Number(ipv4Match[1]);
  const b = Number(ipv4Match[2]);
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

function validateImageUrl(urlRaw: unknown): URL {
  const s = normalizeString(urlRaw);
  if (!s) throw new Error("Missing required field: image_url");
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error("Invalid image_url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("image_url must be http or https");
  }
  if (isPrivateOrLocalHost(u.hostname)) {
    throw new Error("image_url hostname is not allowed");
  }
  return u;
}

async function downloadImage(url: URL): Promise<{ buffer: Buffer; mimeType: string }> {
  const MAX_BYTES = 10 * 1024 * 1024; // 10MB
  const response = await axios.get<ArrayBuffer>(url.toString(), {
    responseType: "arraybuffer",
    timeout: 30000,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    headers: {
      // Some CDNs behave better with explicit accept.
      Accept: "image/*",
    },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error("image_url did not return an image");
  }

  const buffer = Buffer.from(response.data as any);
  if (buffer.length === 0) throw new Error("Downloaded image was empty");
  if (buffer.length > MAX_BYTES) throw new Error("Image exceeds 10MB limit");

  return { buffer, mimeType: contentType.split(";")[0] || "image/png" };
}

function postProcessDropdown(
  fieldName: WatchDropdownFieldName,
  aiValueRaw: unknown
): { value: string; diff: string } {
  const allowedValues = WATCH_DROPDOWN_FIELDS[fieldName] as readonly string[];
  const aiValue = normalizeString(aiValueRaw);

  if (!aiValue) return { value: "N/A", diff: "" };
  if (aiValue.toUpperCase() === "N/A") return { value: "N/A", diff: "" };

  // If no allowed values are configured yet (e.g., band_material),
  // accept the value as-is and do not use *_diff.
  if (allowedValues.length === 0) {
    return { value: aiValue, diff: "" };
  }

  if (allowedValues.includes(aiValue)) {
    return { value: aiValue, diff: "" };
  }
  return { value: "N/A", diff: aiValue };
}

function buildDropdownOutput(fieldName: WatchDropdownFieldName, value: string, diff: string): DropdownFieldOutput {
  const diffKey = `${fieldName}_diff`;
  return {
    new_dropdown: diff.trim().length > 0,
    value,
    [diffKey]: diff,
  };
}

export class WatchFieldsService {
  async enrichWatchFields(input: EnrichWatchFieldsInput): Promise<EnrichWatchFieldsResult> {
    const sku = normalizeString(input.sku);
    const brand_name = normalizeString(input.brand_name);

    if (!sku) throw new Error("Missing required field: sku");
    if (!brand_name) throw new Error("Missing required field: brand_name");
    const imageUrl = validateImageUrl(input.image_url);
    const downloaded = await downloadImage(imageUrl);

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");

    const model = process.env.GEMINI_WATCH_FIELDS_MODEL || "gemini-2.0-flash";
    const imageMimeType = downloaded.mimeType || "image/png";
    const imageBase64 = downloaded.buffer.toString("base64");

    const dropdownFieldNames = Object.keys(WATCH_DROPDOWN_FIELDS) as WatchDropdownFieldName[];
    const directFieldNames = [...WATCH_DIRECT_FIELDS];
    const allRequestedFields = [...dropdownFieldNames, ...directFieldNames];

    const systemPrompt = [
      "You are a luxury watch expert and data extraction assistant.",
      "Given SKU, brand name, and an image of the watch, extract accurate specifications.",
      "You must return ONLY valid JSON (no markdown, no extra text, no code fences).",
      "Use double quotes for all JSON keys and string values.",
      "",
      "Return EXACTLY this top-level JSON shape:",
      '{"en": {...}, "ar": {...}, "reasoning_en": "...", "reasoning_ar": "..."}',
      "",
      "Rules for en (English object):",
      "- For dropdown fields: return ONLY the canonical key from the allowed-values list EXACTLY (lowercase; may include spaces/slashes/parentheses).",
      "- NEVER translate dropdown values, NEVER Title Case them, NEVER output Arabic in en.",
      '- If unknown/not visible: output "N/A".',
      "",
      "Rules for ar (Arabic object):",
      "- For direct fields: provide Arabic text when possible.",
      '- If unknown/not visible: output "غير متوفر".',
      "- For dropdown fields: you MAY return Arabic labels, but it is OK to return غير متوفر (backend will translate from en when possible).",
      "",
      "Do not add any extra keys beyond what is requested.",
    ].join("\n");

    const userPrompt = [
      `SKU: ${sku}`,
      `Brand: ${brand_name}`,
      "",
      "Allowed values (dropdown fields):",
      buildAllowedValuesText(),
      "",
      `Direct fields: ${directFieldNames.join(", ")}`,
      "",
      "Required keys inside en:",
      [...dropdownFieldNames, ...directFieldNames].join(", "),
      "",
      "Required keys inside ar:",
      [...dropdownFieldNames, ...directFieldNames].join(", "),
      "",
      "Return ONLY JSON matching this template (fill values; keep all keys present):",
      `{`,
      `  "en": { ${[...dropdownFieldNames, ...directFieldNames].map((k) => `"${k}": "..."`).join(", ")} },`,
      `  "ar": { ${[...dropdownFieldNames, ...directFieldNames].map((k) => `"${k}": "..."`).join(", ")} },`,
      `  "reasoning_en": "...",`,
      `  "reasoning_ar": "..."`,
      `}`,
    ].join("\n");

    try {
      const prompt = [systemPrompt, "", userPrompt].join("\n");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const geminiResponse = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            // Encourage machine-readable output. If not supported by the API version,
            // Gemini will still likely comply due to the prompt rules.
            responseMimeType: "application/json",
          },
        },
        {
          params: { key: apiKey },
          timeout: 60000,
        }
      );

      const parts = geminiResponse.data?.candidates?.[0]?.content?.parts;
      const textParts = Array.isArray(parts) ? parts.map((p: any) => p?.text).filter(Boolean) : [];
      const content = textParts.join("").trim();
      if (!content) throw new Error("Empty response from Gemini");

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Fallback: extract JSON object from mixed output.
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Response did not contain JSON");
        parsed = JSON.parse(match[0]);
      }

      const fields_en: EnrichedWatchFields = {};
      const fields_ar: EnrichedWatchFields = {};

      // Initialize all expected fields, including *_diff columns for dropdowns.
      for (const field of dropdownFieldNames) {
        fields_en[field] = buildDropdownOutput(field, "N/A", "");
        fields_ar[field] = buildDropdownOutput(field, "غير متوفر", "");
      }
      for (const field of directFieldNames) {
        fields_en[field] = "N/A";
        fields_ar[field] = "غير متوفر";
      }

      const aiEn = parsed?.en || {};
      const aiAr = parsed?.ar || {};

      // Dropdown fields with diff logic (en is validated against allowed list),
      // and ar is translated deterministically for dropdowns.
      for (const field of dropdownFieldNames) {
        const { value: enValue, diff: enDiff } = postProcessDropdown(field, aiEn?.[field]);
        fields_en[field] = buildDropdownOutput(field, enValue, enDiff);

        // Arabic value: prefer deterministic translation for known dropdown values.
        let arValue: string;
        if (enValue === "N/A") {
          arValue = "غير متوفر";
        } else {
          const arDict = (WATCH_DROPDOWN_TRANSLATIONS_AR as Record<string, Record<string, string> | undefined>)[field];
          const mapped = arDict ? arDict[enValue] : undefined;
          arValue = mapped || normalizeString(aiAr?.[field]) || "غير متوفر";
        }

        let arDiff: string;
        if (!enDiff) {
          arDiff = "";
        } else {
          const arDict = (WATCH_DROPDOWN_TRANSLATIONS_AR as Record<string, Record<string, string> | undefined>)[field];
          const mappedDiff = arDict ? arDict[enDiff] : undefined;
          arDiff = mappedDiff || normalizeString(aiAr?.[`${field}_diff`]) || enDiff;
        }

        fields_ar[field] = buildDropdownOutput(field, arValue, arDiff);
      }

      // Direct fields (simple fill)
      for (const field of directFieldNames) {
        const v = normalizeString(aiEn?.[field]);
        if (!v) {
          fields_en[field] = "N/A";
          continue;
        }
        if (v.toUpperCase() === "N/A") {
          fields_en[field] = "N/A";
          continue;
        }
        fields_en[field] = v;

        const arV = normalizeString(aiAr?.[field]);
        if (arV && arV.toUpperCase() !== "N/A") {
          fields_ar[field] = arV;
        } else if (fields_en[field] === "N/A") {
          fields_ar[field] = "غير متوفر";
        }
      }

      const reasoning_en = normalizeString(parsed?.reasoning_en) || normalizeString(aiEn?.reasoning);
      const reasoning_ar = normalizeString(parsed?.reasoning_ar) || normalizeString(aiAr?.reasoning);

      return {
        fields_en,
        fields_ar,
        ...(reasoning_en ? { reasoning_en } : {}),
        ...(reasoning_ar ? { reasoning_ar } : {}),
        raw: parsed,
      };
    } catch (error: any) {
      logger.error("Watch fields enrichment error", {
        error: error?.message || String(error),
        sku,
        brand_name,
        model,
      });
      throw new Error(error?.message || "Failed to enrich watch fields");
    }
  }
}

export const watchFieldsService = new WatchFieldsService();

