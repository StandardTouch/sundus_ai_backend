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
      name: "send_location",
      description:
        "Send our location/branch information to the user. Use this when the user asks for: location, address, branch, nearest branch, store location, directions, shop location, service center location, 'where are you located?', 'وين موقعكم؟', 'أقرب فرع', or anything related to finding AlHomaidhi locations. This will trigger sending a WhatsApp template message with the location details in the user's language.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

