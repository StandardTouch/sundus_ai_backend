/**
 * Locations Module Exports
 */

// Controllers
export { getLocationsController } from "./controllers/getLocations.controller.js";
export { getLocationByIdController } from "./controllers/getLocationById.controller.js";
export { createLocationController } from "./controllers/createLocation.controller.js";
export { updateLocationController } from "./controllers/updateLocation.controller.js";
export { deleteLocationController } from "./controllers/deleteLocation.controller.js";

// Services
export { locationService } from "./services/location.service.js";

// Routes
export { default as locationRoutes } from "./routes/location.routes.js";
