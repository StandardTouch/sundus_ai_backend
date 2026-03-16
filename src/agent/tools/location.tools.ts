/**
 * Location Tool
 * Tool definition for searching branch locations (dynamic).
 */

import type OpenAI from "openai";

export const locationTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_locations",
      description:
        "Search for AlHomaidhi branch locations. Use query for city/state/branch name OR use user coordinates (lat/lng) to sort by nearest. If the user asks for the nearest branch and has not provided a city/area, ask them to share their WhatsApp location pin instead of guessing.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The city, state, or area to search for (e.g., 'Riyadh', 'Jeddah', 'Abu Dhiba').",
          },
          user_lat: {
            type: "number",
            description: "User latitude (from a shared location pin).",
          },
          user_lng: {
            type: "number",
            description: "User longitude (from a shared location pin).",
          },
        },
        anyOf: [{ required: ["query"] }, { required: ["user_lat", "user_lng"] }],
      },
    },
  },
];

