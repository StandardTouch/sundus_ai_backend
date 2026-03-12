/**
 * resetOpenAICreditStatus Controller
 * Marks OpenAI credits as available
 */

import { openaiCreditService } from "../../services/openai-credit.service.js";
import { logger } from "../../utils/logger.js";

export const resetOpenAICreditStatusController = async (req: any, res: any) => {
  try {
    const userId = req.user?._id;

    await openaiCreditService.markCreditsAvailable();

    logger.info("OpenAI credits status reset manually", {
      updatedBy: userId
    });

    return res.status(200).json({
      success: true,
      message: "OpenAI credits status has been reset to available."
    });
  } catch (error: any) {
    logger.error("Error resetting OpenAI credit status", {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      message: "Failed to reset OpenAI credit status."
    });
  }
};
