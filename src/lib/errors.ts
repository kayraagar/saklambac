import { ConvexError } from "convex/values";

/** User-facing message: the backend throws ConvexError with a Turkish string in `data`. */
export function errorMessage(err: unknown, fallback = "Bir şeyler ters gitti. Tekrar dene."): string {
  if (err instanceof ConvexError) {
    const data: unknown = err.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  return fallback;
}
