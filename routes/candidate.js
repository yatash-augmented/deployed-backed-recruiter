var express = require('express');
var router = express.Router();
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
var con = require('../db_connection')
const verifyEmail = require('../constant/sendotp');
const multer = require('multer')
const CVResult = require('./back_st')
const ffmpeg = require("fluent-ffmpeg");
const { firebase } = require('./firebase')
const fs = require('fs')
const { 
    sequelize,
    Users
  } = require('../db_connection');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, __basedir+'/public/compressed')
    },
    filename: function (req, file, cb) {
        return cb(null, `${Date.now()}-${file.originalname}`)
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})
const upload = multer({ storage: storage })
/* GET home page. */

/* POST candidate Register. */
router.post('/registration', function (req, res, next) {
    var loginsqlquery = `Select * from users where email ='${req.body.email}'`;
    con.query(loginsqlquery,null, function (err, loginresult) {
        if (err) {
            res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
        } else {
            if (loginresult.length == 0) {
                insertcandidate(req, res)
            } else if (loginresult[0].otpstatus == 'false') {

                var deletequery = `DELETE FROM users WHERE email ='${req.body.email}'`
                con.query(deletequery,null, function (err2, deleteresult) {
                    if (err2) {
                        res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
                    } else {
                        insertcandidate(req, res)
                    }
                })
            } else {
                insertcandidate(req, res)
            }
        }
    })


});

/* Insert candidate Function. */

async function insertcandidate(req, res) {
    const transaction = await sequelize.transaction();
    try{
        
        const dataUser = await Users.create({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            mobile: req.body.mobile,
            password: req.body.password,
            otpstatus:req.body.socialLogin ? 'true': 'false',
            firebaseUID: req.body.uid,
            deviceToken: req.body.deviceToken,
            isRecuiter: false,
            isCandidate: true
        })
         
        await transaction.commit();
        console.log("dataUser",dataUser)
         if(req.body.socialLogin){
              res.status(200).json({ success: true, message: 'OTP Sent Sucessfully' });
         }
    else{
    otpsentfunction(req.body.email, res,)
    }
        
    }
    catch(err){
        await transaction.rollback();
        console.log('error',JSON.stringify(err))
        if(err?.original?.errno === 1062){
            res.status(400).json({ success: true, message: 'This email are already registered. Please log in!' });
        }
        else {
            res.status(500).json({ success: false, message: 'Please try again later!' }); 
        }
       
    }
}

/* POST candidate Otp Sent. */
function otpsentfunction(email, res) {
    let otp = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;;
    var sql2 = `INSERT INTO otp_user ( email, otp) VALUES ('${email}', '${otp}')`;
    var deletequery = "DELETE FROM otp_user WHERE email = ?"
    con.query(deletequery, [email], function (err2, deleteresult) {
        if (err2) {
            res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
        } else {
            con.query(sql2,null, async function (err, result) {
                if (err) {
                    res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
                } else {
                    verifyEmail(email, res, otp)
                }
            })
        }
    })

}

/* POST candidate Validate Otp. */
router.post('/validateotp', function (req, res, next) {

    var sql = "Select * from otp_user where email = ?";
    con.query(sql, [req.body.email], function (err, result) {
        // console.log("Result: " + JSON.stringify(result));
        // console.log("Result: " + JSON.stringify(result[0].otp));
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else if (result.length > 0) {
            if (result[0].otp == req.body.otp) {
                var sql2 = "Select * from users where email = ?";
                var sql3 = "UPDATE users SET otpstatus = 'true' WHERE id = ?";
                con.query(sql2, [req.body.email], function (err, result2) {
                    if (err) throw err;
                    if (err) {
                        res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                    } else {
                        if (result2.length > 0) {
                            con.query(sql3, [result2[0].id], function (err, result2) {
                                if (err) {
                                    res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                                } else {
                                    var deletequery = "DELETE FROM otp_user WHERE email = ?"
                                    con.query(deletequery, [req.body.email], function (err2, deleteresult) {
                                        if (err) throw err;
                                        res.status(200).json({ success: true, message: 'OTP Verify Successfully', user: result2 });
                                    })

                                }
                            })
                        } else {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        }
                    }

                });
            } else {
                res.status(400).json({ success: false, message: 'The OTP entered is incorrect. Please check and try again.' });
            }
        } else {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }
    });



});

/* POST Candidate Login. */
router.post('/login', async function (req, res, next) {
    
    // var sql = "Select * from candidate where email = ? and password = ?";
    // con.query(sql, [req.body.email, req.body.password], function (err, result) {
    var sql = "Select * from users where email = ?";
    
    con.query(sql, [req.body.email], async function (err, result) {
        // console.log("Result: " + JSON.stringify(result));
        if (err) throw err;

        if (result.length > 0) {
            if (result[0].password == req.body.password || req.body.isSocialLogin) {
                if (result[0].otpstatus == 'true') {
                    const transaction = await sequelize.transaction();
                    Users.update({isCandidate: true, isRecuiter: false,deviceToken:req.body.deviceToken}, {where: {email: req.body.email}})
                    await transaction.commit();
                    res.json({ success: true, message: 'Login Successfully', user: result });
                } else {
                    res.status(400).json({ success: false, message: 'No account found with the provided details. Please check your email.' });
                }
            } else {
                res.status(400).json({ success: false, message: 'The password you entered is incorrect. Please try again.' });
            }

        } else {
            res.status(400).json({ success: false, message: 'The email you entered is incorrect. Please try again.' });
        }
    });
  


});

/* POST candidate resend OTP. */

router.post('/resendotp', function (req, res, next) {

    var sql = "Select * from users where email = ?";
    con.query(sql, [req.body.email], function (err, result) {
        if (err) throw err;
        // console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
            if (result[0].otpstatus == 'true') {
                otpsentfunction(req.body.email, res)
            } else {
                otpsentfunction(req.body.email, res)
                // res.status(400).json({ success: false, message: 'You are not registerd.' });
            }
        } else {
            res.status(400).json({ success: false, message: 'No account found with this email. Please check and try again.' });
        }
    });

});

/* POST candidate Create new password. */
router.post('/createpassword', function (req, res, next) {

    var sql2 = "Select * from users where email = ?";
    var sql3 = `UPDATE users SET password = "${req.body.password}" WHERE id = ?`;
    con.query(sql2, [req.body.email], function (err, result2) {
        if (err) throw err;
        con.query(sql3, [result2[0].id], function (err, result) {
            if (err) throw err;
            
              
              // Function to update the password
              firebase.auth().updateUser(result2[0].firebaseUID, {
                password: req.body.password,
              })
              .then((userRecord) => {
                console.log('Password updated successfully for user:', userRecord.uid);
              })
              .catch((error) => {
                console.error('Error updating password:', error);
              });
            res.status(200).json({ success: true, message: 'Password Changed Successfully.' });
        })

    });

});

/* POST Create candidate profile. */
router.post('/createprofile', function (req, res, next) {
    // console.log('createprofile : ',req.body);
    var availabledate = JSON.stringify(req.body.availabledate)
    var position = JSON.stringify(req.body.position)
    var sector = JSON.stringify(req.body.sector)
    var location = JSON.stringify(req.body.location)
    var workmode = JSON.stringify(req.body.workmode)
    var selectedskill = JSON.stringify(req.body.selectedskill)
    var experience = JSON.stringify(req.body.experience)
    var degree = JSON.stringify(req.body.degree)

    const sql2 = "Select * from candidatedata where email = ?";
    con.query(sql2, [req.body.email], async function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else {
            if (result.length > 0) {
                if (req.body.stage == 'availability') {
                    const sql3 = `UPDATE candidatedata SET availabledate = '${availabledate}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'search' });
                        }

                    })
                } else if (req.body.stage == 'search') {
                    const sql3 = `UPDATE candidatedata SET selectedDepartment = '${req.body.selectedDepatment}', position = '${position}',sector = '${sector}',location = '${location}',workmode = '${workmode}',stage = '${req.body.stage}', jobtitle = '${req.body.jobtitle}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            // console.log('work mode error : ',err);

                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'skill' });
                        }
                    })
                } else if (req.body.stage == 'skill') {
                    const sql3 = `UPDATE candidatedata SET selectedskill = '${selectedskill}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'updated' });
                        }
                    })
                } else if (req.body.stage == 'experience') {
                    const sql3 = `UPDATE candidatedata SET experience = '${experience}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            console.log(err)
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'updated' });
                        }
                    })
                } else if (req.body.stage == 'degree') {
                    console.log(req.body.stage,'req.body.stage')
                    const sql3 = `UPDATE candidatedata SET degree = '${degree}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], async function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                           
                        } else {
                            const transaction = await sequelize.transaction();
                            CVResult.saveCandidateChatGpt(req.body.email)
                            await transaction.commit()
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'updated' });
                           
                        }
                    })
                } else if (req.body.stage == 'updated') {
                    const sql3 = `UPDATE candidatedata SET availabledate = '${availabledate}', position = '${position}',sector = '${sector}',location = '${location}',workmode = '${workmode}', selectedskill = '${selectedskill}', experience = '${experience}', degree = '${degree}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], async function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            const transaction = await sequelize.transaction();
                            CVResult.saveCandidateChatGpt(req.body.email)
                            await transaction.commit()
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'complete' });
                        }
                    })
                }
            } else {
                // console.log('createprofile :2 ');
                var sql = `INSERT INTO candidatedata (email,availabledate, position, sector, location, workmode, selectedskill, experience, degree, stage ) VALUES ('${req.body.email}','${availabledate}','${position}', '${sector}', '${location}', '${workmode}', '${selectedskill}', '${experience}', '${degree}', '${req.body.stage}')`;
                console.log(sql)
                con.query(sql,null, async function (err, result) {
                    if (err) {

                        res.status(400).json({ success: true, message: err });

                    } else {
                        res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'search' });
                    }

                })
            }
        }
    })




});

/* POST Get candidate profile. */
router.post('/getprofile', function (req, res, next) {
   // CVResult.saveCandidateChatGpt(req.body.email)
   const sql2 = "SELECT candidatedata.*, users.password FROM candidatedata JOIN users ON candidatedata.email = users.email WHERE candidatedata.email = ?";
   // const sql2 = "Select * from candidatedata where email = ?";
    // const sql2 = "Select * from candidatedata where email = ? limit 1";
    con.query(sql2, [req.body.email], function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else {
           // console.log("result",result)
            res.status(200).json({ success: true, message: 'Data get Successfully.', result: result });
        }
    })


});



// Middleware to compress video after upload
const compressVideo = async (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec("libx264") // Use H.264 codec
        .size("640x?") // Resize width to 640px (maintains aspect ratio)
        .outputOptions("-preset fast") // Faster compression
        .outputOptions("-crf 28") // Adjust quality (lower is better, 23-28 is good)
        .on("end", () => {
          console.log("Compression finished:", outputPath);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error("Compression error:", err);
          reject(err);
        })
        .run();
    });
  };

/* POST candidate Dashboard. */
// router.post('/savevideo', upload.single('profileimage'), async (req, res, next) => {
//     console.log('body : ', req.body.email);
//     console.log('file 11: ', req.file.path);
//     const outputPath = __basedir+`/public/uploads${req.file.path.split('compressed')[1]}`;
//     // await compressVideo(req.file.path, outputPath)
//     // console.log(outputPath)
//     // fs.unlinkSync(req.file.path)
//     // const sql3 = `UPDATE candidatedata SET video = '${outputPath.split('uploads')[1]}',stage = 'updated' WHERE email = ?`;
//     // console.log("sql3",sql3)
//     // con.query(sql3, [req.body.email], function (err, result) {
//     //     if (err) {
//     //         res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
//     //     } else {
//     //         res.status(200).json({ success: true, message: 'Video Save Successfully.', stage: 'complete' });
//     //     }
//     // })

//     exec(`ffmpeg -i ${req.file.path} -preset veryslow -vcodec libx264 -crf 35 -b:v 350k -maxrate 350k -bufsize 700k -vf scale=640:-1 -c:a aac -b:a 48k ${outputPath}`, (error, stdout, stderr) => {
//         if (error) {
//           console.error(`FFmpeg error: ${error.message}`);
//           return res.status(500).json({ error: "Video compression failed" });
//         }
//         fs.unlinkSync(req.file.path)
//         const sql3 = `UPDATE candidatedata SET video = '${outputPath.split('uploads')[1]}',stage = 'updated' WHERE email = ?`;
//         console.log("sql3",sql3)
//         con.query(sql3, [req.body.email], function (err, result) {
//             if (err) {
//                 res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
//             } else {
//                 res.status(200).json({ success: true, message: 'Video Save Successfully.', stage: 'complete' });
//             }
//         })
//         //res.json({ message: "Video compressed successfully", output: outputPath });
//       });

// });

router.post('/savevideo', upload.single('profileimage'), (req, res, next) => {
    req.setTimeout(600000); // 10 min
    res.setTimeout(600000);
    next();
  }, (req, res) => {
    const outputPath = __basedir+`/public/uploads${req.file.path.split('compressed')[1]}`;
    exec(`ffmpeg -i ${req.file.path} -preset fast -vcodec libx264 -crf 35 -b:v 350k -maxrate 350k -bufsize 700k -vf scale=640:-1 -c:a aac -b:a 48k ${outputPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          //return res.status(500).json({ error: "Video compression failed" });
        }
        fs.unlinkSync(req.file.path)
       
        //res.json({ message: "Video compressed successfully", output: outputPath });
      });

 const sql3 = `UPDATE candidatedata SET video = '${outputPath.split('uploads')[1]}',stage = 'updated' WHERE email = ?`;
        console.log("sql3",sql3)
        con.query(sql3, [req.body.email], function (err, result) {
            if (err) {
                res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
            } else {
                res.status(200).json({ success: true, message: 'Video Save Successfully.', stage: 'complete' });
            }
        })
  });


/* POST candidate Dashboard. */
router.post('/dashboard', function (req, res, next) {

    var sql = "Select * from users where mobile = ? and password = ?";
    con.query(sql, [req.body.first, req.body.password], function (err, result) {
        if (err) throw err;
        // console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
            res.render('dashboard', { title: 'Express' });
        } else {
            res.render('index', { title: 'Express' });
        }
    });


});

/* POST Get candidate data. */
router.post('/get_Recruiter_CandidateData', function (req, res, next) {

    const sql2 = `Select id, firstname, lastname, mobile, email, firebaseUID, isCandidate, isRecuiter from ${req.body.table} where email = ?`;
    // const sql2 = "Select * from candidatedata where email = ? limit 1";
    con.query(sql2, [req.body.email], function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else {
            res.status(200).json({ success: true, message: 'Data get Successfully.', result: result });
        }
    })


});


module.exports = router;


// var sql2 = "Select * from candidate where email = ?";
// var sql3 = `UPDATE candidate SET password = "${req.body.password}" WHERE id = ?`;
// con.query(sql2, [req.body.email], function (err, result2) {
//     if (err) throw err;
//     con.query(sql3, [result2[0].id], function (err, result) {
//         if (err) throw err;
//         res.status(200).json({ success: true, message: 'Password Changed Successfully.' });
//     })

// });