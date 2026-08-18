import dotenv from "dotenv";
dotenv.config();

import { skuManagementService } from "../src/sku-management/services/sku-management.service.js";

async function runTest() {
  console.log("Testing SKU lookup with single SKU number & Image-first pipeline...");
  try {
    const result = await skuManagementService.lookupSku("RV1L274M0041", "", "");
    console.log("\n=================== SKU LOOKUP SUCCESS ===================");
    console.log("SKU:", result.sku);
    console.log("Brand:", result.brand_name);
    console.log("Model:", result.model_number);
    console.log("Dial Color:", result.dial_color);
    console.log("Case Material:", result.case_material);
    console.log("Images Count:", result.images.length);
    console.log("Images:");
    result.images.forEach((img, i) => {
      console.log(`  ${i + 1}. [${img.label}] (Primary: ${img.isPrimary}) -> ${img.url}`);
    });
    console.log("=========================================================\n");
  } catch (err: any) {
    console.error("ERROR during test:", err);
  }
}

runTest();
