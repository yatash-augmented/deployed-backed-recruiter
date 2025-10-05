
const nodemailer = require('nodemailer');
const verifyEmail = (email, res,otp) => {
    // let randomSixDigit = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    // const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //         user: 'resourcingaugmented@gmail.com',
    //         pass: 'dovb byjw wosh bxuc',
    //     }
    // });

    var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: '587',
        auth: {
            user: "resourcingaugmented@gmail.com",
            pass: "dovb byjw wosh bxuc"
        },
        secureConnection: 'false',
        tls: {
            ciphers: 'SSLv3'
        }
    
    });
        

    // Configure the mailoptions object
    const mailOptions = {
        from: 'resourcingaugmented@gmail.com',
        to: email,
        subject: 'OTP From Smart Talent',
        text: 'Your Email Otp is : ' + otp.toString()
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            // console.log('nodemailer error ', error);
            return res.status(400).json({ success: true, message: 'Unable to process your request at the moment. Please try again later.' });

        } else {
            // console.log('nodemailer error ', info);
            return res.status(200).json({ success: true, message: 'OTP Sent Sucessfully' });

        }
    });
};

module.exports = verifyEmail;
//   export default verifyEmail;