// This is a modification of the default NextAuth sendVerificationRequest function to use
// Resend for sending customized "magic link" emails instead of the default ones.

import type { EmailProviderSendVerificationRequestParams } from "next-auth/providers/email"
import { RESEND_COOLDOWN_MS } from "@/lib/constants"
import { prisma } from "@/lib/prisma"

type AuthTheme = EmailProviderSendVerificationRequestParams["theme"]

export async function sendVerificationRequestCustom(
  params: EmailProviderSendVerificationRequestParams,
) {
  const { identifier, provider, url, theme } = params
  const to = identifier.trim().toLowerCase()
  const now = new Date()
  const cooldownCutoff = new Date(now.getTime() - RESEND_COOLDOWN_MS)

  const claimed = await prisma.$executeRaw`
    INSERT INTO "MagicLinkRateLimit" ("identifier", "lastSentAt")
    VALUES (${to}, ${now})
    ON CONFLICT ("identifier") DO UPDATE
    SET "lastSentAt" = EXCLUDED."lastSentAt"
    WHERE "MagicLinkRateLimit"."lastSentAt" <= ${cooldownCutoff}
  `

  if (claimed === 0) {
    throw new Error("Please wait before requesting another sign-in link.")
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: `Sign in to LoganLifts`,
      html: html({ url, theme }),
      text: text({ url }),
    }),
  })

  if (!res.ok)
    throw new Error("Resend error: " + JSON.stringify(await res.json()))
}

function html(params: { url: string; theme: AuthTheme }) {

  const { url, theme } = params
  const brandColor = theme.brandColor;
  const logo = theme.logo
    ? `<img src="${theme.logo}" alt="LoganLifts" width="180" />`
    : ""

  const color = {
    background: "#ffffff",          // white
    text: "#000000",                // black
    mainBackground: "#a6a09b",      // stone-400 (tailwinds color palette)
    buttonBackground: brandColor,   // orange-500 (tailwinds color palette)
    buttonBorder: brandColor,       // orange-500 (tailwinds color palette)
    buttonText: theme.buttonText,   // black
  }

  return `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>

    <tr>
      <td align="center" style="padding: 20px 0;">
        ${logo}
      </td>
    </tr>

      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Sign in to <strong>LoganLifts</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`
}

// Email Text body (fallback for email clients that don't render HTML, e.g. feature phones)
function text({ url }: { url: string; }) {
  return `Sign in to LoganLifts\n${url}\n\n`
}