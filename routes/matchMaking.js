var express = require('express');
var router = express.Router();

const { firebase } = require('./firebase')
const nodemailer = require('nodemailer');
const {
    sequelize,
    MatchedData,
    Users,
    JobMaster,
    ComapnyMater,
    CandidateData
} = require('../db_connection')

const sendNotification = async(uId,token, notificationHeader, notificationMasg,data)=>{
     const uid_tokens = {}
     if(token){
        uid_tokens.token = token
        
     }
     else {
        uid_tokens.topic = uId
     }
    const message = {
        notification: {
            title: notificationHeader,
            body: notificationMasg,
        },
  data: data,
        //topic: uId, // Specify the topic name
        ...uid_tokens
    };
//console.log(message)

    const response = await firebase.messaging().send(message);
    console.log("response",response)
}

router.post('/sendNotification', async function (req, res, next) {
    try {
        const { uId, notificationHeader, text } = req.body
       // const users = await Users.findOne({ where: { email: userEmail } })
        // if (!users?.firebaseUID) {
        //     res.status(400).json({ success: false, masg: 'User Firebase UID not available' });
        // }
      //  console.log('users.firebaseUID', users)
      await sendNotification(uId,null, notificationHeader, text,{} )
        console.log('Notification sent successfully:', response);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(400).json({ success: false });
    }
})

router.post('/closeChat', async function (req, res, next) {
    const { recruiterEmail, candidateEmail, role } = req.body
     if (!recruiterEmail || !candidateEmail ) {
        res.status(400).json({ success: false, message: 'Please add all required data..' });
        return
    }
      try {
        
        const transaction = await sequelize.transaction();
            const matchedData = await MatchedData.update({ end_chat: true },
        { where: { 
            recruiterEmail: recruiterEmail,
            candidateEmail: candidateEmail,
            actionUser: role === 'applicant' ? '2' : '1',

        } })
        
        
        await transaction.commit();
        res.status(200).json({ success: true, matchedData });
    }
    catch(err){
        res.status(400).json({ success: false, message: err });
    }
})

router.post('/saveMatchedDetails', async function (req, res, next) {
    console.log(req.body)
    const { recruiterEmail, candidateEmail, totalScore, indivisualScore, selection_status, jobId, role,shareId } = req.body
   
    if (!recruiterEmail || !candidateEmail || !totalScore ) {
        res.status(400).json({ success: false, message: 'Please add all required data..' });
        return
    }
    try {
        
        const transaction = await sequelize.transaction();
        const userData = await Users.findOne({ where: { email: recruiterEmail } })
        await transaction.commit();
        const transaction1 = await sequelize.transaction();
        const selctedData = await Users.findOne({ where: { email: candidateEmail } })
        await transaction1.commit();
    
        const transaction2 = await sequelize.transaction();
       // console.log("userData.deviceToken",selctedData)
        const matchedData = await MatchedData.create(
            {
                recruiterEmail: recruiterEmail,
                candidateEmail: candidateEmail,
                total_score: totalScore,
                indivisual_score: indivisualScore,
                userType: userData.isCandidate ? '2' : '1',
                selectedUserType: selctedData.isCandidate ? '2' : '1',
                jobId:jobId || null,
                selection_status: selection_status,
                actionUser: role === 'candidate' ? '2' : '1',
                end_chat:false,
            }
        )
        await transaction2.commit();
const selectedData = {
    screen: 'Home',
    id: shareId+'',
  }
        if(role === 'candidate' && selection_status === 1){
            const transaction = await sequelize.transaction();
          const jobMaster =   await JobMaster.findOne({where:{id: jobId}})
          const postJobDetail = JSON.parse(jobMaster.jobDescription)
          await transaction.commit();
          const transaction1 = await sequelize.transaction();
           const candidateID = await CandidateData.findOne({where:{email: candidateEmail}})
            await transaction1.commit();
            selectedData.id = candidateID.id+''
            console.log(selectedData)
           await sendNotification(userData.firebaseUID,userData.deviceToken, `Hello ${userData.firstname}`, `${selctedData.firstname} S'intéresse à l'offre d'emploi que vous avez publiée ${postJobDetail.category}`,selectedData)
        }
        else if(selection_status === 1) {
            
            const transaction1 = await sequelize.transaction();
            const comapnyMater =   await ComapnyMater.findOne({where:{companyEmail: recruiterEmail}})
            await transaction1.commit();
            const transaction2 = await sequelize.transaction();
            const jobMaster =   await JobMaster.findOne({where:{companyEmail: recruiterEmail}})
            await transaction2.commit();
            selectedData.id = jobMaster.id+''
            console.log("selctedData.firebaseUID1",selctedData.firebaseUID)
            await sendNotification(selctedData.firebaseUID,selctedData.deviceToken, `Hello ${selctedData.firstname}`, `${comapnyMater.companyName} S'intéresse à votre profil, vous pouvez discuter avec ${userData.firstname} Pour la suite du processus`,selectedData)
        }
        
        res.status(200).json({ success: true, matchedData });
    }
    catch (err) {
       
        res.status(400).json({ success: false, message: err });
    }
})

router.post('/getCandiateMatchedDetails', async function (req, res, next) {
    const { userEmail } = req.body
   
    if (!userEmail) {
        res.status(400).json({ success: false, message: 'Please add all required data..' });
        return
    }
    try {
        const userData = await Users.findOne({ where: { email: userEmail } })
        console.log('userData.isCandidate',userData.isCandidate)
        let selctedData = []
        if (userData.isCandidate) {
            const transaction = await sequelize.transaction();
            selctedData = await MatchedData.findAll({ where: { candidateEmail: userEmail, selection_status: 1, end_chat: 0 } })
            await transaction.commit();
        }
        else {
            const transaction = await sequelize.transaction();
            selctedData = await MatchedData.findAll({ where: { recruiterEmail: userEmail, selection_status: 1, end_chat: 0} })
            await transaction.commit();
        }
const dataMatchedCandidateRecuiter = []
        const MatchedDataDetails = []
        console.log('......',selctedData)
        for (let i = 0; i < selctedData.length; i++) {
            let matched = false
            if(dataMatchedCandidateRecuiter.indexOf(`${selctedData[i].recruiterEmail}_${selctedData[i].candidateEmail}`)>-1){
                matched = true
            }
            dataMatchedCandidateRecuiter.push(`${selctedData[i].recruiterEmail}_${selctedData[i].candidateEmail}`)
            const transaction = await sequelize.transaction();
            const users = await Users.findOne({ where: { email: userData.isCandidate ? selctedData[i].recruiterEmail : selctedData[i].candidateEmail } })
            await transaction.commit();
             let visible = false
            if(matched){
                console.log("matched",matched)
                MatchedDataDetails.forEach((data,idx) =>{
                    if(`${data.matchedData.recruiterEmail}_${data.matchedData.candidateEmail}` === `${selctedData[i].recruiterEmail}_${selctedData[i].candidateEmail}`){
                       data['matched'] = true
                    }
                })
            }
             if(userData.isCandidate && selctedData[i].actionUser == '2' ){
                visible = true
            }
            else if(userData.isRecuiter && selctedData[i].actionUser == '1' ){
                visible = true
            }
            MatchedDataDetails.push({ matchedData: selctedData[i], userData: users,visible:visible,matched:matched  })
        }

        //console.log(dataMatchedCandidateRecuiter)
         const newModifiedArray = []
        try{
       
        MatchedDataDetails.forEach(data=>{
            const dataCopy = {
                matchedData:data.matchedData?.dataValues,
                userData: data.userData?.dataValues,
                visible: data.visible,
                matched: data.matched 
            }

            const count = dataMatchedCandidateRecuiter.filter(item => item === `${data.matchedData.recruiterEmail}_${data.matchedData.candidateEmail}`).length;
            //
            if(count === 2){
                console.log('.........ewwe',dataCopy.matched)
                dataCopy['matched'] = true
                
            }
            
            newModifiedArray.push(dataCopy)
        })
    }
    catch(e){
        console.log(e)
    }
       
        res.status(200).json({ success: true, MatchedDataDetails:newModifiedArray });
    }
    catch (err) {
        
        res.status(400).json({ success: false, message: err });
    }
})

module.exports = router