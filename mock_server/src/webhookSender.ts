import axios from "axios";
import type { BaseWebhookPayload } from "./types.js";

/**
 * Sends webhook payload to the target server
 */
export class WebhookSender {
  private targetUrl: string;

  constructor(targetUrl: string = "http://localhost:3000") {
    this.targetUrl = targetUrl;
  }

  /**
   * Sends webhook payload to the target server
   */
  async sendWebhook(payload: BaseWebhookPayload): Promise<{
    success: boolean;
    status?: number;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await axios.post(this.targetUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Sets a new target URL
   */
  setTargetUrl(url: string): void {
    this.targetUrl = url;
  }

  /**
   * Gets the current target URL
   */
  getTargetUrl(): string {
    return this.targetUrl;
  }
}

