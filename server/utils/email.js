import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "AuctionBD <onboarding@resend.dev>";

export async function sendVerificationEmail({
  email,
  name,
  token,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const verifyUrl =
    `${CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const safeName = escapeHtml(name || "there");

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your AuctionBD account",

    text: `Hello ${name || "there"},

Welcome to AuctionBD.

Please verify your email address by opening this link:

${verifyUrl}

This verification link expires in 24 hours.

If you did not create an AuctionBD account, you can ignore this email.

AuctionBD`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Verify your AuctionBD account</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f7fb;
  font-family:Arial,Helvetica,sans-serif;
">

  <div style="
    max-width:600px;
    margin:40px auto;
    padding:20px;
  ">

    <div style="
      background:#ffffff;
      border-radius:12px;
      padding:35px;
      border:1px solid #e5e7eb;
    ">

      <h1 style="
        margin:0 0 20px;
        color:#111827;
        font-size:26px;
      ">
        Welcome to AuctionBD
      </h1>

      <p style="
        color:#374151;
        font-size:16px;
        line-height:1.6;
      ">
        Hello ${safeName},
      </p>

      <p style="
        color:#374151;
        font-size:16px;
        line-height:1.6;
      ">
        Thanks for creating your AuctionBD account.
        Please verify your email address to activate
        your account.
      </p>

      <div style="
        text-align:center;
        margin:30px 0;
      ">

        <a
          href="${verifyUrl}"
          style="
            display:inline-block;
            background:#f97316;
            color:#ffffff;
            padding:14px 25px;
            border-radius:8px;
            text-decoration:none;
            font-size:16px;
            font-weight:bold;
          "
        >
          Verify My Email
        </a>

      </div>

      <p style="
        color:#6b7280;
        font-size:14px;
        line-height:1.6;
      ">
        This verification link expires in
        <strong>24 hours</strong>.
      </p>

      <p style="
        color:#9ca3af;
        font-size:13px;
        line-height:1.6;
      ">
        If you did not create an AuctionBD account,
        you can safely ignore this email.
      </p>

      <hr style="
        border:none;
        border-top:1px solid #e5e7eb;
        margin:30px 0;
      ">

      <p style="
        color:#9ca3af;
        font-size:12px;
        margin:0;
      ">
        AuctionBD
      </p>

    </div>

  </div>

</body>
</html>
`,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(
      error.message || "Failed to send verification email."
    );
  }

  console.log("Verification email sent:", data?.id);

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}