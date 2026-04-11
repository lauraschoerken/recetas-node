import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS =
  process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@recetas.app";
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const SMTP_READY = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export const emailService = {
  async sendHouseholdInvite(params: {
    toEmail: string;
    senderName: string;
    householdName: string;
    token: string;
  }) {
    const { toEmail, senderName, householdName, token } = params;
    const inviteUrl = `${APP_URL}/accept-invite?token=${token}`;

    if (!SMTP_READY) {
      console.warn(
        "[EMAIL] SMTP not configured. Set SMTP_USER and SMTP_PASS to enable invitation emails.",
      );
      return false;
    }

    try {
      await transporter.sendMail({
        from: `"Recetas App" <${FROM_ADDRESS}>`,
        to: toEmail,
        subject: `${senderName} te ha invitado al hogar "${householdName}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem;">
            <h2>Invitación a hogar compartido</h2>
            <p><strong>${senderName}</strong> te ha invitado a unirte al hogar <strong>"${householdName}"</strong> en Recetas App.</p>
            <p>Al unirte, compartirás inventario, lista de compra y alertas con los miembros del hogar.</p>
            <p style="margin: 2rem 0;">
              <a href="${inviteUrl}" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Aceptar invitación
              </a>
            </p>
            <p style="color: #999; font-size: 0.85rem;">
              Si no esperabas esta invitación, puedes ignorar este mensaje.<br/>
              El enlace expira en 7 días.
            </p>
          </div>
        `,
      });
      console.log(`[EMAIL] Invitation sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error("[EMAIL] Failed to send invitation:", error);
      return false;
    }
  },
};
