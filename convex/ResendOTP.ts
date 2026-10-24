import { Email } from "@convex-dev/auth/providers/Email";

/** 6-digit numeric code from a CSPRNG (rejection sampling, no modulo bias). */
function sixDigitCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return String(buf[0] % 1_000_000).padStart(6, "0");
  }
}

/**
 * Email OTP provider. Client usage:
 *   signIn("resend-otp", { email })          → sends the code
 *   signIn("resend-otp", { email, code })    → verifies it
 * Sends through Resend when AUTH_RESEND_KEY is set; otherwise logs the code.
 */
export const ResendOTP = Email({
  id: "resend-otp",
  maxAge: 15 * 60, // seconds
  async generateVerificationToken() {
    return sixDigitCode();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.log(`[Saklambaç] Giriş kodu ${email}: ${token}`);
      return;
    }
    const from = process.env.AUTH_EMAIL_FROM ?? "Saklambaç <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Saklambaç giriş kodun: ${token}`,
        text: `Saklambaç giriş kodun: ${token}\n\nKod 15 dakika geçerli. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`,
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      throw new Error("Doğrulama e-postası gönderilemedi.");
    }
  },
});
