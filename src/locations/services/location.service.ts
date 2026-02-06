/**
 * Location Service
 * Business logic for Location management
 */

import { locationRepository } from "../../repositories/location.repository.js";
import type { Location, CreateLocationDto, UpdateLocationDto } from "../../models/location.model.js";
import { logger } from "../../utils/logger.js";

export class LocationService {
  /**
   * Create a new location
   */
  async createLocation(data: CreateLocationDto): Promise<Location> {
    try {
      return await locationRepository.create(data);
    } catch (error) {
      logger.error("Location service createLocation error", { error, data });
      throw error;
    }
  }

  /**
   * Get all locations with count and data
   */
  async getLocations(
    page: number = 1,
    limit: number = 50,
    filters: { isActive?: boolean; search?: string } = {}
  ): Promise<{ status: boolean; count: number; data: Location[] }> {
    try {
      const skip = (page - 1) * limit;
      const { locations, total } = await locationRepository.findAll(skip, limit, filters);

      return {
        status: true,
        count: total,
        data: locations
      };
    } catch (error) {
      logger.error("Location service getLocations error", { error, page, limit, filters });
      throw error;
    }
  }

  /**
   * Get location by ID
   */
  async getLocationById(id: string): Promise<Location | null> {
    return await locationRepository.findById(id);
  }

  /**
   * Update location
   */
  async updateLocation(id: string, data: UpdateLocationDto): Promise<Location> {
    try {
      // Check if it exists
      const existing = await locationRepository.findById(id);
      if (!existing) {
        throw new Error("Location not found");
      }

      return await locationRepository.update(id, data);
    } catch (error) {
      logger.error("Location service updateLocation error", { error, id, data });
      throw error;
    }
  }

  /**
   * Delete location
   */
  async deleteLocation(id: string): Promise<void> {
    try {
      const existing = await locationRepository.findById(id);
      if (!existing) {
        throw new Error("Location not found");
      }

      await locationRepository.delete(id);
    } catch (error) {
      logger.error("Location service deleteLocation error", { error, id });
      throw error;
    }
  }
}

export const locationService = new LocationService();
