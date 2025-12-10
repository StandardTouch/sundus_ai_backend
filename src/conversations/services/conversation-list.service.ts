/**
 * Conversation List Service
 * Business logic for listing conversations with pagination, search, and filters
 */

import { getDatabase } from "../../config/database.js";
import { conversationMessageRepository } from "../../repositories/conversation-message.repository.js";
import { feedbackRepository } from "../../repositories/feedback.repository.js";
import { logger } from "../../utils/logger.js";

export interface GetConversationsOptions {
  page?: number;
  limit?: number;
  search?: string;
  phone_number?: string;
  start_date?: Date;
  end_date?: Date;
  sort_by?: 'last_timestamp' | 'phone_number' | 'message_count';
  sort_order?: 'asc' | 'desc';
}

export interface ConversationListItem {
  conversation_id: string;
  phone_number: string;
  user_name?: string;
  last_message: string;
  last_timestamp: Date;
  message_count: number;
  rating: number; // 0-5 (calculated from feedback)
}

export class ConversationListService {
  /**
   * Get conversations with pagination, search, and filters
   */
  async getConversations(options: GetConversationsOptions = {}): Promise<{
    conversations: ConversationListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const skip = (page - 1) * limit;

      // Build match query
      const matchQuery: any = {
        conversation_id: { $exists: true, $ne: null },
        // Exclude feedback template messages
        $expr: {
          $ne: [{ $ifNull: ["$metadata.is_feedback_template", false] }, true]
        }
      };

      // Filter by phone number
      if (options.phone_number) {
        matchQuery.phone_number = options.phone_number;
      }

      // Filter by date range
      if (options.start_date || options.end_date) {
        matchQuery.timestamp = {};
        if (options.start_date) {
          matchQuery.timestamp.$gte = options.start_date;
        }
        if (options.end_date) {
          matchQuery.timestamp.$lte = options.end_date;
        }
      }

      // Search in phone_number, conversation_id, or content
      if (options.search) {
        const searchRegex = { $regex: options.search, $options: 'i' };
        matchQuery.$or = [
          { phone_number: searchRegex },
          { conversation_id: searchRegex },
          { content: searchRegex }
        ];
      }

      // Aggregate to get conversations grouped by conversation_id
      const sortField = options.sort_by || 'last_timestamp';
      const sortOrder = options.sort_order === 'asc' ? 1 : -1;

      const sortStage: any = {};
      if (sortField === 'last_timestamp') {
        sortStage.last_timestamp = sortOrder;
      } else if (sortField === 'phone_number') {
        sortStage.phone_number = sortOrder;
      } else if (sortField === 'message_count') {
        sortStage.message_count = sortOrder;
      }

      const conversations = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: matchQuery
          },
          {
            $sort: { timestamp: -1 }
          },
          {
            $group: {
              _id: "$conversation_id",
              phone_number: { $first: "$phone_number" },
              last_message: { $first: "$content" },
              last_timestamp: { $first: "$timestamp" },
              message_count: { $sum: 1 }
            }
          },
          {
            $sort: sortStage
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ])
        .toArray();

      // Get total count for pagination
      const totalCount = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: matchQuery
          },
          {
            $group: {
              _id: "$conversation_id"
            }
          },
          {
            $count: "total"
          }
        ])
        .toArray();

      const total = totalCount[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      // Get user names from user_sessions
      const phoneNumbers = conversations.length > 0
        ? conversations.map(c => c.phone_number).filter(Boolean)
        : [];

      const userSessions = phoneNumbers.length > 0
        ? await getDatabase()
            .collection("user_sessions")
            .find({ phone_number: { $in: phoneNumbers } })
            .toArray()
        : [];

      const userMap = new Map(
        userSessions.map(session => [
          session.phone_number,
          session.user_name || session.contact_name
        ])
      );

      // Get feedback/ratings for these conversations
      const conversationIds = conversations.length > 0
        ? conversations.map(c => c._id).filter(Boolean)
        : [];

      const feedbacks = conversationIds.length > 0
        ? await feedbackRepository.getCollection()
            .find({ conversation_id: { $in: conversationIds } })
            .toArray()
        : [];

      const feedbackMap = new Map<string, number>();
      feedbacks.forEach(feedback => {
        const convId = feedback.conversation_id;
        if (convId) {
          // Convert is_positive to rating (true = 5 stars, false = 1 star)
          const rating = feedback.is_positive ? 5 : 1;
          // If multiple feedbacks, average them
          const existing = feedbackMap.get(convId);
          if (existing) {
            feedbackMap.set(convId, (existing + rating) / 2);
          } else {
            feedbackMap.set(convId, rating);
          }
        }
      });

      // Format results
      const formattedConversations: ConversationListItem[] = conversations.map(conv => ({
        conversation_id: conv._id || "unknown",
        phone_number: conv.phone_number || "unknown",
        user_name: userMap.get(conv.phone_number),
        last_message: (conv.last_message || "").substring(0, 200), // Truncate to 200 chars
        last_timestamp: conv.last_timestamp,
        message_count: conv.message_count || 0,
        rating: Math.round((feedbackMap.get(conv._id) || 0) * 10) / 10 // Round to 1 decimal
      }));

      return {
        conversations: formattedConversations,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error("Conversation list service getConversations error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        options
      });
      throw error;
    }
  }

  /**
   * Get a single conversation by ID with its messages
   */
  async getConversationById(
    conversationId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    conversation: {
      conversation_id: string;
      phone_number: string;
      user_name?: string;
      first_timestamp: Date;
      last_timestamp: Date;
      total_messages: number;
      rating: number;
    };
    messages: Array<{
      message_id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      replied_to_message_id?: string;
      metadata?: any;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } | null> {
    try {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 50));
      const skip = (page - 1) * limit;

      // Get conversation summary
      const conversationSummary = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: {
              conversation_id: conversationId,
              // Exclude feedback template messages
              $expr: {
                $ne: [{ $ifNull: ["$metadata.is_feedback_template", false] }, true]
              }
            }
          },
          {
            $group: {
              _id: "$conversation_id",
              phone_number: { $first: "$phone_number" },
              first_timestamp: { $min: "$timestamp" },
              last_timestamp: { $max: "$timestamp" },
              total_messages: { $sum: 1 }
            }
          }
        ])
        .toArray();

      if (conversationSummary.length === 0) {
        return null;
      }

      const summary = conversationSummary[0];

      // Get user name
      const userSession = await getDatabase()
        .collection("user_sessions")
        .findOne({ phone_number: summary.phone_number });

      const user_name = userSession?.user_name || userSession?.contact_name;

      // Get feedback/rating
      const feedbacks = await feedbackRepository.getCollection()
        .find({ conversation_id: conversationId })
        .toArray();

      let rating = 0;
      if (feedbacks.length > 0) {
        const ratings = feedbacks.map(f => f.is_positive ? 5 : 1);
        rating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        rating = Math.round(rating * 10) / 10; // Round to 1 decimal
      }

      // Get messages (paginated, excluding feedback templates)
      const messages = await conversationMessageRepository.getCollection()
        .find({
          conversation_id: conversationId,
          // Exclude feedback template messages
          $expr: {
            $ne: [{ $ifNull: ["$metadata.is_feedback_template", false] }, true]
          }
        })
        .sort({ timestamp: 1 }) // Oldest first
        .skip(skip)
        .limit(limit)
        .toArray();

      // Get total message count for pagination
      const totalMessages = await conversationMessageRepository.getCollection()
        .countDocuments({
          conversation_id: conversationId,
          $expr: {
            $ne: [{ $ifNull: ["$metadata.is_feedback_template", false] }, true]
          }
        });

      const totalPages = Math.ceil(totalMessages / limit);

      return {
        conversation: {
          conversation_id: conversationId,
          phone_number: summary.phone_number || "unknown",
          user_name,
          first_timestamp: summary.first_timestamp,
          last_timestamp: summary.last_timestamp,
          total_messages: summary.total_messages || 0,
          rating
        },
        messages: messages.map(msg => ({
          message_id: msg.message_id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          replied_to_message_id: msg.replied_to_message_id,
          metadata: msg.metadata
        })),
        pagination: {
          page,
          limit,
          total: totalMessages,
          totalPages
        }
      };
    } catch (error) {
      logger.error("Conversation list service getConversationById error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        conversationId
      });
      throw error;
    }
  }
}

export const conversationListService = new ConversationListService();

