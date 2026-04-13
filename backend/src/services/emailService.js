import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const FRONTEND_URL    = (process.env.FRONTEND_URL || 'http://localhost:4300').split(',')[0].trim();
const EMAIL_FROM      = process.env.SES_FROM_EMAIL  || process.env.EMAIL_FROM || 'noreply@torneo360.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Torneo360';
const DISABLE_EMAILS  = process.env.DISABLE_EMAILS === 'true';

// ─── Transporte ─────────────────────────────────────────────────────────────
let ses;

if (process.env.EMAIL_PROVIDER === 'ses') {
  ses = new SESv2Client({
    region: process.env.SES_REGION || 'us-east-1',
    credentials: {
      accessKeyId:     process.env.SES_ACCESS_KEY,
      secretAccessKey: process.env.SES_SECRET_KEY,
    },
  });
}

const smtpTransport = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Envio centralizado ──────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (DISABLE_EMAILS) {
    console.log(`[email] DISABLED — to: ${to}, subject: ${subject}`);
    return;
  }

  const from = `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`;

  if (process.env.EMAIL_PROVIDER === 'ses') {
    const command = new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body:    { Html:  { Data: html,    Charset: 'UTF-8' } },
        },
      },
    });
    return ses.send(command);
  }

  return smtpTransport.sendMail({ from, to, subject, html });
};

// ─── Base template ──────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { text-align: center; margin-bottom: 24px; font-size: 24px; font-weight: bold; background: linear-gradient(90deg, #16a34a, #facc15); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { color: #f1f5f9; font-size: 22px; margin: 0 0 16px; }
    p { color: #94a3b8; line-height: 1.6; margin: 8px 0; }
    .btn { display: inline-block; padding: 12px 32px; background: linear-gradient(90deg, #16a34a, #22c55e); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
    .code { background: #0f172a; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px; color: #4ade80; text-align: center; margin: 16px 0; letter-spacing: 2px; }
    .highlight { color: #4ade80; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Torneo360</div>
      ${content}
    </div>
    <div class="footer">
      <p>Torneo360 · Gestion de Torneos de Baby Futbol</p>
    </div>
  </div>
</body>
</html>`;

// ─── Funciones de envio ──────────────────────────────────────────────────────

export const enviarVerificacionEmail = async (usuario, token) => {
  const verifyUrl = `${FRONTEND_URL}/auth/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h1>Verifica tu email</h1>
    <p>Hola <span class="highlight">${usuario.nombre}</span>,</p>
    <p>Gracias por registrarte en Torneo360. Hace click en el boton para verificar tu email:</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Verificar email</a>
    </p>
    <p>O copia este link en tu navegador:</p>
    <div class="code">${verifyUrl}</div>
    <p>Este link expira en 24 horas.</p>
  `);

  return sendEmail({ to: usuario.email, subject: 'Torneo360 - Verifica tu email', html });
};

export const enviarResetPassword = async (usuario, token) => {
  const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h1>Restablecer contrasena</h1>
    <p>Hola <span class="highlight">${usuario.nombre}</span>,</p>
    <p>Recibimos una solicitud para restablecer tu contrasena. Hace click en el boton:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Restablecer contrasena</a>
    </p>
    <p>O copia este link en tu navegador:</p>
    <div class="code">${resetUrl}</div>
    <p>Este link expira en 1 hora. Si no solicitaste esto, ignora este email.</p>
  `);

  return sendEmail({ to: usuario.email, subject: 'Torneo360 - Restablecer contrasena', html });
};

export const enviarNotificacion = async (usuario, titulo, mensaje) => {
  const html = baseTemplate(`
    <h1>${titulo}</h1>
    <p>Hola <span class="highlight">${usuario.nombre}</span>,</p>
    <p>${mensaje}</p>
    <p style="text-align: center;">
      <a href="${FRONTEND_URL}" class="btn">Ir a Torneo360</a>
    </p>
  `);

  return sendEmail({ to: usuario.email, subject: `Torneo360 - ${titulo}`, html });
};
