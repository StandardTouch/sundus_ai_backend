/**
 * Location Repository
 * Database operations for Locations
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { Location, CreateLocationDto, UpdateLocationDto } from "../models/location.model.js";
import { logger } from "../utils/logger.js";

export class LocationRepository {
  private getCollection() {
    return getDatabase().collection<Location>("locations");
  }

  /**
   * Find Location by ID
   */
  async findById(id: string): Promise<Location | null> {
    try {
      const location = await this.getCollection().findOne({ _id: toObjectId(id) as any });
      if (!location) return null;
      
      return {
        ...location,
        _id: fromObjectId(location._id as any)
      } as Location;
    } catch (error) {
      logger.error("Location repository findById error", { error, id });
      return null;
    }
  }

  /**
   * Find Location by location_id
   */
  async findByLocationId(locationId: string): Promise<Location | null> {
    try {
      const location = await this.getCollection().findOne({ location_id: locationId });
      if (!location) return null;
      
      return {
        ...location,
        _id: fromObjectId(location._id as any)
      } as Location;
    } catch (error) {
      logger.error("Location repository findByLocationId error", { error, locationId });
      return null;
    }
  }

  /**
   * Find all locations (paginated)
   */
  async findAll(
    skip: number = 0,
    limit: number = 50,
    filters: {
      isActive?: boolean;
      search?: string;
    } = {}
  ): Promise<{ locations: Location[]; total: number }> {
    try {
      const query: any = {};

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.search && filters.search.trim()) {
        const searchRegex = { $regex: filters.search.trim(), $options: "i" };
        query.$or = [
          { location_id: searchRegex },
          { location_title: searchRegex },
          { location_title_ara: searchRegex },
          { location_address: searchRegex },
          { location_address_ara: searchRegex }
        ];
      }

      const [locations, total] = await Promise.all([
        this.getCollection()
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ created_at: -1 })
          .toArray(),
        this.getCollection().countDocuments(query)
      ]);

      return {
        locations: locations.map(loc => ({
          ...loc,
          _id: fromObjectId(loc._id as any)
        })) as Location[],
        total
      };
    } catch (error) {
      logger.error("Location repository findAll error", { error, skip, limit, filters });
      throw error;
    }
  }

  /**
   * Create Location with automatic sequential location_id
   */
  async create(createData: CreateLocationDto): Promise<Location> {
    try {
      const now = new Date();

      // Automatic sequential ID generation
      let nextId = "1";
      const lastLocation = await this.getCollection()
        .find({})
        .sort({ location_id: -1 })
        .limit(1)
        .toArray();

      const lastStoredLocation = lastLocation[0];
      if (lastStoredLocation && lastStoredLocation.location_id) {
        const lastId = parseInt(lastStoredLocation.location_id);
        if (!isNaN(lastId)) {
          nextId = (lastId + 1).toString();
        }
      }

      const location: Omit<Location, "_id"> & { _id?: any } = {
        ...createData,
        location_id: nextId, // Use generated ID
        location_animation: createData.location_animation || "DROP",
        isActive: createData.isActive !== undefined ? createData.isActive : true,
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(location as any);
      const id = fromObjectId(result.insertedId);
      
      return {
        ...location,
        _id: id
      } as Location;
    } catch (error) {
      logger.error("Location repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Update Location
   */
  async update(id: string, updateData: UpdateLocationDto): Promise<Location> {
    try {
      const updatePayload = {
        ...updateData,
        updated_at: new Date()
      };

      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        { $set: updatePayload }
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error("Location not found after update");
      }

      return updated;
    } catch (error) {
      logger.error("Location repository update error", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Delete Location
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().deleteOne({ _id: toObjectId(id) as any });
    } catch (error) {
      logger.error("Location repository delete error", { error, id });
      throw error;
    }
  }
}

export const locationRepository = new LocationRepository();
