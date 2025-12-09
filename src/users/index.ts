/**
 * Users Module Exports
 */

// Controllers
export { getAllUsersController } from "./controllers/getAllUsers.controller.js";
export { getUserByIdController } from "./controllers/getUserById.controller.js";
export { createUserController } from "./controllers/createUser.controller.js";
export { updateUserController } from "./controllers/updateUser.controller.js";
export { deleteUserController } from "./controllers/deleteUser.controller.js";

// Services
export { userService } from "./services/user.service.js";

// Routes
export { default as userRoutes } from "./routes/user.routes.js";

