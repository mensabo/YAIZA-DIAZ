const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

admin.initializeApp();

const GMAIL_EMAIL = "mensabo78@gmail.com";
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

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

  const mailOptions = {
    from: `"${data.name}" <${GMAIL_EMAIL}>`,
    to: "yaizadiaztv@gmail.com",
    replyTo: data.email,
    subject: `Nuevo mensaje web: ${data.subject}`,
    html: `
      <h1>Nuevo Mensaje de yaizadiaz.com</h1>
      <p><strong>De:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Asunto:</strong> ${data.subject}</p>
      <hr>
      <h3>Mensaje:</h3>
      <p style="font-size: 1.1em; white-space: pre-wrap;">${data.message}</p>
      <hr>
      ${
        data.attachment
          ? `<p><strong>Archivo Adjunto:</strong> <a href="${data.attachment}">Descargar ${data.attachmentName}</a></p>`
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
