const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "gr25816@gmail.com",
            pass: "vxpf tsbw telr cepb"
        },
    });

    const mailOptions = {
        from: "gr25816@gmail.com",
        to,
        subject,
        text,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
