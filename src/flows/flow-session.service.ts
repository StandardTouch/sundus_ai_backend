/**
 * Flow Session Service
 * Tracks each user's current step, language, and state in the guided flow.
 * Uses Redis (via cacheService) with in-memory fallback.
 */

import { cacheService } from "../services/cache.service.js";
import { logger } from "../utils/logger.js";
import type { UserFlowSession, FlowStepId, SupportedLanguage } from "./flow.types.js";

const SESSION_TTL_SECONDS = 86400; // 24 hours (matching WhatsApp session window)
const SESSION_CACHE_PREFIX = "flow:session:";

export class FlowSessionService {
  // In-memory fallback if Redis is disabled or offline
  private memorySessions: Map<string, UserFlowSession> = new Map();

  private getKey(phoneNumber: string): string {
    return `${SESSION_CACHE_PREFIX}${phoneNumber}`;
  }

  /**
   * Get user session
   */
  async getSession(phoneNumber: string): Promise<UserFlowSession | null> {
    try {
      const cached = await cacheService.get<UserFlowSession>(this.getKey(phoneNumber));
      if (cached) {
        return cached;
      }
    } catch (err: any) {
      logger.warn("Failed to fetch session from cache, checking memory", { error: err.message, phoneNumber });
    }

    return this.memorySessions.get(phoneNumber) || null;
  }

  /**
   * Save or update user session
   */
  async saveSession(session: UserFlowSession): Promise<void> {
    session.lastActive = Date.now();
    this.memorySessions.set(session.phoneNumber, session);

    try {
      await cacheService.set(this.getKey(session.phoneNumber), session, SESSION_TTL_SECONDS);
    } catch (err: any) {
      logger.warn("Failed to save session to cache, saved to memory only", { error: err.message, phoneNumber: session.phoneNumber });
    }
  }

  /**
   * Update user's language and step
   */
  async updateLanguage(phoneNumber: string, language: SupportedLanguage, nextStep: FlowStepId = "MAIN_MENU"): Promise<UserFlowSession> {
    let session = await this.getSession(phoneNumber);

    if (!session) {
      session = {
        phoneNumber,
        currentStep: nextStep,
        language,
        lastActive: Date.now(),
      };
    } else {
      session.language = language;
      session.currentStep = nextStep;
      session.lastActive = Date.now();
    }

    await this.saveSession(session);
    return session;
  }

  /**
   * Transition user to a new step
   */
  async updateStep(phoneNumber: string, step: FlowStepId, additionalData?: Record<string, any>): Promise<UserFlowSession> {
    let session = await this.getSession(phoneNumber);

    if (!session) {
      session = {
        phoneNumber,
        currentStep: step,
        lastActive: Date.now(),
        data: additionalData,
      };
    } else {
      session.currentStep = step;
      session.lastActive = Date.now();
      if (additionalData) {
        session.data = { ...(session.data || {}), ...additionalData };
      }
    }

    await this.saveSession(session);
    return session;
  }

  /**
   * Clear user session (reset to start)
   */
  async clearSession(phoneNumber: string): Promise<void> {
    this.memorySessions.delete(phoneNumber);
    try {
      await cacheService.del(this.getKey(phoneNumber));
    } catch (err: any) {
      logger.warn("Failed to clear session from cache", { error: err.message, phoneNumber });
    }
  }
}

export const flowSessionService = new FlowSessionService();

