const nodeMailer = require('nodemailer');
const htmlToText = require('html-to-text');
const fs = require("node:fs");



module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.url = url;
    this.from = `${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "prod") {
      // 🚀  Real emails
      return nodeMailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  
    // 🧪  Captured by Mailcatcher
    return nodeMailer.createTransport({
    host: "127.0.0.1",  // Mailcatcher SMTP
    port: 62183,
    secure: false,      // Mailcatcher does not use SSL
    auth: null,         // no username or password
    tls: {
      rejectUnauthorized: false
    }
    });
  }
   
  // Send the actual email
  async send(template, subject) {
    const path = __dirname.replace("/utils", "/data/emailTemplate.html");
      fs.readFile(path, "utf-8", async (error,template)=>{
      
      const html = template.replace("{name}", this.firstName).replace("{url}", this.url);
      // 2) Define email options
     const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.htmlToText(html)
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  
     });
     
  }

  async sendWelcome(template) {
    await this.send(template, 'Welcome to the Natours Family!');
  }

  async sendPasswordReset(template) {
    await this.send(
      template,
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

 

