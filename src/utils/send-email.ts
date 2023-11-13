import nodemailer from 'nodemailer';
import { resetPasswordEmailTemplate } from './reset-password-email-template.js';
import { activationEmailTemplate } from './activation-email-template.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const message = ({
  email,
  subject,
  token,
  name,
  reset,
  userGroup,
}: {
  email: string;
  subject: string;
  token: string;
  name: string;
  reset: boolean;
  userGroup: string;
}) => {
  const pwdReset = resetPasswordEmailTemplate({
    link: `${process.env.FRONT_END_URL}/change-password?token=${token}`,
    name,
  });

  const accActivation = activationEmailTemplate({
    link: `${process.env.FRONT_END_URL}/set-password?token=${token}`,
    name,
    userGroup,
  });
  return {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    text: 'For clients with plaintext support only',
    html: reset ? pwdReset : accActivation,
    attachments: [
      {
        filename: 'frame-bg.png',
        path: __dirname + '/frame-bg.png',
        cid: 'frame', //same cid value as in the html img src
      },
    ],
  };
};
// const msg = {
//   to: 'alexlim@mmdt.cc', // Change to your recipient
//   from: 'aewnetu21@gmail.com', // Change to your verified sender
//   subject: 'Sending with SendGrid is Fun',
//   text: 'and easy to do anywhere, even with Node.js',
//   html: ' <p>Please follow this <a href="https://user-management-fe-five.vercel.app/set-password?token=${token}">link</a> to set your password.</p>',
// };
// function sendEmail() {
//   sgMail
//     .send(msg)
//     .then(() => {
//       console.log('Email sent');
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// }
const transport = nodemailer.createTransport({
  host:
    process.env.NODE_ENV === 'development'
      ? process.env.EMAIL_HOST_LOCAL
      : process.env.EMAIL_HOST,
  port:
    process.env.NODE_ENV === 'development'
      ? Number(process.env.EMAIL_PORT_LOCAL)
      : Number(process.env.EMAIL_PORT),
  auth: {
    user:
      process.env.NODE_ENV === 'development'
        ? process.env.EMAIL_USER_LOCAL
        : process.env.EMAIL_USER,
    pass:
      process.env.NODE_ENV === 'development'
        ? process.env.EMAIL_PASS_LOCAL
        : process.env.EMAIL_PASS,
  },
});

export { transport, message };
