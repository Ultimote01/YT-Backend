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
    // 🧪  Captured by Mailcatcher
    return nodeMailer.createTransport({
    host: "https://mailcatcher-7ux7.onrender.com",  // Mailcatcher SMTP
    port: 1080,
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

 

