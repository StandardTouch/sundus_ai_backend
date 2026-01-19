/**
 * Background Removal Service
 * Handles interactions with Dezgo AI API for image background removal
 */

import axios from "axios";
import type { AxiosInstance } from "axios";
import FormData from "form-data";
import { dezgoConfig, validateDezgoConfig } from "../../config/dezgo.config.js";
import { logger } from "../../utils/logger.js";

export type BGRemovalMode = "mask" | "transparent";

export interface BGRemovalResult {
  success: boolean;
  data?: Buffer;
  error?: string;
  status?: number;
}

export class BGRemovalService {
  private client: AxiosInstance;

  constructor() {
    validateDezgoConfig();
    
    this.client = axios.create({
      baseURL: dezgoConfig.apiBaseUrl,
      timeout: dezgoConfig.timeout,
      headers: {
        "X-Dezgo-Key": dezgoConfig.apiKey,
      },
      responseType: "arraybuffer", // Important for receiving binary data
    });
  }

  /**
   * Remove background from an image
   * 
   * @param imageBuffer - The image file buffer
   * @param mode - "mask" or "transparent" (default: "transparent")
   * @returns Background removal result containing the image buffer
   */
  async removeBackground(
    imageBuffer: Buffer,
    mode: BGRemovalMode = "transparent"
  ): Promise<BGRemovalResult> {
    try {
      logger.info("Calling Dezgo background removal API", { 
        mode, 
        imageSize: imageBuffer.length 
      });

      const form = new FormData();
      form.append("image", imageBuffer, {
        filename: "input.png", // Filename is required for some multipart APIs
        contentType: "image/png",
      });
      form.append("mode", mode);

      const response = await this.client.post("/remove-background", form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      logger.info("Dezgo background removal successful", {
        status: response.status,
        resultSize: response.data.length,
      });

      return {
        success: true,
        data: Buffer.from(response.data),
        status: response.status,
      };
    } catch (error: any) {
      // Axios errors with responseType: 'arraybuffer' might have the error message in the buffer
      let errorMessage = error.message;
      
      if (error.response?.data && error.response.data instanceof Buffer) {
        try {
          const errorData = JSON.parse(error.response.data.toString());
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not JSON, use the raw string or default message
          errorMessage = error.response.data.toString() || errorMessage;
        }
      }

      logger.error("Dezgo background removal error", {
        error: errorMessage,
        status: error.response?.status,
      });

      return {
        success: false,
        error: errorMessage || "Dezgo API error",
        status: error.response?.status,
      };
    }
  }
}

export const bgRemovalService = new BGRemovalService();
