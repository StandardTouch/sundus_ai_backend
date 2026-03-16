# Locations & Nearest Branch Flow

## Overview

Sundus AI supports branch lookup in two ways:

1. **Text-based search** (city/area/branch name): AI calls the `search_locations` tool with `query`.
2. **Nearest-branch search** (accurate): user shares a WhatsApp **LOCATION pin** → backend sorts **all active branches** by distance and returns nearest-first.

Key goals:
- Never hallucinate addresses, phone numbers, or timings.
- Use **Saudi Arabia time (`Asia/Riyadh`)** for “open now” and “today’s hours”.
- Treat `isClosed` as **authoritative** (even if shifts exist).

---

## Data returned by Locations API

Locations are stored in MongoDB and returned via `GET /api/locations`.

Important fields (examples):
- Branch identity: `location_id`, `_id`
- Titles: `location_title`, `location_title_ara`
- Addresses: `location_address`, `location_address_ara`
- Coordinates: `location_latitude`, `location_longitude`
- Region: `country`, `state`, `city`
- Phones:
  - `store_contact_phone` (branch contact)
  - `store_manager_phone` + `store_manager_name` (manager)
- Timings:
  - `timings[]` with `{ day, shifts[], isClosed }`

---

## Nearest sorting (API)

To get all branches sorted nearest-first:

`GET /api/locations?sort=nearest&lat=<user_lat>&lng=<user_lng>&isActive=true`

Behavior:
- Returns **ALL** matching branches sorted by distance.
- Adds `distance_km` for each branch.
- Adds a `today` object computed in **Asia/Riyadh**:
  - `today_day`
  - `today_status` (`OPEN`/`CLOSED`/`UNKNOWN`)
  - `today_shifts`
  - `open_now`

---

## WhatsApp LOCATION pin webhook flow (nearest)

When a user shares their location pin, AI Sensy sends a webhook with:
- `message_type: "LOCATION"`
- `message_content.latitude / longitude`

Backend handling:
1. `WebhookHandlerService` routes `"LOCATION"` messages to `LocationMessageHandler`.
2. `LocationMessageHandler` calls nearest sorting using the pin coordinates.
3. It sends the results in multiple WhatsApp messages (chunked) to avoid WhatsApp limits:
   - Branch title, city, address
   - **Today’s hours** and **open now**
   - **Both phone numbers** (contact + manager)
   - Google Maps link

---

## AI tool: `search_locations`

Tool name: `search_locations`

Supported inputs:
- `query` (string): city/area/branch name
- OR `user_lat` + `user_lng` (numbers): sort by nearest

Tool output:
- The executor returns **structured JSON** including branch data, phones, and computed `today` fields.

Important:
- For “nearest branch” requests without a city/area, the assistant should ask the user to **share a WhatsApp location pin**.

---

## Implementation pointers

- Tool definition: `src/agent/tools/location.tools.ts`
- Tool executor: `src/agent/executor/location.executor.ts`
- Public API: `src/locations/controllers/getLocations.controller.ts`
- Nearest computations: `src/locations/utils/location-geo.util.ts`
- LOCATION webhook handler: `src/services/webhook/handlers/location-message.handler.ts`

