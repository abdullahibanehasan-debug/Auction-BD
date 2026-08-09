import "dotenv/config";
import { sendVerificationEmail } from "./utils/email.js";

try {
  const result = await sendVerificationEmail({
    email: "abdullahibanehasan@gmail.com",
    name: "Test User",
    token: "test-token-123",
  });

  console.log("EMAIL TEST SUCCESS:", result);
} catch (error) {
  console.error("EMAIL TEST FAILED:", error);
}