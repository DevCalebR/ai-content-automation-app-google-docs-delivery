import nodemailer from "nodemailer";
import { env } from "@/lib/env";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl?: string;
};

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD);
}

export async function sendTransactionalEmail(input: MailInput) {
  if (hasSmtpConfig()) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === "true",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM ?? "AI Content Automation <no-reply@local.invalid>",
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return;
  }

  if (env.NODE_ENV !== "production" && input.previewUrl) {
    console.info("[email-preview]", {
      kind: input.subject,
      to: input.to,
      actionUrl: input.previewUrl,
    });
    return;
  }

  throw new Error("Transactional email is not configured.");
}
