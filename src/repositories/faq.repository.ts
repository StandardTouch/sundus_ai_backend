/**
 * FAQ Repository
 * Database operations for FAQs
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { FAQ, CreateFAQDto, AISuggestedFAQDto } from "../models/faq.model.js";
import { logger } from "../utils/logger.js";

export class FAQRepository {
  private getCollection() {
    return getDatabase().collection<FAQ>("faqs");
  }

  /**
   * Find FAQ by ID
   */
  async findById(id: string): Promise<FAQ | null> {
    try {
      const faq = await this.getCollection().findOne({ _id: toObjectId(id) as any });
      if (!faq) return null;
      
      return {
        ...faq,
        _id: fromObjectId(faq._id as any)
      } as FAQ;
    } catch (error) {
      logger.error("FAQ repository findById error", { error, id });
      return null;
    }
  }

  /**
   * Find FAQs by IDs
   */
  async findByIds(ids: string[]): Promise<FAQ[]> {
    try {
      if (ids.length === 0) return [];

      const objectIds = ids.map(id => toObjectId(id) as any);
      const faqs = await this.getCollection()
        .find({ _id: { $in: objectIds } })
        .toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findByIds error", { error, ids });
      return [];
    }
  }

  /**
   * Find all active FAQs
   */
  async findActive(): Promise<FAQ[]> {
    try {
      const faqs = await this.getCollection()
        .find({ 
          is_active: true,
          status: "active"
        })
        .sort({ usage_count: -1, created_at: -1 })
        .toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findActive error", { error });
      return [];
    }
  }

  /**
   * Find FAQs by category
   */
  async findByCategory(category: string): Promise<FAQ[]> {
    try {
      const faqs = await this.getCollection()
        .find({ 
          category,
          is_active: true,
          status: "active"
        })
        .sort({ usage_count: -1, created_at: -1 })
        .toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findByCategory error", { error, category });
      return [];
    }
  }

  /**
   * Find FAQs by status
   */
  async findByStatus(status: 'active' | 'pending_review' | 'rejected'): Promise<FAQ[]> {
    try {
      const faqs = await this.getCollection()
        .find({ status })
        .sort({ created_at: -1 })
        .toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findByStatus error", { error, status });
      return [];
    }
  }

  /**
   * Find FAQs by source
   */
  async findBySource(source: 'manual' | 'ai_suggested'): Promise<FAQ[]> {
    try {
      const faqs = await this.getCollection()
        .find({ source })
        .sort({ created_at: -1 })
        .toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findBySource error", { error, source });
      return [];
    }
  }

  /**
   * Find pending review FAQs (AI suggestions)
   */
  async findPendingReviewFAQs(limit?: number): Promise<FAQ[]> {
    try {
      const query: any = {
        status: 'pending_review',
        source: 'ai_suggested'
      };

      let findQuery = this.getCollection()
        .find(query)
        .sort({ created_at: -1 });

      if (limit) {
        findQuery = findQuery.limit(limit);
      }

      const faqs = await findQuery.toArray();

      return faqs.map(faq => ({
        ...faq,
        _id: fromObjectId(faq._id as any)
      })) as FAQ[];
    } catch (error) {
      logger.error("FAQ repository findPendingReviewFAQs error", { error, limit });
      throw error;
    }
  }

  /**
   * Create FAQ (manual)
   */
  async create(createData: CreateFAQDto): Promise<FAQ> {
    try {
      const now = new Date();
      const faq: Omit<FAQ, "_id"> & { _id?: any } = {
        ...createData,
        vector_id: "",  // Will be set after Pinecone sync
        source: "manual",
        status: "active",
        usage_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(faq as any);
      const faqId = fromObjectId(result.insertedId);
      
      // Update vector_id to match _id
      await this.getCollection().updateOne(
        { _id: result.insertedId },
        { $set: { vector_id: faqId } }
      );
      
      return {
        ...faq,
        _id: faqId,
        vector_id: faqId
      } as FAQ;
    } catch (error) {
      logger.error("FAQ repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Create AI-suggested FAQ
   */
  async createAISuggested(createData: AISuggestedFAQDto): Promise<FAQ> {
    try {
      const now = new Date();
      const faq: Omit<FAQ, "_id"> & { _id?: any } = {
        ...createData,
        vector_id: "",  // Will be set after approval and Pinecone sync
        source: "ai_suggested",
        status: "pending_review",
        usage_count: 0,
        is_active: false,
        ai_suggestion: {
          source_conversation_id: createData.source_conversation_id,
          source_message_id: createData.source_message_id,
          confidence_score: createData.confidence_score,
          suggested_at: now
        },
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(faq as any);
      
      return {
        ...faq,
        _id: fromObjectId(result.insertedId)
      } as FAQ;
    } catch (error) {
      logger.error("FAQ repository createAISuggested error", { error, createData });
      throw error;
    }
  }

  /**
   * Update FAQ
   */
  async update(id: string, updateData: Partial<FAQ>): Promise<FAQ> {
    try {
      const updatePayload = {
        ...updateData,
        updated_at: new Date()
      };

      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        { $set: updatePayload }
      );

      const updatedFAQ = await this.findById(id);
      if (!updatedFAQ) {
        throw new Error("FAQ not found after update");
      }

      return updatedFAQ;
    } catch (error) {
      logger.error("FAQ repository update error", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Delete FAQ
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().deleteOne({ _id: toObjectId(id) as any });
    } catch (error) {
      logger.error("FAQ repository delete error", { error, id });
      throw error;
    }
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    try {
      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        {
          $inc: { usage_count: 1 },
          $set: { 
            last_used_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("FAQ repository incrementUsage error", { error, id });
      // Don't throw - usage tracking is not critical
    }
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    try {
      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        {
          $set: { 
            last_used_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("FAQ repository updateLastUsed error", { error, id });
      // Don't throw - usage tracking is not critical
    }
  }

  /**
   * Find all FAQs (paginated)
   */
  async findAll(
    skip: number = 0,
    limit: number = 50,
    filters: {
      category?: string;
      status?: 'active' | 'pending_review' | 'rejected';
      source?: 'manual' | 'ai_suggested';
      is_active?: boolean;
      search?: string;
      has_arabic?: boolean;
    } = {}
  ): Promise<{ faqs: FAQ[]; total: number }> {
    try {
      const query: any = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.source) {
        query.source = filters.source;
      }

      if (filters.is_active !== undefined) {
        query.is_active = filters.is_active;
      }

      // Build $and array for complex filters
      const andConditions: any[] = [];

      // Search filter (searches in question and answer)
      if (filters.search && filters.search.trim()) {
        const searchRegex = { $regex: filters.search.trim(), $options: "i" };
        andConditions.push({
          $or: [
            { question: searchRegex },
            { answer: searchRegex }
          ]
        });
      }

      // Arabic content filter
      if (filters.has_arabic !== undefined) {
        if (filters.has_arabic === true) {
          // FAQs that have Arabic content (question_ar or answer_ar exists and is not empty)
          andConditions.push({
            $or: [
              { question_ar: { $exists: true, $ne: null, $ne: "" } },
              { answer_ar: { $exists: true, $ne: null, $ne: "" } }
            ]
          });
        } else {
          // FAQs that don't have Arabic content (both question_ar and answer_ar are missing/empty)
          andConditions.push({
            $and: [
              {
                $or: [
                  { question_ar: { $exists: false } },
                  { question_ar: null },
                  { question_ar: "" }
                ]
              },
              {
                $or: [
                  { answer_ar: { $exists: false } },
                  { answer_ar: null },
                  { answer_ar: "" }
                ]
              }
            ]
          });
        }
      }

      // Apply $and conditions if we have any
      if (andConditions.length > 0) {
        query.$and = [...(query.$and || []), ...andConditions];
      }

      const [faqs, total] = await Promise.all([
        this.getCollection()
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ created_at: -1 })
          .toArray(),
        this.getCollection().countDocuments(query)
      ]);

      return {
        faqs: faqs.map(faq => ({
          ...faq,
          _id: fromObjectId(faq._id as any)
        })) as FAQ[],
        total
      };
    } catch (error) {
      logger.error("FAQ repository findAll error", { error, skip, limit, filters });
      throw error;
    }
  }
}

export const faqRepository = new FAQRepository();

