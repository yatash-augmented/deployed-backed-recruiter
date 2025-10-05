const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const mysql = require('mysql2');
var con = require('../db_connection')
const { 
  sequelize,
  Search,
  TrainingDataCV,
  Fiche,
  TrainingDataFiche,
  CVResult,
  Result,
  JobMaster,
  ComapnyMater,
  Users,
  CandidateData,
  MatchedData
} = require('../db_connection')
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const logging = require('loglevel');
const natural = require('natural');
const stopword = require('stopword'); // For stopword removal
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmerFr; // French stemmer
const cosineSimilarity = require('cosine-similarity');
var similarity = require( 'compute-cosine-similarity' );
const { OrderedMap } = require('immutable');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, __basedir+'/public/uploads')
    },
    filename: function (req, file, cb) {
        return cb(null, `${Date.now()}-${file.originalname}`)
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})
const upload = multer({ storage: storage })

// Set up OpenAI API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// Middleware for JSON parsing

// Function to extract text from PDF
const extractTextFromPDF = async (file) => {
  try {
    const data = await pdfParse(file);
    return data.text;
  } catch (error) {
    logging.error('Error extracting text from PDF:', error);
    return null;
  }
};

// Function to convert text to JSON using OpenAI API
const convertTextToJSON = async (text, prompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7
    });
    const jsonResponse = response.choices[0].message.content.trim();
   // //console.log(jsonResponse)
    return jsonResponse;
  } catch (error) {
    logging.error('Error calling OpenAI API:', error);
    return null;
  }
};

// Route to convert CV PDF to JSON
router.post('/convert_cv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || path.extname(req.file.originalname).toLowerCase() !== '.pdf') {
        return res.status(400).json({ error: 'No file uploaded or file is not a PDF' });
    }

    const pdfText = await extractTextFromPDF(req.file.path);
    if (!pdfText) {
      return res.status(500).json({ error: 'Failed to extract text from PDF' });
    }
    
    const prompt = `
Please convert the following CV or informational document into a JSON format with the specified categories as key-value pairs:

${pdfText}

Output the JSON structured data with the following keys:
- nom_prenom
- ville_pays
- e_mail
- numero_telephone
- Diplomes
- Competences
- Soft_skills
- Langue
- Certificats
- Poste_recherche
- Task_de_ProfessionalExperience

Each key should map directly to the corresponding information without nested structures and use underscores instead of spaces. 

For the 'Task_de_ProfessionalExperience' category, please include only the tasks performed in each professional experience without company, position, or duration information.

Make sure the output is a single-line JSON string without any newlines or extra spaces.

For example:
{"nom_prenom": "pape mick lucy", "ville_pays": "Every, france", "e_mail": "samy@gmail.com", "numero_telephone": "06712776323", "Diplômes": "BSc in Computer Science, University XYZ, 2015, master science universiy paris 8", "Competences": "langage: Python, Java, SQL; berutique:excel", "Soft_skills": "Teamwork, Communication, Problem-solving", "Langue": "French(couramment), English(profesionnelle)", "Certificats": "Certified Scrum Master", "Poste_recherche": "Software Engineer", "Task_de_ProfessionalExperience": "Developed web applications using Django and Flask. Managed database migrations."}
`;
    
    const jsonResult = await convertTextToJSON(pdfText, prompt);
    if (!jsonResult) {
      return res.status(500).json({ error: 'Failed to convert text to JSON' });
    }
    ////console.log("jsonResult",jsonResult)
const resultObj = JSON.parse(jsonResult.trim())
////console.log('jsonResult', resultObj)

    const {  email, phoneNumber, e_mail, numero_telephone } = resultObj;
   let resumeEmail = email || e_mail;
   let resumePhoneNumber =  phoneNumber ||  numero_telephone

    let existingRecord = await Search.findOne({
      where: {
        [Op.or]: [{ email:resumeEmail }, { numero_telephone: resumePhoneNumber }]
      }
    });

    if (existingRecord) {
      return res.status(200).json(JSON.parse(existingRecord.search_result));
    }

    const search = await Search.create({
      filename: req.file.originalname,
      search_result: JSON.stringify(jsonResult),
      email:resumeEmail,
      numero_telephone: resumePhoneNumber
    });

    return res.status(200).json(jsonResult);
  } catch (error) {
    logging.error('Error processing /convert_cv route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to convert job description PDF to JSON
router.post('/convert_fiche', upload.single('file'), async (req, res) => {

  try {
    if (!req.file || path.extname(req.file.originalname).toLowerCase() !== '.pdf') {
      return res.status(400).json({ error: 'No file uploaded or file is not a PDF' });
  }

  const pdfText = await extractTextFromPDF(req.file.path);
  if (!pdfText) {
    return res.status(500).json({ error: 'Failed to extract text from PDF' });
  }

  const prompt = `
  Please convert the following job description or informational document into a JSON format with the specified categories as key-value pairs:
  
  ${pdfText}
  
  Output the JSON structured data with the following keys:
  - description_poste
  - ville_pays
  - e_mail
  - numero_telephone
  - Diplomes
  - Competences
  - Soft_skills
  - Langue
  - Certificats
  - Poste_recherche
  - Task_de_ProfessionalExperience
  
  Each key should map directly to the corresponding information without nested structures and use underscores instead of spaces.
  For the 'Task de ProfessionalExperience' category, please include only the tasks performed in each professional experience without company, position, or duration information.
  Make sure the output is a single-line JSON string without any newlines or extra spaces.
  For example:
  {"description_poste": "En tant que Développeur(se) Web Full Stack, vous serez responsable du développement et de la maintenance de nos applications web", "ville_pays": "Every, france", "e_mail": "samy@gmail.com", "numero_telephone": "06712776323", "Diplômes": "BSc in Computer Science, University XYZ, 2015, master science universiy paris 8", "Competences": "langage: Python, Java, SQL; berutique:excel", "Soft_skills": "Teamwork, Communication, Problem-solving", "Langue": "French(couramment), English(profesionnelle)", "Certificats": "Certified Scrum Master", "Poste recherche": "Software Engineer", "Task_de_ProfessionalExperience": "Developed web applications using Django and Flask. Managed database migrations."}
  `;

      // Assuming `convertTextToJson` is a function to handle the prompt, possibly with AI integration
      const jsonResult = await convertTextToJSON(pdfText, prompt); 
     // //console.log('description_poste',jsonResult)
      if (!jsonResult) {
          return res.status(500).json({ error: 'Failed to convert text to JSON' });
      }

      const { description_poste } = JSON.parse(jsonResult);

      const existingRecord = await Fiche.findOne({
          where: { description_poste },
      });

      if (existingRecord) {
          return res.status(200).json(JSON.parse(existingRecord.result_data));
      }

      const fiche = await Fiche.create({
          filename: req.file.originalname,
          result_data: JSON.stringify(jsonResult),
          description_poste,
      });

      return res.status(200).json(jsonResult);
  } catch (error) {
      return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

const model = {
  encode: (text) => {
    // Dummy encoding: Replace with real embedding logic
    return text.split(' ').map((word) => word.charCodeAt(0));
  },
};


const preprocessText =(text)=> {
  // Convert lists or dictionaries to a single string
  if (Array.isArray(text)) {
    text = text.join(' ');
  } else if (typeof text === 'object') {
    text = Object.values(text)
      .map(value => (Array.isArray(value) ? value.join(' ') : String(value)))
      .join(' ');
  }

  // Tokenize and preprocess
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const filteredTokens = stopword.removeStopwords(tokens, stopword.french);
////console.log(filteredTokens)
  // Apply stemming and filter out non-alphanumeric tokens
  const stemmedTokens = filteredTokens
    .filter(token => /^[a-zA-Z0-9]+$/.test(token))
    .map(token => stemmer.stem(token));

  return stemmedTokens.join(' ');
}

// Encoding function
const encodeText = (text)=> {
  const tokens = preprocessText(text);
  return model.encode(tokens);
}

// Function to compare documents (simplified for illustration)
function compareDocuments(doc1, doc2, weights) {

  // //console.log("doc1",doc1)
  // //console.log("doc2",doc2)
  const individualScores = {};
  let totalScore = 0;

 /////console.log("doc1.................",JSON.parse(doc1))
////console.log("doc2...............",JSON.parse(doc2))
  // //console.log("weights...........",weights)
  
  for (const [critere, weight] of Object.entries(weights)) {
    //console.log(critere,weight)
      let doc1Text = JSON.parse(doc1)[critere] || "";
      let doc2Text = JSON.parse(doc2)[critere] || "";
    //console.log("doc1Text",doc1Text)
    //console.log("doc2Text",doc2Text)
      if (Array.isArray(doc1Text)) {
          doc1Text = doc1Text.join(" ");
      }
      if (Array.isArray(doc2Text)) {
          doc2Text = doc2Text.join(" ");
      }

      if (doc1Text && doc2Text) {
        
          const doc1Embedding = encodeText(doc1Text);
          const doc2Embedding = encodeText(doc2Text);
         // //console.log(doc2Embedding)
          ////console.log(doc1Embedding)
          let combinedScore = cosineSimilarity(doc1Embedding, doc2Embedding);
         // //console.log('doc1Embedding',combinedScore)
          
          combinedScore *= weight;
         // //console.log('doc1Text, doc1Text',combinedScore)
          individualScores[critere] = combinedScore.toFixed(2);
          totalScore += combinedScore;
      }
  }

  return { totalScore, individualScores };
}

// Define weights for the criteria
const weights = {
  Competences: 20,
  Diplomes: 10,
  Certificats: 10,
  Soft_skills: 10,
  Langue: 10,
  Task_de_ProfessionalExperience: 30,
  Poste_recherche: 5,
  Mode_de_travail: 10,
  Secteur_recherché: 10,
  Secteur_Refusé: -50,
  Type_de_contrat: 10
};


router.post('/compare_fiche_with_cvs', (req, res) => {
  try {
    const data = req.body;
    const fichePoste = data.fiche_poste;
    const cvs = data.cvs;

    if (typeof fichePoste !== 'object' || !Array.isArray(cvs)) {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    const scores = cvs.map((cv) => {
      const { totalScore, individualScores } = compareDocuments(fichePoste, cv, weights);

      const orderedResult = OrderedMap({
        nom_prenom: cv.nom_prenom || '',
        numero_telephone: cv.numero_telephone || '',
        e_mail: cv.e_mail || '',
        ville_pays: cv.ville_pays || '',
        total_score: totalScore.toFixed(2),
        individual_scores: individualScores
      }).toObject();

      return orderedResult;
    });

    const scoresSorted = scores.sort((a, b) => b.total_score - a.total_score);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(scoresSorted);
  } catch (error) {
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

router.post('/save_validated_cvs', async (req, res) => {
  try {
    const data = req.body;
    const fichePoste = data.fiche_poste;
    const validatedCvs = data.validated_cvs;

    if (typeof fichePoste !== 'object' || !Array.isArray(validatedCvs)) {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    
    try {
      for (const cv of validatedCvs) {
        const { totalScore, individualScores } = compareDocuments(fichePoste, cv, weights);
        const transaction = await sequelize.transaction();
        // Save into training data (job description with validated CVs)
        await TrainingDataFiche.create({
          fiche_poste: JSON.stringify(fichePoste),
          cv: JSON.stringify(cv),
          score: totalScore
        }, { transaction });
        await transaction.commit();
      }

      
      res.status(200).json({ status: 'success', message: 'Validated CVs saved successfully' });
    } catch (error) {
      await transaction.rollback();
      logging.error(`Error saving training data to database: ${error}`);
      res.status(500).json({ error: 'An error occurred while saving data' });
    }
  } catch (error) {
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

router.post('/save_validated_fiches', async (req, res) => {
  try {
    const data = req.body;
    const cv = data.cv;
    const validatedFiches = data.validated_fiches;

    if (typeof cv !== 'object' || !Array.isArray(validatedFiches)) {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    const transaction = await sequelize.transaction();
    try {
      for (const fichePoste of validatedFiches) {
        const { totalScore, individualScores } = compareDocuments(cv, fichePoste, weights);

        // Save into training data (CV with validated job descriptions)
        await TrainingDataCV.create({
          fiche_poste: JSON.stringify(fichePoste),
          cv: JSON.stringify(cv),
          score: totalScore
        }, { transaction });
      }

      await transaction.commit();
      res.status(200).json({ status: 'success', message: 'Validated fiches saved successfully' });
    } catch (error) {
      await transaction.rollback();
      logging.error(`Error saving training data to database: ${error}`);
      res.status(500).json({ error: 'An error occurred while saving data' });
    }
  } catch (error) {
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

router.post('/compare_cv_with_fiches', (req, res) => {
  try {
    const data = req.body;
    const cv = data.cv;
    const fiches = data.fiches;

    if (!cv || !fiches) {
      return res.status(400).json({ error: 'CV or Fiches data not provided' });
    }

    const scores = fiches.map((fichePoste) => {
      const { totalScore, individualScores } = compareDocuments(cv, fichePoste, weights);

      return {
        description_poste: fichePoste.description_poste || '',
        total_score: totalScore,
        individual_scores: individualScores
      };
    });

    const scoresSorted = scores.sort((a, b) => b.total_score - a.total_score);
    res.status(200).json(scoresSorted);
  } catch (error) {
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

router.getJobPostProfile = async(requiterEmail)=> {
  const transaction = await sequelize.transaction();
  const allJobs = await JobMaster.findAll({where: {companyEmail: requiterEmail}});
 await transaction.commit()
 const transaction1 = await sequelize.transaction();
  const recuiterData = await Users.findOne({where: {email: requiterEmail}});
  await transaction1.commit()
  const jobDataObject = JSON.parse(allJobs[0].jobDescription)
  jobDataObject.email = requiterEmail
  jobDataObject.phoneno = recuiterData.mobile
 if (allJobs.length === 0) {
  //console.log('.....................no jobs created')
   return
 }

 const prompt = `
 Please convert the following job description or informational document into a JSON format with the specified categories as key-value pairs:
 
 ${JSON.stringify(jobDataObject)}
 
 Output the JSON structured data with the following keys:
 - description_poste
 - ville_pays
 - e_mail
 - numero_telephone
 - Competences
 - Soft_skills
 - Langue
 - Certificats
 - Poste_recherche
 - Task_de_ProfessionalExperience
 
 Each key should map directly to the corresponding information without nested structures and use underscores instead of spaces.
 For the 'Task de ProfessionalExperience' category, please include only the tasks performed in each professional experience without company, position, or duration information.
 Make sure the output is a single-line JSON string without any newlines or extra spaces.
 For example:
 {"description_poste": "En tant que Développeur(se) Web Full Stack, vous serez responsable du développement et de la maintenance de nos applications web", "ville_pays": "Every, france", "e_mail": "samy@gmail.com", "numero_telephone": "06712776323", "Diplômes": "BSc in Computer Science, University XYZ, 2015, master science universiy paris 8", "Competences": "langage: Python, Java, SQL; berutique:excel", "Soft_skills": "Teamwork, Communication, Problem-solving", "Langue": "French(couramment), English(profesionnelle)", "Certificats": "Certified Scrum Master", "Poste recherche": "Software Engineer", "Task_de_ProfessionalExperience": "Developed web applications using Django and Flask. Managed database migrations."}
 `;

     // Assuming `convertTextToJson` is a function to handle the prompt, possibly with AI integration
     const jsonResult = await convertTextToJSON(allJobs[0].jobDescription, prompt); 
     //console.log('description_poste...............................',jsonResult)
     const existingRecord = await Fiche.findOne({
      where: { jobID: allJobs[0].id},
  });
  const { description_poste } = JSON.parse(jsonResult);
  if (existingRecord) {
    Fiche.update({ result_data: JSON.stringify(jsonResult) },
        { where: { jobID: allJobs[0].id } })
      return 
  }

  const fiche = await Fiche.create({
      filename: 'JobProfileCreation',
      result_data: JSON.stringify(jsonResult),
      description_poste,
      email: requiterEmail,
      jobID: allJobs[0].id
  });
    return jsonResult
}

router.post('/compare_candidateProfile_with_jobProfile', async(req, res) => {
  try{
    const data = req.body;
  // const jobProfile = await getJobPostProfile(data)
   const CondidateProfileData = await Search.findAll()

      //const { description_poste } = JSON.parse(jsonResult);


    res.status(200).json(jobProfile);
  }
  catch(error){
    res.status(500).json({ error: error });
  }
})


const getCandidateJSONFromAI = async(candidateText)=>{
  
  //console.log("candidateText",candidateText)
  try {
    
    const prompt = `
Please convert the following CV or informational document into a JSON format with the specified categories as key-value pairs:

${JSON.stringify(candidateText)}

Output the JSON structured data with the following keys:
- nom_prenom
- ville_pays
- e_mail
- numero_telephone
- Diplomes
- Competences
- Soft_skills
- Langue
- Certificats
- Poste_recherche
- Task_de_ProfessionalExperience

Each key should map directly to the corresponding information without nested structures and use underscores instead of spaces. 

For the 'Task_de_ProfessionalExperience' category, please include only the tasks performed in each professional experience without company, position, or duration information.

Make sure the output is a single-line JSON string without any newlines or extra spaces.
Make sure No Extra text return, just JSON String.
For example:
{"nom_prenom": "pape mick lucy", "ville_pays": "Every, france", "e_mail": "samy@gmail.com", "numero_telephone": "06712776323", "Diplômes": "BSc in Computer Science, University XYZ, 2015, master science universiy paris 8", "Competences": "langage: Python, Java, SQL; berutique:excel", "Soft_skills": "Teamwork, Communication, Problem-solving", "Langue": "French(couramment), English(profesionnelle)", "Certificats": "Certified Scrum Master", "Poste_recherche": "Software Engineer", "Task_de_ProfessionalExperience": "Developed web applications using Django and Flask. Managed database migrations."}
`;
    
    const jsonResult = await convertTextToJSON(JSON.stringify(candidateText), prompt);
   
    //console.log("jsonResult",jsonResult)
const resultObj = JSON.parse(jsonResult.trim())
////console.log('jsonResult', resultObj)

    const {  email, phoneNumber, e_mail, numero_telephone } = resultObj;
   let resumeEmail = email || e_mail;
   let resumePhoneNumber =  phoneNumber ||  numero_telephone
   const transaction = await sequelize.transaction();
    let existingRecord = await Search.findOne({
      where: {
        [Op.or]: [{ email:resumeEmail }]
      }
    });
    await transaction.commit();
    if (existingRecord) {
      Search.update({ search_result: JSON.stringify(jsonResult) },
        { where: { email:resumeEmail } })
      return 
  }
  const transaction1 = await sequelize.transaction();
    const search = await Search.create({
      filename: 'CandidateProfie',
      search_result: JSON.stringify(jsonResult),
      email:resumeEmail,
      numero_telephone: resumePhoneNumber
    });
    await transaction1.commit();
  

  } catch (error) {
    logging.error('Error processing /convert_cv route:', error);
    await transaction2.rollback()
    await transaction1.rollback()
  }
}


// Route to convert CV PDF to JSON
router.saveCandidateChatGpt =  async (candidateEmail) => {
 
    const sql2 = `SELECT * 
FROM candidatedata 
INNER JOIN users 
ON candidatedata.email = users.email 
WHERE candidatedata.email = ?;`;
       // const sql2 = "Select * from candidatedata where email = ? limit 1";
       con.query(sql2, [candidateEmail], function (err, result) {
           if (err) {
               
           } else {
           // //console.log(';;;;....',result)
            getCandidateJSONFromAI(result[0])
              
           }
       })

};


router.post('/compare_candiateProfile_with_JobProfile', async(req, res) => {

  try {
    const data = req.body;
    const transaction0 = await sequelize.transaction();
    const AllMatchedForUser = await MatchedData.findAll({where:{candidateEmail: data.candidateEmail}});
    await transaction0.commit();
    
    const transaction1 = await sequelize.transaction();
    const CandidateProfie = await Search.findOne({where:{email: data.candidateEmail}});
    await transaction1.commit();
    if(!CandidateProfie){
      res.status(400).json({ error: 'User Candidate profile is not completed!' });
    }
    const JobProfiles = await Fiche.findAll();
    let comapareData = []
    for(let i = 0; i < JobProfiles.length; i++){
      let alreadyApply = false
      let isSelected = false
      AllMatchedForUser.forEach(data=>{
         console.log(data.actionUser)
        if(data.jobId && data.jobId == JobProfiles[i].jobID && data.actionUser == '2'){
         // console.log(data.jobId)
          alreadyApply = true
        }

        if(data.jobId && data.jobId == JobProfiles[i].jobID && data.actionUser == '1'){
          isSelected = true
        }
      })
      if(!alreadyApply){

       // console.log('CandidateProfie.search_result',CandidateProfie.search_result)
       
      const transaction = await sequelize.transaction();
      const { totalScore, individualScores } = compareDocuments(JSON.parse(CandidateProfie.search_result), JSON.parse(JobProfiles[i].result_data), weights);
   
      const JOBMaster =   await JobMaster.findOne({where: {id: JobProfiles[i].jobID}}) 
      if(JOBMaster)
      comapareData.push({
        description_poste: JobProfiles[i].description_poste || '',
        total_score: `${totalScore.toFixed(2)}%`,
        individual_scores: individualScores,
        JobDetail: await JobMaster.findOne({where: {id: JobProfiles[i].jobID}}),
        CompanyDetails: await ComapnyMater.findOne({where: {companyEmail: JobProfiles[i].email}}) ,
        userDetail: await Users.findOne({where: {email: JobProfiles[i].email}}) ,
        isSelected:isSelected,
        
      })
      await transaction.commit();
    }
    }
   

   const scoresSorted = comapareData.sort((a, b) => b.total_score - a.total_score);
    res.status(200).json({matchedJobs:scoresSorted});
  } catch (error) {
   
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});


router.post('/compare_RecuiterProfile_with_CandidateProfile', async(req, res) => {
 
  try {
    const data = req.body;
    const transaction0 = await sequelize.transaction();
    const AllMatchedForUser = await MatchedData.findAll({where:{recruiterEmail: data.recuiterEmail, jobId:data.jobId}});
    await transaction0.commit();
    const transaction = await sequelize.transaction();
    const JobProfiles = await Fiche.findOne({where:{email: data.recuiterEmail}});
    await transaction.commit();
    if(!JobProfiles){
      res.status(400).json({ error: 'Job Profile is not created!' });
    }
    console.log("AllMatchedForUser",AllMatchedForUser)
    const CandidateProfie = await Search.findAll();
    let comapareData = []
    for(let i = 0; i < CandidateProfie.length; i++){
     let alreadyApply = false
     let isSelected = false
      AllMatchedForUser.forEach(data=>{
        console.log('data.candidateEmail',data.candidateEmail)
        console.log('CandidateProfie[i].email',CandidateProfie[i].email)
        console.log('CandidateProfie[i].email',CandidateProfie[i].email)
        console.log('data.actionUser',data.actionUser)
        if(data.candidateEmail && data.candidateEmail == CandidateProfie[i].email && data.actionUser == '1'){
         // console.log(data.jobId)
          alreadyApply = true
        }

        if(data.candidateEmail && data.candidateEmail == CandidateProfie[i].email && data.actionUser == '2'){
          isSelected = true
        }
      })
       if(!alreadyApply){
        console.log("isSelected",isSelected)
      const transaction = await sequelize.transaction();
      const { totalScore, individualScores } = compareDocuments(JSON.parse(JobProfiles.result_data), JSON.parse(CandidateProfie[i].search_result), weights);
      const CandidateProfile = await CandidateData.findOne({where: {email: CandidateProfie[i].email}}) || ''
      if(CandidateProfile)
      comapareData.push({
        candidateData: CandidateProfile,
        candidateName:  await Users.findOne({attributes: ['firstname', 'lastname'],where: {email: CandidateProfie[i].email}}) || '',
        total_score: `${totalScore.toFixed(2)}%`,
        individual_scores: individualScores,
        jobID:  JobProfiles.jobID,
        isSelected: isSelected
      })
      await transaction.commit();
    }
  }

   const scoresSorted = comapareData.sort((a, b) => b.total_score - a.total_score);
    res.status(200).json({matchedJobs:scoresSorted});
  } catch (error) {
   
    logging.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});


module.exports = router;