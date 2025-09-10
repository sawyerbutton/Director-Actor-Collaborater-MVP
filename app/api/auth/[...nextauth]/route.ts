// TODO: RESTORE FOR PRODUCTION - Rate limiting temporarily disabled for local testing
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// TODO: UNCOMMENT FOR PRODUCTION - Original with rate limiting:
// import { GET, POST } from "./route-with-rate-limit";
// export { GET, POST };