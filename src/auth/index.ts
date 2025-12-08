/**
 * Auth Module Exports
 */

// Controllers
export { loginController } from "./controllers/login.controller.js";
export { meController } from "./controllers/me.controller.js";
export { logoutController } from "./controllers/logout.controller.js";
export { forgotPasswordController } from "./controllers/forgot-password.controller.js";
export { verifyOTPController } from "./controllers/verify-otp.controller.js";
export { resetPasswordController } from "./controllers/reset-password.controller.js";

// Services
export { authService } from "./services/auth.service.js";
export { otpService } from "./services/otp.service.js";
export { passwordResetTokenService } from "./services/password-reset-token.service.js";

// Routes
export { default as authRoutes } from "./routes/auth.routes.js";

