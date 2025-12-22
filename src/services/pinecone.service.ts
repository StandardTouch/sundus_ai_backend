/**
 * Pinecone Service
 * Handles Pinecone vector database operations for FAQ semantic search
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { pineconeConfig, validatePineconeConfig } from "../config/pinecone.config.js";
import { logger } from "../utils/logger.js";

/**
 * FAQ record structure for Pinecone
 */
export interface FAQRecord {
  _id: string;
  content: string; // Combined question + answer for embedding
  category?: string;
  [key: string]: any; // Additional metadata fields
}

/**
 * Search result from Pinecone
 */
export interface FAQSearchResult {
  _id: string;
  _score: number;
  fields: Record<string, any>;
}

/**
 * Pinecone Service
 * Provides methods for interacting with Pinecone vector database
 */
export class PineconeService {
  private client: Pinecone;
  private indexName: string;
  private defaultNamespace: string;

  constructor() {
    validatePineconeConfig();
    this.client = new Pinecone({ apiKey: pineconeConfig.apiKey });
    this.indexName = pineconeConfig.indexName;
    this.defaultNamespace = pineconeConfig.defaultNamespace;
  }

  /**
   * Get the Pinecone index
   */
  private getIndex() {
    return this.client.index(this.indexName);
  }

  /**
   * Get the namespace for operations
   */
  private getNamespace(namespace?: string) {
    return this.getIndex().namespace(namespace || this.defaultNamespace);
  }

  /**
   * Upsert FAQ records to Pinecone
   * @param records Array of FAQ records to upsert
   * @param namespace Optional namespace (defaults to configured namespace)
   */
  async upsertFAQs(
    records: FAQRecord[],
    namespace?: string
  ): Promise<void> {
    try {
      if (records.length === 0) {
        logger.warn("No records to upsert");
        return;
      }

      // Pinecone batch limit: 96 records per batch for text records
      const batchSize = 96;
      const ns = this.getNamespace(namespace);

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        logger.info("Upserting FAQ batch to Pinecone", {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalRecords: records.length,
          namespace: namespace || this.defaultNamespace,
        });

        await ns.upsertRecords(batch);
      }

      logger.info("Successfully upserted FAQs to Pinecone", {
        totalRecords: records.length,
        namespace: namespace || this.defaultNamespace,
      });

      // Wait for records to be indexed (Pinecone requires 5-10 seconds)
      logger.info("Waiting for records to be indexed...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error: any) {
      logger.error("Error upserting FAQs to Pinecone", {
        error: error.message,
        recordsCount: records.length,
        namespace: namespace || this.defaultNamespace,
      });
      throw error;
    }
  }

  /**
   * Search FAQs using semantic search with reranking
   * @param queryText The search query text
   * @param topK Number of results to return (default from config)
   * @param namespace Optional namespace (defaults to configured namespace)
   * @returns Array of search results with scores
   */
  async searchFAQs(
    queryText: string,
    topK?: number,
    namespace?: string
  ): Promise<FAQSearchResult[]> {
    try {
      const ns = this.getNamespace(namespace);
      const k = topK || pineconeConfig.defaultTopK;

      logger.info("Searching FAQs in Pinecone", {
        query: queryText,
        topK: k,
        namespace: namespace || this.defaultNamespace,
      });

      // Search with reranking for better results
      const results = await ns.searchRecords({
        query: {
          topK: k * 2, // Get more candidates for reranking
          inputs: {
            text: queryText,
          },
        },
        rerank: {
          model: "bge-reranker-v2-m3",
          topN: k,
          rankFields: ["content"],
        },
      });

      // Extract and format results
      const searchResults: FAQSearchResult[] = results.result.hits.map((hit) => {
        const fields = hit.fields as Record<string, any>;
        return {
          _id: hit._id,
          _score: hit._score,
          fields,
        };
      });

      // Filter by similarity threshold
      const filteredResults = searchResults.filter(
        (result) => result._score >= pineconeConfig.similarityThreshold
      );

      logger.info("FAQ search completed", {
        query: queryText,
        totalResults: filteredResults.length,
        topScore: filteredResults[0]?._score || 0,
        namespace: namespace || this.defaultNamespace,
      });

      return filteredResults;
    } catch (error: any) {
      logger.error("Error searching FAQs in Pinecone", {
        error: error.message,
        query: queryText,
        namespace: namespace || this.defaultNamespace,
      });
      throw error;
    }
  }

  /**
   * Fetch FAQ records by IDs
   * @param ids Array of FAQ IDs to fetch
   * @param namespace Optional namespace (defaults to configured namespace)
   * @returns Map of ID to record
   */
  async fetchFAQs(
    ids: string[],
    namespace?: string
  ): Promise<Record<string, FAQRecord>> {
    try {
      if (ids.length === 0) {
        return {};
      }

      const ns = this.getNamespace(namespace);

      logger.info("Fetching FAQs from Pinecone", {
        idsCount: ids.length,
        namespace: namespace || this.defaultNamespace,
      });

      const result = await ns.fetch(ids);

      const records: Record<string, FAQRecord> = {};
      for (const [id, record] of Object.entries(result.records || {})) {
        const fields = record.fields as Record<string, any>;
        records[id] = {
          _id: id,
          ...fields,
        } as FAQRecord;
      }

      logger.info("Successfully fetched FAQs from Pinecone", {
        fetchedCount: Object.keys(records).length,
        requestedCount: ids.length,
      });

      return records;
    } catch (error: any) {
      logger.error("Error fetching FAQs from Pinecone", {
        error: error.message,
        idsCount: ids.length,
        namespace: namespace || this.defaultNamespace,
      });
      throw error;
    }
  }

  /**
   * Delete FAQ records by IDs
   * @param ids Array of FAQ IDs to delete
   * @param namespace Optional namespace (defaults to configured namespace)
   */
  async deleteFAQs(
    ids: string[],
    namespace?: string
  ): Promise<void> {
    try {
      if (ids.length === 0) {
        return;
      }

      const ns = this.getNamespace(namespace);

      logger.info("Deleting FAQs from Pinecone", {
        idsCount: ids.length,
        namespace: namespace || this.defaultNamespace,
      });

      await ns.deleteMany(ids);

      logger.info("Successfully deleted FAQs from Pinecone", {
        deletedCount: ids.length,
        namespace: namespace || this.defaultNamespace,
      });
    } catch (error: any) {
      logger.error("Error deleting FAQs from Pinecone", {
        error: error.message,
        idsCount: ids.length,
        namespace: namespace || this.defaultNamespace,
      });
      throw error;
    }
  }

  /**
   * Delete all FAQs in a namespace
   * @param namespace Optional namespace (defaults to configured namespace)
   */
  async deleteAllFAQs(namespace?: string): Promise<void> {
    try {
      const ns = this.getNamespace(namespace);

      logger.info("Deleting all FAQs from Pinecone namespace", {
        namespace: namespace || this.defaultNamespace,
      });

      await ns.deleteAll();

      logger.info("Successfully deleted all FAQs from Pinecone namespace", {
        namespace: namespace || this.defaultNamespace,
      });
    } catch (error: any) {
      logger.error("Error deleting all FAQs from Pinecone", {
        error: error.message,
        namespace: namespace || this.defaultNamespace,
      });
      throw error;
    }
  }

  /**
   * Get index statistics
   * @returns Index stats including record count
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.getIndex().describeIndexStats();
      logger.info("Retrieved Pinecone index stats", { stats });
      return stats;
    } catch (error: any) {
      logger.error("Error getting Pinecone index stats", {
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Singleton Pinecone service instance
 */
export const pineconeService = new PineconeService();

