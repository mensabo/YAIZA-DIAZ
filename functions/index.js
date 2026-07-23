const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { Readable } = require("node:stream");

admin.initializeApp();

const GMAIL_EMAIL = "mensabo78@gmail.com";
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

// Prefijo real del bucket de Storage de este proyecto (ver storageBucket en
// config.js) -- imgCache SOLO reenvia URLs que empiecen exactamente por
// esto. Sin esta restriccion, cualquiera podria usar la funcion como proxy
// anonimo gratuito hacia CUALQUIER URL de internet (abuso de la cuota de
// Cloud Functions ajeno al problema que esto intenta resolver).
const STORAGE_URL_PREFIX =
  "https://firebasestorage.googleapis.com/v0/b/yaiza-diaz.firebasestorage.app/o/";

// Cache de imagenes/videos de Storage detras de la CDN de Firebase Hosting
// (ver rewrite "/img-cache" en firebase.json). Motivo: las paginas publicas
// pintan <img src> directo a firebasestorage.googleapis.com -- una peticion
// HTTP normal del navegador no puede llevar token de App Check (por eso no
// se puede proteger Storage con App Check sin romper esas imagenes), y cada
// peticion de cada visitante distinto cuenta contra la cuota de bajada
// gratuita de Storage (100GB/mes). Con este proxy, la CDN compartida de
// Hosting responde las peticiones repetidas de la MISMA imagen sin volver a
// tocar Storage -- mitiga un pico de coste por peticiones masivas (scraping,
// bot hotlinking) sin depender de autenticacion.
exports.imgCache = onRequest({ cors: true }, async (req, res) => {
  const src = req.query.u;
  if (typeof src !== "string" || !src.startsWith(STORAGE_URL_PREFIX)) {
    res.status(400).send("URL invalida");
    return;
  }
  let upstream;
  try {
    upstream = await fetch(src);
  } catch (e) {
    functions.logger.error("imgCache: error de red pidiendo el original:", e);
    res.status(502).send("Error al obtener el recurso");
    return;
  }
  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status || 502).send("Error al obtener el recurso");
    return;
  }
  res.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) res.set("Content-Length", contentLength);
  // s-maxage es lo que respeta la CDN de Hosting (cache compartida entre
  // TODOS los visitantes); max-age es para la cache del propio navegador.
  // stale-while-revalidate evita que el primer visitante tras expirar la
  // cache tenga que esperar a un refresco sincrono.
  res.set(
    "Cache-Control",
    "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400"
  );
  Readable.fromWeb(upstream.body).pipe(res);
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

// Quita saltos de linea de un valor antes de usarlo en una cabecera de
// correo (From/Reply-To): el formulario de contacto es publico (cualquiera
// puede escribir en contactMessages), asi que un valor con \r\n podria
// intentar inyectar cabeceras SMTP adicionales.
function stripNewlines(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

exports.sendContactEmail = onDocumentCreated(
  { document: "contactMessages/{messageId}", secrets: [GMAIL_APP_PASSWORD] },
  (event) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_APP_PASSWORD.value(),
    },
  });

  const data = event.data.data();
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const subject = escapeHtml(data.subject);
  const message = escapeHtml(data.message);
  const attachmentName = escapeHtml(data.attachmentName);

  const mailOptions = {
    from: `"${stripNewlines(data.name)}" <${GMAIL_EMAIL}>`,
    to: "yaizadiaztv@gmail.com",
    replyTo: stripNewlines(data.email),
    subject: `Nuevo mensaje web: ${stripNewlines(data.subject)}`,
    html: `
      <h1>Nuevo Mensaje de yaizadiaz.com</h1>
      <p><strong>De:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Asunto:</strong> ${subject}</p>
      <hr>
      <h3>Mensaje:</h3>
      <p style="font-size: 1.1em; white-space: pre-wrap;">${message}</p>
      <hr>
      ${
        data.attachment
          ? `<p><strong>Archivo Adjunto:</strong> <a href="${escapeHtml(data.attachment)}">Descargar ${attachmentName}</a></p>`
          : "<p><em>No se adjuntó ningún archivo.</em></p>"
      }
      <br>
      <p style="font-size: 0.8em; color: #777;">
        Este correo fue enviado automáticamente desde el formulario de contacto de tu web.
      </p>
    `,
  };

  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      functions.logger.error("Error al enviar email:", error);
      return;
    }
    functions.logger.info("Email enviado con éxito:", info.response);
  });
});
