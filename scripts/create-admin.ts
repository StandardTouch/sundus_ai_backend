#!/usr/bin/env tsx

/**
 * Create Admin User Script
 * 
 * Usage:
 *   Direct: ./scripts/create-admin.ts
 *   Or:     npx tsx scripts/create-admin.ts
 *   Or:     npm run create-admin
 * 
 * Creates an admin user with the following credentials:
 * - Email: info@alhomaidhigroup.com
 * - Password: 123QweAsdZxc098@
 * - Username: admin (or info@alhomaidhigroup.com)
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { userRepository } from "../src/repositories/user.repository.js";
import bcrypt from "bcrypt";
import { logger } from "../src/utils/logger.js";

dotenv.config();

const ADMIN_EMAIL = "info@alhomaidhigroup.com";
const ADMIN_PASSWORD = "**********";
const ADMIN_USERNAME = "info@alhomaidhigroup.com";
const ADMIN_FULL_NAME = "Admin User";

const BCRYPT_ROUNDS = 10;

async function createAdmin() {
  try {
    logger.info("Starting admin user creation...");

    // Connect to database
    await connectDatabase();
    logger.info("Connected to database");

    // Check if admin already exists
    const existingUser = await userRepository.findByEmail(ADMIN_EMAIL);
    if (existingUser) {
      logger.warn("Admin user already exists", {
        email: ADMIN_EMAIL,
        username: existingUser.username,
        role: existingUser.role
      });
      console.log("\n❌ Admin user already exists!");
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      await closeDatabase();
      process.exit(0);
    }

    // Check if username already exists
    const existingUsername = await userRepository.findByUsername(ADMIN_USERNAME);
    if (existingUsername) {
      logger.warn("Username already exists", { username: ADMIN_USERNAME });
      console.log("\n❌ Username already exists!");
      console.log(`   Please choose a different username or delete the existing user.`);
      await closeDatabase();
      process.exit(1);
    }

    // Hash password
    logger.info("Hashing password...");
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    // Create admin user
    logger.info("Creating admin user...");
    const adminUser = await userRepository.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // Required by CreateUserDto type
      password_hash, // Actual hashed password for storage
      full_name: ADMIN_FULL_NAME,
      role: "admin",
      is_active: true
    });

    logger.info("Admin user created successfully", {
      id: adminUser._id,
      username: adminUser.username,
      email: adminUser.email
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Credentials:");
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Active: ${adminUser.is_active}`);
    console.log(`\n⚠️  Please change the password after first login!\n`);

    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error("Error creating admin user", { error });
    console.error("\n❌ Error creating admin user:");
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run the script
createAdmin();

