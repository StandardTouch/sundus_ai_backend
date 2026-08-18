import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { logger } from "../../utils/logger.js";
import {
  DEFAULT_WATCH_FIELDS,
  SKU_DROPDOWN_OPTIONS,
  SKU_DROPDOWN_ARABIC_TRANSLATIONS,
} from "../constants/sku-management.constants.js";

export interface SkuImage {
  id: string;
  url: string;
  isPrimary: boolean;
  label: string;
  status?: "pending" | "accepted" | "rejected";
}

export interface SkuLookupFlatResponse {
  sku: string;
  brand_name: string;
  model_number: string;
  model_number_ar: string;
  description: string;
  description_ar: string;
  short_description: string;
  short_description_ar: string;
  case_diameter: string;
  case_diameter_ar: string;
  case_thickness: string;
  case_thickness_ar: string;
  gender: string;
  gender_ar: string;
  watch_type: string;
  watch_type_ar: string;
  case_material: string;
  case_material_ar: string;
  band_material: string;
  band_material_ar: string;
  movement_type: string;
  movement_type_ar: string;
  display_type: string;
  display_type_ar: string;
  water_resistance: string;
  water_resistance_ar: string;
  dial_color: string;
  dial_color_ar: string;
  images: SkuImage[];
}

/**
 * Helper to fetch organic result URLs from SerpAPI for a given SKU & Brand
 */
async function getOrganicResultUrls(sku: string, brand: string): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    logger.warn("SERPAPI_KEY is not defined in environment variables");
    return [];
  }

  // Primary: single SKU number. Secondary: brand + sku + watch fallback
  const primaryQuery = sku ? sku.trim() : brand.trim();
  const secondaryQuery = [brand, sku, "watch"].filter(Boolean).join(" ");

  for (const query of Array.from(new Set([primaryQuery, secondaryQuery]))) {
    if (!query) continue;
    try {
      const res = await axios.get("https://serpapi.com/search.json", {
        params: {
          q: query,
          engine: "google",
          api_key: apiKey,
        },
        timeout: 15000,
      });

      const organicResults = res.data?.organic_results || [];
      const links: string[] = organicResults
        .map((result: any) => result.link)
        .filter((link: any): link is string => typeof link === "string" && link.startsWith("http"));

      if (links.length > 0) {
        logger.info(`SerpAPI found ${links.length} organic result URLs for query: "${query}"`);
        return links;
      }
    } catch (err: any) {
      logger.warn(`SerpAPI organic search failed for query: "${query}"`, { error: err?.message || err });
    }
  }
  return [];
}

/**
 * Helper to query SerpAPI Google Images as a fallback
 */
async function searchSerpApiImages(sku: string, brand: string): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const primaryQuery = sku ? sku.trim() : brand.trim();
  const secondaryQuery = [brand, sku, "watch"].filter(Boolean).join(" ");

  for (const query of Array.from(new Set([primaryQuery, secondaryQuery]))) {
    if (!query) continue;
    try {
      const res = await axios.get("https://serpapi.com/search.json", {
        params: {
          q: query,
          engine: "google_images",
          api_key: apiKey,
        },
        timeout: 15000,
      });

      const imagesResults = res.data?.images_results || [];
      const urls: string[] = imagesResults
        .map((img: any) => img.original || img.thumbnail)
        .filter((url: any): url is string => typeof url === "string" && url.startsWith("http"));

      if (urls.length > 0) {
        logger.info(`SerpAPI Google Images found ${urls.length} images for query: "${query}"`);
        return urls;
      }
    } catch (err: any) {
      logger.warn(`SerpAPI Google Images failed for query: "${query}"`, { error: err?.message || err });
    }
  }
  return [];
}

const NOISE_KEYWORDS = [
  "logo",
  "icon",
  "avatar",
  "google-play",
  "apple-play",
  "app-store",
  "play-store",
  "curreny",
  "currency",
  "symbol",
  "badge",
  "payment",
  "footer",
  "banner",
  "header",
  "social",
  "facebook",
  "instagram",
  "whatsapp",
  "twitter",
  "cart",
  "checkout",
  "star",
  "rating",
  "trust",
  "shipping",
  "flag",
  "bg_removed",
];

function isProductImageUrl(src: string): boolean {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("http://") && !src.startsWith("https://")) return false;
  const lower = src.toLowerCase();
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
  for (const keyword of NOISE_KEYWORDS) {
    if (lower.includes(keyword)) return false;
  }
  return true;
}

/**
 * Helper to scrape product images from a target website URL using Puppeteer and Cheerio fallback
 */
async function extractImagesFromUrl(url: string): Promise<string[]> {
  logger.info(`Extracting product images from URL: ${url}`);
  const collectedUrls: string[] = [];

  // 1. Try Puppeteer first for JavaScript-rendered eCommerce pages
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const pageImages = await page.evaluate(() => {
      const urls: string[] = [];

      // 1. Open Graph & Twitter meta tags
      const ogImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
        document.querySelector('meta[name="og:image"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
      if (ogImage) urls.push(ogImage);

      // 2. Schema.org JSON-LD data
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          const extractFromItem = (item: any) => {
            if (!item) return;
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              imgs.forEach((img: any) => {
                if (typeof img === "string") urls.push(img);
                else if (img && typeof img.url === "string") urls.push(img.url);
                else if (img && typeof img.contentUrl === "string") urls.push(img.contentUrl);
              });
            }
          };

          if (Array.isArray(data)) {
            data.forEach(extractFromItem);
          } else {
            extractFromItem(data);
            if (data["@graph"] && Array.isArray(data["@graph"])) {
              data["@graph"].forEach(extractFromItem);
            }
          }
        } catch {}
      }

      // 3. WooCommerce / Shopify product gallery images specifically
      const galleryImgs = Array.from(
        document.querySelectorAll(
          ".woocommerce-product-gallery img, .product-single__photos img, .product-gallery img, img.wp-post-image"
        )
      );
      galleryImgs.forEach((img: any) => {
        const src =
          img.getAttribute("data-large_image") ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-zoom-image") ||
          img.src;
        if (src) urls.push(src);
      });

      // 4. Fallback: Grab main product gallery images
      const imgTags = Array.from(document.querySelectorAll("img"));
      imgTags.forEach((img) => {
        const src =
          img.src ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-zoom-image") ||
          img.getAttribute("data-large-img") ||
          img.getAttribute("srcset")?.split(" ")[0];
        if (src) urls.push(src);
      });

      return Array.from(new Set(urls));
    });

    await browser.close();
    const validPuppeteerImages = pageImages.filter((u) => {
      if (!u || (!u.startsWith("http://") && !u.startsWith("https://"))) return false;
      const lower = u.toLowerCase();
      if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
      return ![
        "logo", "icon", "avatar", "google-play", "apple-play", "app-store", "play-store",
        "curreny", "currency", "symbol", "badge", "payment", "footer", "banner", "header",
        "social", "facebook", "instagram", "whatsapp", "twitter", "cart", "checkout",
        "star", "rating", "trust", "shipping", "flag"
      ].some(k => lower.includes(k));
    });

    if (validPuppeteerImages.length > 0) {
      logger.info(`Puppeteer successfully extracted ${validPuppeteerImages.length} clean product images from ${url}`);
      return validPuppeteerImages;
    }
  } catch (err: any) {
    logger.warn(`Puppeteer browser extraction skipped for ${url}`, { error: err?.message || err });
  }

  // 2. Fallback to Cheerio static HTML parsing if Puppeteer fails or yields 0 images
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Meta og:image
    const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
    if (ogImage && isProductImageUrl(ogImage)) {
      collectedUrls.push(ogImage);
    }

    // JSON-LD schema
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        const extractFromItem = (item: any) => {
          if (!item) return;
          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            imgs.forEach((img: any) => {
              if (typeof img === "string" && isProductImageUrl(img)) {
                collectedUrls.push(img);
              } else if (img && typeof img.url === "string" && isProductImageUrl(img.url)) {
                collectedUrls.push(img.url);
              }
            });
          }
        };

        if (Array.isArray(data)) data.forEach(extractFromItem);
        else {
          extractFromItem(data);
          if (data["@graph"] && Array.isArray(data["@graph"])) data["@graph"].forEach(extractFromItem);
        }
      } catch {}
    });

    // Gallery images
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-zoom-image");
      if (src && isProductImageUrl(src)) {
        collectedUrls.push(src);
      }
    });

    logger.info(`Cheerio extracted ${collectedUrls.length} static images from ${url}`);
  } catch (err: any) {
    logger.warn(`Cheerio static fallback failed for ${url}`, { error: err?.message || err });
  }

  return Array.from(new Set(collectedUrls.filter(isProductImageUrl)));
}

/**
 * Helper to fetch live web search context for exact watch SKU
 */
async function fetchWebSearchResults(sku: string): Promise<string> {
  try {
    const res = await axios.get("https://html.duckduckgo.com/html/", {
      params: { q: `${sku} watch product` },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 7000,
    });

    const html = res.data || "";
    const cleanText = html
      .replace(/<script\b[^<]*>(?:[\s\S]*?)<\/script>/gi, "")
      .replace(/<style\b[^<]*>(?:[\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleanText.substring(0, 2000);
  } catch (err: any) {
    logger.warn("Live web search fetch skipped", { error: err?.message || err });
  }
  return "";
}

/**
 * Helper to query Wikimedia Commons for watch photos
 */
async function searchWikimediaPhotos(searchTerm: string, limit: number = 10): Promise<string[]> {
  try {
    const wikiRes = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrsearch: searchTerm,
        gsrnamespace: "6", // File/Media namespace
        gsrlimit: limit,
        prop: "imageinfo",
        iiprop: "url",
        format: "json",
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 7000,
    });

    const pages = wikiRes.data?.query?.pages;
    if (pages) {
      const pageList = Object.values(pages) as any[];
      return pageList
        .map((p) => p.imageinfo?.[0]?.url)
        .filter((url): url is string => typeof url === "string" && (url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".png") || url.endsWith(".JPG") || url.endsWith(".PNG")));
    }
  } catch (err: any) {
    logger.warn(`Wikimedia search failed for query: "${searchTerm}"`, { error: err?.message || err });
  }
  return [];
}

/**
 * Helper to prepare image input (URL or base64 data URI) for Gemini API
 */
async function prepareImagePart(imageInput?: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  if (!imageInput || typeof imageInput !== "string") return null;
  const trimmed = imageInput.trim();
  if (!trimmed) return null;

  try {
    // If base64 data URI
    if (trimmed.startsWith("data:")) {
      const matches = trimmed.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        return {
          inlineData: {
            mimeType: matches[1] || "image/jpeg",
            data: matches[2],
          },
        };
      }
    }

    // If HTTP / HTTPS URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const response = await axios.get(trimmed, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const contentType = (response.headers["content-type"] as string) || "image/jpeg";
      const mimeType = contentType.startsWith("image/") ? contentType : "image/jpeg";
      const base64 = Buffer.from(response.data).toString("base64");
      return {
        inlineData: {
          mimeType,
          data: base64,
        },
      };
    }

    // If raw base64 string
    if (trimmed.length > 50 && !trimmed.includes(" ")) {
      return {
        inlineData: {
          mimeType: "image/jpeg",
          data: trimmed,
        },
      };
    }
  } catch (err: any) {
    logger.warn("Failed to download or prepare image for SKU lookup", { error: err?.message || err });
  }

  return null;
}

async function isUrlAccessible(url: string): Promise<boolean> {
  if (!url || typeof url !== "string") return false;
  try {
    const res = await axios.head(url, {
      timeout: 3500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    try {
      const res = await axios.get(url, {
        timeout: 3500,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Range: "bytes=0-100",
        },
      });
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    }
  }
}

/**
 * Fetch 5 real online watch photos for brand & model using SerpAPI + Website Page Scraping
 * and incorporate user-provided image if supplied.
 */
async function fetchOnlineWatchImages(
  brand: string,
  model: string,
  sku: string,
  userProvidedImage?: string
): Promise<SkuImage[]> {
  const cleanBrand = brand.replace(/watch|co\.|ltd\.|sa|inc\./gi, "").trim();
  const cleanModel = model.split("-")[0].split("/")[0].replace(/Ref\.|Reference|Automatique|Series|watch/gi, "").trim();

  const labels = [
    "Primary Front View",
    "Side Angle View",
    "Dial & Bezel Close Up",
    "Strap & Bracelet View",
    "Case Back & Movement",
  ];

  const images: SkuImage[] = [];

  // Step 0: If user provided an image, make it Image #1 (Primary)
  if (userProvidedImage && userProvidedImage.trim()) {
    images.push({
      id: `img-user-provided-${Date.now()}`,
      url: userProvidedImage.trim(),
      isPrimary: true,
      label: "Uploaded Watch Image",
      status: "accepted",
    });
    logger.info(`[User Uploaded Image Selected #1]: ${userProvidedImage.trim()}`);
  }

  let foundUrls: string[] = [];

  // Step 1: Query SerpAPI to get top organic search result URLs for SKU
  const organicUrls = await getOrganicResultUrls(sku, cleanBrand);

  // Step 2: Scrape product images from top website URLs (1st website, 2nd website, etc.)
  for (const targetUrl of organicUrls.slice(0, 3)) {
    if (foundUrls.length >= 5) break;
    const scraped = await extractImagesFromUrl(targetUrl);
    foundUrls = Array.from(new Set([...foundUrls, ...scraped]));
  }

  // Step 3: If fewer than 5 images, fallback to SerpAPI Google Images search
  if (foundUrls.length < 5) {
    const serpImages = await searchSerpApiImages(sku, cleanBrand);
    foundUrls = Array.from(new Set([...foundUrls, ...serpImages]));
  }

  // Step 4: If still fewer than 5 images, fallback to Wikimedia Media Search
  if (foundUrls.length < 5 && (cleanBrand || cleanModel || sku)) {
    const wikiUrls = await searchWikimediaPhotos(`${cleanBrand} ${sku} watch`, 10);
    foundUrls = Array.from(new Set([...foundUrls, ...wikiUrls]));
  }

  // Append found real online images (ensuring strictly unique and 200 OK accessible URLs)
  const existingUrls = new Set(images.map((img) => img.url));

  for (const url of foundUrls) {
    if (images.length >= 5) break;
    if (!url || existingUrls.has(url)) continue;

    const accessible = await isUrlAccessible(url);
    if (!accessible) {
      logger.warn(`Skipping broken or 404 image URL: ${url}`);
      continue;
    }

    existingUrls.add(url);
    const idx = images.length;
    const label = labels[idx] || `View ${idx + 1}`;
    logger.info(`[SKU Image Selected #${idx + 1}] (${label}): ${url}`);

    images.push({
      id: `img-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url,
      isPrimary: idx === 0,
      label,
      status: "pending",
    });
  }

  return images;
}

export class SkuManagementService {
  async lookupSku(sku: string, imageInput?: string, brandNameInput?: string): Promise<SkuLookupFlatResponse> {
    const trimmedSku = sku ? sku.trim() : "";
    const trimmedBrand = brandNameInput ? brandNameInput.trim() : "";
    const trimmedImage = imageInput ? imageInput.trim() : "";

    if (!trimmedSku && !trimmedImage) {
      throw new Error("SKU number or Watch Image is required");
    }

    // Step 1: FIRST fetch 5 real online watch photos by single SKU number (or incorporate user image if provided)
    const onlineImages = await fetchOnlineWatchImages(trimmedBrand, "", trimmedSku, trimmedImage);

    // Step 2: Find the first working, non-404 image from onlineImages to pass to AI for visual analysis
    let selectedImageUrl = trimmedImage;
    let imagePart: any = null;

    for (const imgObj of onlineImages) {
      if (imgObj.url) {
        const prepared = await prepareImagePart(imgObj.url);
        if (prepared) {
          imagePart = prepared;
          selectedImageUrl = imgObj.url;
          break;
        }
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Fetch live web search context snippet for this SKU & Brand
    const searchQuery = [trimmedSku, trimmedBrand].filter(Boolean).join(" ");
    const webContext = await fetchWebSearchResults(searchQuery || "luxury watch");

    let aiResult: any = null;

    // 1. Try Gemini first (preferred for multimodal + Google Search grounding)
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        let model: any;
        try {
          model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            tools: [
              {
                //@ts-ignore
                googleSearch: {},
              },
            ],
          });
        } catch {
          model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
        }

        const dropdownFields = Object.keys(SKU_DROPDOWN_OPTIONS);
        const directFields = [
          "model_number",
          "brand_name",
          "case_diameter",
          "case_thickness",
          "description",
          "short_description",
          "band_material",
        ];
        const allRequestFields = [...dropdownFields, ...directFields];

        const imageSourceText = imagePart ? "and an image of the watch" : "but no image is provided for this one";
        const prompt = `You are a luxury watch expert. I am providing you with a watch's SKU, Brand Name, ${imageSourceText}.
Your task is to identify the watch's detailed specifications as accurately as possible. 
USE THE GOOGLE SEARCH TOOL to find the exact official specifications for this SKU and Brand.
${imagePart ? "Compare the search results with the visual details from the image." : "Rely on the search tool and your knowledge to find the correct specifications."}

SKU: ${trimmedSku || "N/A"}
Brand: ${trimmedBrand || "N/A"}

LIVE WEB SEARCH CONTEXT FOR SEARCH QUERY "${searchQuery}":
${webContext ? webContext.substring(0, 1500) : "No live search results available."}

Available categories and their allowed values (DROPDOWN FIELDS):
${JSON.stringify(SKU_DROPDOWN_OPTIONS, null, 2)}

Other fields to identify (DIRECT FIELDS):
${directFields.join(", ")}

Return a JSON object containing ALL requested fields: ${allRequestFields.join(", ")}, reasoning.

CRITICAL RULES:
1. For DROPDOWN FIELDS: If the identified value matches one of the "allowed values" EXACTLY, use that string.
2. For DIRECT FIELDS: Provide the most accurate professional value found.
3. Include a "reasoning" key briefly explaining the data source.
4. Return ONLY valid JSON.`;

        const parts: any[] = [prompt];
        if (imagePart) {
          parts.push(imagePart);
        }

        const result = await model.generateContent(parts);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch (err: any) {
        logger.warn("Gemini SKU lookup failed, attempting OpenAI fallback", { error: err?.message || err });
      }
    }

    // 2. Try OpenAI if Gemini key was missing or failed
    if (!aiResult && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const systemPrompt = `You are an expert watch cataloger and database lookup assistant.
Given a watch SKU number, brand, and optional image, extract the exact watch brand and specifications.

LIVE WEB SEARCH CONTEXT:
${webContext ? webContext.substring(0, 1500) : "No live search results available."}

You MUST choose values strictly from these allowed dropdown lists for dropdown fields:
${JSON.stringify(SKU_DROPDOWN_OPTIONS, null, 2)}

Return ONLY valid JSON:
{
  "brand_name": "<exact brand name>",
  "model_number": "${trimmedSku || "N/A"}",
  "model_number_ar": "${trimmedSku || "N/A"}",
  "description": "<detailed English description>",
  "description_ar": "<detailed Arabic description>",
  "short_description": "<concise English summary>",
  "short_description_ar": "<concise Arabic summary>",
  "case_diameter": "<e.g. 38mm>",
  "case_thickness": "<e.g. 9mm>",
  "gender": "<select strictly from gender list>",
  "watch_type": "<select strictly from watch_type list>",
  "case_material": "<select strictly from case_material list>",
  "band_material": "<select strictly from band_material list>",
  "movement_type": "<select strictly from movement_type list>",
  "display_type": "<select strictly from display_type list>",
  "water_resistance": "<select strictly from water_resistance list>",
  "dial_color": "<select strictly from dial_color list>",
  "reasoning": "<explanation>"
}`;

        const userContent: any[] = [
          { type: "text", text: `Lookup watch specifications for SKU: "${trimmedSku}", Brand: "${trimmedBrand}"` },
        ];

        if (selectedImageUrl && (selectedImageUrl.startsWith("http://") || selectedImageUrl.startsWith("https://") || selectedImageUrl.startsWith("data:"))) {
          userContent.push({
            type: "image_url",
            image_url: { url: selectedImageUrl },
          });
        }

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent as any },
          ],
          temperature: 0.1,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (content) {
          aiResult = JSON.parse(content);
        }
      } catch (err: any) {
        logger.warn("OpenAI SKU lookup fallback failed", { error: err?.message || err });
      }
    }

    // Extract values with automatic Arabic translation mapping
    const brandName = aiResult?.brand_name || trimmedBrand || "Titan";
    const modelNum = aiResult?.model_number || trimmedSku || "N/A";
    const modelNumAr = aiResult?.model_number_ar || trimmedSku || "N/A";

    const gender = aiResult?.gender || "Mens";
    const watchType = aiResult?.watch_type || "Analog";
    const caseMaterial = aiResult?.case_material || "Stainless Steel 316L";
    const bandMaterial = aiResult?.band_material || "Stainless Steel";
    const movementType = aiResult?.movement_type || "Quartz";
    const displayType = aiResult?.display_type || "Analog";
    const waterResistance = aiResult?.water_resistance || "3 ATM (30m)";
    const dialColor = aiResult?.dial_color || "White/Silver";

    const genderAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.gender[gender] || aiResult?.gender_ar || "رجالي";
    const watchTypeAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.watch_type[watchType] || aiResult?.watch_type_ar || "عقارب";
    const caseMaterialAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.case_material[caseMaterial] || aiResult?.case_material_ar || "ستانلس ستيل 316L";
    const bandMaterialAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.band_material?.[bandMaterial] || aiResult?.band_material_ar || "ستانلس ستيل";
    const movementTypeAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.movement_type[movementType] || aiResult?.movement_type_ar || "كوارتز";
    const displayTypeAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.display_type[displayType] || aiResult?.display_type_ar || "عقارب";
    const waterResistanceAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.water_resistance[waterResistance] || aiResult?.water_resistance_ar || "3 ATM (30م)";
    const dialColorAr = SKU_DROPDOWN_ARABIC_TRANSLATIONS.dial_color[dialColor] || aiResult?.dial_color_ar || "أبيض / فضي";

    const caseDiameter = aiResult?.case_diameter || "38mm";
    const caseDiameterAr = aiResult?.case_diameter_ar || "38 ملم";
    const caseThickness = aiResult?.case_thickness || "9mm";
    const caseThicknessAr = aiResult?.case_thickness_ar || "9 ملم";

    const desc = aiResult?.description || `${brandName} Quartz Analog watch Ref. ${modelNum} featuring a ${dialColor} dial and ${caseMaterial} case.`;
    const descAr = aiResult?.description_ar || `ساعة ${brandName} كوارتز عقارب مرجع ${modelNumAr} تتميز بمينا ${dialColorAr} وهيكل من ${caseMaterialAr}.`;

    const shortDesc = aiResult?.short_description || `${brandName} ${watchType} ${dialColor} Dial`;
    const shortDescAr = aiResult?.short_description_ar || `ساعة ${brandName} ${watchTypeAr} مينا ${dialColorAr}`;

    return {
      sku: trimmedSku || modelNum,
      brand_name: brandName,
      model_number: modelNum,
      model_number_ar: modelNumAr,
      description: desc,
      description_ar: descAr,
      short_description: shortDesc,
      short_description_ar: shortDescAr,
      case_diameter: caseDiameter,
      case_diameter_ar: caseDiameterAr,
      case_thickness: caseThickness,
      case_thickness_ar: caseThicknessAr,
      gender,
      gender_ar: genderAr,
      watch_type: watchType,
      watch_type_ar: watchTypeAr,
      case_material: caseMaterial,
      case_material_ar: caseMaterialAr,
      band_material: bandMaterial,
      band_material_ar: bandMaterialAr,
      movement_type: movementType,
      movement_type_ar: movementTypeAr,
      display_type: displayType,
      display_type_ar: displayTypeAr,
      water_resistance: waterResistance,
      water_resistance_ar: waterResistanceAr,
      dial_color: dialColor,
      dial_color_ar: dialColorAr,
      images: onlineImages,
    };
  }
}


export const skuManagementService = new SkuManagementService();

