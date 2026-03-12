/**
 * Location Tool
 * Tool definition for sending location/branch templates
 *
 * IMPORTANT:
 * - This tool does NOT return dynamic data.
 * - When called, the backend will send a pre-approved WhatsApp template:
 *   - Arabic:  location_ar
 *   - English: location_en
 * - No variables/components are passed to the template.
 */

import type OpenAI from "openai";

export const locationTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_locations",
      description:
        "Search for AlHomaidhi branch locations by city, state, or branch name. Use this when the user asks for: location, address, branch, nearest branch, or directions. If the user hasn't specified a city or state, ask them first before calling this tool.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The city, state, or area to search for (e.g., 'Riyadh', 'Jeddah', 'Abu Dhiba').",
          },
        },
        required: ["query"],
      },
    },
  },
];

