var express = require('express');
var router = express.Router();
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
var con = require('../db_connection')
var CVResult = require('./back_st');
const logging = require('loglevel');
const { firebase } = require('./firebase')
const ffmpeg = require("fluent-ffmpeg");
const fs = require('fs')
const {jwtDecode} = require('jwt-decode')
const { OAuth2Client } = require('google-auth-library');    
const client = new OAuth2Client('162801726700-iiu2m1j8gpbm3l9uhcnrdddqt4i8rrsp.apps.googleusercontent.com');

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: '162801726700-iiu2m1j8gpbm3l9uhcnrdddqt4i8rrsp.apps.googleusercontent.com', // Must match clientId used in your frontend
  });

  const payload = ticket.getPayload();
  const userid = payload['sub']; // Unique Google user ID

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    googleId: userid,
  };
}
const { 
    sequelize,
    ComapnyMater,
    JobMaster,
    Users
  } = require('../db_connection')
const verifyEmail = require('../constant/sendotp');

const multer = require('multer')

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


router.post('/appleLogin', async (req, res) => {
  const { idToken } = req.body;
    
  try {
    const userData = jwtDecode(idToken)
    //const userData = await verifyGoogleToken(idToken);

    var sql = `Select * from users where email = '${userData.email}'`;

    con.query(sql,null, async function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
                if (result[0].otpstatus == 'true') {
                    const transaction = await sequelize.transaction()
                    Users.update({isCandidate: req.body.isCandidate, isRecuiter: req.body.isRecuiter, deviceToken:req.body.deviceToken}, {where: {email: userData.email}})
                    await transaction.commit()
                    res.json({ success: true, message: 'Login Successfully', user: result });
                } else {
                    res.status(400).json({ success: false, message: 'No account found with the provided details. Please check your email.' });
                }
           

        } else {
            res.status(400).json({ success: false, message: "L'adresse e-mail que vous avez saisie n'est pas enregistrée. Veuillez d'abord vous inscrire." });
        }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, message: 'Invalid Apple ID Token' });
  }
});


router.post('/googleLogin', async (req, res) => {
  const { idToken } = req.body;
   console.log(idToken)
  try {
    const userData = await verifyGoogleToken(idToken);

    var sql = `Select * from users where email = '${userData.email}'`;

    con.query(sql,null, async function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
                if (result[0].otpstatus == 'true') {
                    const transaction = await sequelize.transaction()
                    Users.update({isCandidate: req.body.isCandidate, isRecuiter: req.body.isRecuiter, deviceToken:req.body.deviceToken}, {where: {email: userData.email}})
                    await transaction.commit()
                    res.json({ success: true, message: 'Login Successfully', user: result });
                } else {
                    res.status(400).json({ success: false, message: 'No account found with the provided details. Please check your email.' });
                }
           

        } else {
            res.status(400).json({ success: false, message: "L'adresse e-mail que vous avez saisie n'est pas enregistrée. Veuillez d'abord vous inscrire." });
        }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, message: 'Invalid Google ID Token' });
  }
});

/* POST Recuiter Register. */
router.post('/registration', function (req, res, next) {
    var loginsqlquery = `Select * from users where email ='${req.body.email}'`;
    con.query(loginsqlquery,null, function (err, loginresult) {
        if (err) {
            res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
        } else {
            if (loginresult.length == 0) {
                insertrecuiter(req, res)
            } else if (loginresult[0].otpstatus == 'false') {

                var deletequery = `DELETE FROM users WHERE email ='${req.body.email}'`
                con.query(deletequery,null, function (err2, deleteresult) {
                    if (err2) {
                        // console.log(err2);
                        
                        res.status(400).json({ success: true, message: 'An unexpected error occurred. Please try again later..' });
                    } else {
                        insertrecuiter(req, res)
                    }
                })
            }
            else {
                insertrecuiter(req, res)
            }
        }
    })


});

/* Insert Recuiter Function. */
async function insertrecuiter(req, res) {
    try{
    const transaction = await sequelize.transaction();
    const dataUser = await Users.create({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        mobile: req.body.mobile,
        password: req.body.password,
        otpstatus:req.body.socialLogin ? 'true': 'false',
        firebaseUID: req.body.uid,
        deviceToken: req.body.deviceToken,
        isRecuiter: true,
        isCandidate: false,
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
    console.log('error',JSON.stringify(err))
    if(err.original.errno === 1062){
        res.status(400).json({ success: true, message: 'This email are already registered. Please log in!' });
    }
    else {
        res.status(500).json({ success: false, message: 'Please try again later!' }); 
    }
   
}
}

/* POST Recuiter Otp Sent. */
function otpsentfunction(email, res) {
    let otp = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    var sql2 = `INSERT INTO otp_user ( email, otp) VALUES ('${email}', '${otp}')`;
    var deletequery = `DELETE FROM otp_user WHERE email = '${email}'`
    con.query(deletequery,null, function (err2, deleteresult) {
        if (err2) {
            // console.log(err2);
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

/* POST Recuiter Validate Otp. */
router.post('/validateotp', function (req, res, next) {

    var sql = `Select * from otp_user where email = '${req.body.email}'`;
    console.log('sql',sql)
    con.query(sql,null, function (err, result) {
        console.log("Result: " + JSON.stringify(result));
        //console.log("Result1: " + result[0].otp);
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else if (result.length > 0) {
            if (result[0].otp == req.body.otp) {
                var sql2 = `Select * from users where email = '${req.body.email}'`;
                var sql3 = `UPDATE users SET otpstatus = 'true' WHERE email = '${req.body.email}'`;
                con.query(sql2,null, function (err, result2) {
                    if (err) {
                        res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                    } else {
                        if (result2.length > 0) {
                            con.query(sql3,null, function (err, result2) {
                                if (err) {
                                    res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                                } else {
                                    var deletequery = `DELETE FROM otp_user WHERE email = '${req.body.email}'`
                                    con.query(deletequery,null, function (err2, deleteresult) {
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

router.post('/updateFirebaseUId', function (req, res, next) {
    var sql = `UPDATE users SET deviceToken = '${req.body.deviceToken}' WHERE email = '${req.body.email}'`

    con.query(sql,null, function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
        res.json({ success: true, message: 'Update firebase UID', user: result });
    });

})

/* POST Recuiter Login. */
router.post('/login', function (req, res, next) {

    // var sql = "Select * from recuiter where email = ? and password = ?";
    // con.execute(sql, [req.body.email, req.body.password], function (err, result) {
    var sql = `Select * from users where email = '${req.body.email}'`;
   
    con.query(sql,null, async function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
            if (result[0].password == req.body.password || req.body.isSocialLogin) {
                if (result[0].otpstatus == 'true') {
                    const transaction = await sequelize.transaction()
                    Users.update({isCandidate: false, isRecuiter: true,deviceToken:req.body.deviceToken}, {where: {email: req.body.email}})
                    await transaction.commit()
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

/* POST Recuiter resend OTP. */
router.post('/resendotp', function (req, res, next) {

    var sql = `Select * from users where email = '${req.body.email}'`;
    con.query(sql,null, function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
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

/* POST Recuiter Create new password. */
router.post('/createpassword', function (req, res, next) {

    var sql2 = `Select * from users where email = '${req.body.email}'`;
   
    con.query(sql2,null, function (err, result2) {
        var sql3 = `UPDATE users SET password = '${req.body.password}' WHERE id = '${result2[0].id}'`;
        if (err) throw err;
        con.query(sql3,null, function (err, result) {
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
    var companyinfo = JSON.stringify(req.body.companyinfo)
    var jobdetail = JSON.stringify(req.body.jobdetail)
    console.log("req.body.stage",req.body.stage)
    const sql2 = "Select * from recuiterdata where email = ?";
    con.query(sql2, [req.body.email], async function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else {
            if (result.length > 0) {
                if (req.body.stage == 'companyinfo') {
                    const transaction = await sequelize.transaction()
                    const saveMasterData = await saveCompanyMaster(companyinfo, req.body.email)
                    await transaction.commit()
                    const sql3 = `UPDATE recuiterdata SET companyinfo = '${saveMasterData?.dataValues?.id}',companyLogo = '${req.body.companyLogo}' ,stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                          
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'jobdetail' });
                        }

                    })
                } else if (req.body.stage == 'jobdetail') {
                    const transaction = await sequelize.transaction()
                    const saveJobMasterData = await saveJobMaster(jobdetail, req.body.email, req.body.id)
                    await transaction.commit()
                    const transaction1 = await sequelize.transaction();
            const allJobPosted = await JobMaster.findAll({where: {companyEmail: req.body.email}})
            await transaction1.commit()
                    const sql3 = `UPDATE recuiterdata SET stage = '${req.body.stage}', id = (SELECT @LastUpdateID := id) WHERE email = '${req.body.email}';
                    `;
                    con.query(sql3, null, function (err, result) {
                        if (err) {
                            // console.log('work mode error : ',err);

                            res.status(400).json({ success: false, message: err });
                        } else {
                          
                            CVResult.getJobPostProfile(req.body.email)
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'updated', jobMasterId: saveJobMasterData?.dataValues?.id, allPostedJob:allJobPosted });
                        }
                    })
                } else if (req.body.stage == 'updated') {
                   // const saveMasterData = await saveCompanyMaster(companyinfo)
                   const transaction = await sequelize.transaction()
                    const saveJobMasterData = await saveJobMaster(jobdetail, req.body.email, req.body.id)
                    await transaction.commit()
                    const sql3 = `UPDATE recuiterdata SET  jobdetail = '${jobdetail}',stage = '${req.body.stage}' WHERE email = ?`;
                    con.query(sql3, [req.body.email], function (err, result) {
                        if (err) {
                            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
                        } else {
                            CVResult.getJobPostProfile(req.body.email)
                            res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'updated', jobMasterId: saveJobMasterData?.dataValues?.id });
                        }
                    })
                }
            } else {
                // console.log('createprofile :2 ');
                const saveMasterData = await saveCompanyMaster(companyinfo, req.body.email)
                const saveJobMasterData = await saveJobMaster(jobdetail, req.body.email, req.body.id)
                var sql = `INSERT INTO recuiterdata (email,companyinfo, jobdetail, stage ) VALUES ('${req.body.email}','${saveMasterData.dataValues.id}','${jobdetail}', '${req.body.stage}')`;

                con.query(sql,null, async function (err, result) {
                    if (err) {

                        res.status(400).json({ success: true, message: 'This email are already registered. Please log in.' });

                    } else {
                        res.status(200).json({ success: true, message: 'Data Saved Successfully.', stage: 'jobdetail', jobMasterId: saveJobMasterData?.dataValues?.id });
                    }

                })
            }
        }
    })
});

/* POST Get candidate profile. */
router.post('/getprofile', function (req, res, next) {
    
   // CVResult.getJobPostProfile(req.body.email)
    const sql2 = "SELECT recuiterdata.*, users.password FROM recuiterdata JOIN users ON recuiterdata.email = users.email WHERE recuiterdata.email = ?";
    // const sql2 = "Select * from candidatedata where email = ? limit 1";
    con.query(sql2, [req.body.email], async function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        } else {
            console.log("getprofile",result)
            if(result.length>0){
            const transaction = await sequelize.transaction();
            const allJobPosted = await JobMaster.findAll({where: {companyEmail: req.body.email}})
            await transaction.commit()
            const transaction1 = await sequelize.transaction();
            const companyMaster = await ComapnyMater.findAll({where: {id: result[0].companyinfo}})
            await transaction1.commit()
            res.status(200).json({ success: true, message: 'Data get Successfully.', result: result, allPostedJob: allJobPosted, companyDetails: companyMaster});
            }
            else{
                res.status(200).json({ success: true, message: 'Data get Successfully.', result: []});  
            }
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

  
  router.post('/savevideo1',async(req, res, next) => {
      const urlOut = __basedir+'/public/uploads/'
  const urlIn = __basedir+'/public/compressed/'
   const {video} = req.body
   for(let i = 0; i<video.length; i++){
    compressVideo(urlIn+video[i], urlOut+video[i])
   }
    
    res.status(200).json({ success: true, message: 'err' }); 
})

router.post('/SkipvideoRecording', async(req, res, next) => {
    const sql3 = `UPDATE recuiterdata SET stage = 'updated' WHERE email = ?`;
    con.query(sql3, [req.body.email], function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: err });
        } else {
            res.status(200).json({ success: true, message: 'Video Save Successfully.', stage: 'updated' });
        }
    })
})

  /* POST candidate Dashboard. */
router.post('/savevideo', upload.single('profileimage'), async(req, res, next) => {
    const outputPath = __basedir+`/public/uploads${req.file.path.split('compressed')[1]}`;
   //await compressVideo(req.file.path, outputPath)
   exec(`ffmpeg -i ${req.file.path} -preset fast -vcodec libx264 -crf 35 -b:v 350k -maxrate 350k -bufsize 700k -vf scale=640:-1 -c:a aac -b:a 48k ${outputPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`FFmpeg error: ${error.message}`);
      //return res.status(500).json({ error: "Video compression failed" });
    }
    fs.unlinkSync(req.file.path)
   
    //res.json({ message: "Video compressed successfully", output: outputPath });
  });
      if(req.body.jobMasterId){
   await JobMaster.update({jobVideoURl: outputPath.split('uploads')[1]},{where: {id: req.body.jobMasterId}})
   }
   else{
    await JobMaster.update({jobVideoURl: outputPath.split('uploads')[1]},{where: {companyEmail: req.body.email}})
   }
  
const sql3 = `UPDATE recuiterdata SET stage = 'updated' WHERE email = ?`;
    con.query(sql3, [req.body.email], function (err, result) {
        if (err) {
            res.status(400).json({ success: false, message: err });
        } else {
            res.status(200).json({ success: true, message: 'Video Save Successfully.', stage: 'updated' });
        }
    })
});





/* POST Recuiter Dashboard. */
router.post('/dashboard', function (req, res, next) {

    var sql = `Select * from users where mobile = '${req.body.first}' and password = '${req.body.password}'`;
    con.query(sql,null, function (err, result) {
        if (err) throw err;
        console.log("Result: " + JSON.stringify(result));
        if (result.length > 0) {
            res.render('dashboard', { title: 'Express' });
        } else {
            res.render('index', { title: 'Express' });
        }
    });


});

const saveCompanyMaster = async (companyInfo, email) => {
    const transaction = await sequelize.transaction();
    try {
        const data = JSON.parse(companyInfo);
        const existingCompany = await ComapnyMater.findOne({
            where: { companyEmail: email },
            transaction
        });
        let returnData;
        if (existingCompany) {
            // Update the existing record
            await existingCompany.update({
                companyName: data.companyName,
                companyNumber: data.phoneNumber || null,
                compayEmployeeCount: data.companySize,
                companyDescription: data.description,
                companyServiceType: data.sectors,
                companyWebsite: data.website,
                companyVideoURl: data.companyLogo,
                siren: data.siren,
                companyAddress: data.companyAddress || null
            }, { transaction });
    
            returnData = existingCompany;
        } else {
         returnData = await ComapnyMater.create({
            "companyName":data.companyName,
            "companyNumber":data.phoneNumber || null,
            "compayEmployeeCount":data.companySize,
            "companyDescription":data.description,
            "companyServiceType":data.sectors,
            "companyWebsite": data.website,
            "companyVideoURl":data.companyLogo,
            "siren": data.siren,
            "companyAddress":data.companyAddress || null,
            "companyEmail": email}, { transaction });
         }  
         await transaction.commit();
        return returnData
    }
    catch(error){
        await transaction.rollback()
logging.error(`Error saving company data to database: ${error}`);
    }
}

const saveJobMaster = async (jobRequirment, companyId, jobId) => {
    const transaction = await sequelize.transaction();
    try {
        const data = JSON.parse(jobRequirment);
        console.log('data...', data);

        if (!data.category) {
            return;
        }

        let returnData;

        if (jobId) {
            // Check if a job with the given ID exists
            const existingJob = await JobMaster.findOne({
                where: { id: jobId },
                transaction
            });

            if (existingJob) {
                // Update the existing job
                await existingJob.update({
                    category: data.category,
                    experience: data.experience,
                    location: data.location,
                    salary: data.salary,
                    employmentType: data.employmentType.toString(),
                    requiredSkills: data.requiredSkills.toString(),
                    selectedDepartment: data.selectedDepatment,
                    recommendedSkills: data.recommendedSkills.toString(),
                    jobName: data.jobName || null,
                    jobDescription: jobRequirment || null,
                    jobVideoURl: data.jobVideoURl || null,
                    jobLocationAddress: data.jobLocationAddress || null,
                    companyEmail: companyId
                }, { transaction });

                returnData = existingJob;
            } else {
                // No existing job found, create a new one
                returnData = await JobMaster.create({
                    category: data.category,
                    experience: data.experience,
                    location: data.location,
                    salary: data.salary,
                    employmentType: data.employmentType.toString(),
                    requiredSkills: data.requiredSkills.toString(),
                    selectedDepartment: data.selectedDepatment,
                    recommendedSkills: data.recommendedSkills.toString(),
                    jobName: data.jobName || null,
                    jobDescription: jobRequirment || null,
                    jobVideoURl: data.jobVideoURl || null,
                    jobLocationAddress: data.jobLocationAddress || null,
                    companyEmail: companyId
                }, { transaction });
            }
        } else {
            // If no jobId is provided, create a new job
            returnData = await JobMaster.create({
                category: data.category,
                experience: data.experience,
                location: data.location,
                salary: data.salary,
                employmentType: data.employmentType.toString(),
                requiredSkills: data.requiredSkills.toString(),
                recommendedSkills: data.recommendedSkills.toString(),
                jobName: data.jobName || null,
                jobDescription: jobRequirment || null,
                jobVideoURl: data.jobVideoURl || null,
                jobLocationAddress: data.jobLocationAddress || null,
                companyEmail: companyId
            }, { transaction });
        }

        await transaction.commit();
        return returnData;

    } catch (error) {
        await transaction.rollback();
        logging.error(`Error saving job data to database: ${error}`);
    }
}

router.post('/saveRecuiterJobs', async(req, res) => {
  try {
    const data  = JSON.parse(req.body.jobdetail)
    if(!data.category){
        res.status(400).json({ success: false, message: 'No data avaible for save' });
    }
    await saveJobMaster(req.body.jobdetail, req.body.email)
    res.status(200).json({message: 'Job Saved Sucessfully'});
  } catch (error) {
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});


module.exports = router;
