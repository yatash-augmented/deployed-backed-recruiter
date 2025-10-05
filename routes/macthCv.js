const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const stringSimilarity = require("string-similarity");

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Weight configuration for scoring
const weights = {
  skills: 0.4,
  experience: 0.3,
  certifications: 0.15,
  location: 0.15,
};

// Helper: Calculate similarity using OpenAI embeddings
async function calculateSemanticSimilarity(jobText, applicantText) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // Use the embedding model
      input: [jobText, applicantText], // Input texts as an array
    });
    console.log("response",response)
    const embeddings = response.data.map((d) => d.embedding);
    const [jobEmbedding, applicantEmbedding] = embeddings;

    // Cosine Similarity Calculation
    const dotProduct = jobEmbedding.reduce((sum, val, idx) => sum + val * applicantEmbedding[idx], 0);
    const magnitudeA = Math.sqrt(jobEmbedding.reduce((sum, val) => sum + val ** 2, 0));
    const magnitudeB = Math.sqrt(applicantEmbedding.reduce((sum, val) => sum + val ** 2, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  } catch (error) {
    console.error("Error in calculating embeddings:", error);
    throw error;
  }
}

// Helper: Match details and calculate scores
router.calculateMatchScore = calculateMatchScore1 =  async(job, applicant) => {
  job = JSON.parse(job)
  applicant = JSON.parse(applicant)
 console.log("Competences......................",job.Competences)
 console.log("Competences......................",applicant.Competences)

 console.log("Task_de_ProfessionalExperience......................",job.Task_de_ProfessionalExperience)
 console.log("Task_de_ProfessionalExperience......................",applicant.Task_de_ProfessionalExperience)

 console.log("Certificat......................",job.Certificat)
 console.log("Certificat......................",applicant.Certificat)

 console.log("Certificate......................",job.Certificats)
 console.log("Certificate......................",applicant.Certificats)

 console.log("job......................",job.ville_pays)
 console.log("job......................",applicant.ville_pays)
  const skillsScore = stringSimilarity.compareTwoStrings(job.Competences, applicant.Competences);

  // Experience Matching (Semantic Similarity using OpenAI)
  const experienceScore = await calculateSemanticSimilarity(job.Task_de_ProfessionalExperience, applicant.Task_de_ProfessionalExperience);

  // Certification Matching
  const certificationsScore = stringSimilarity.compareTwoStrings(job.Certificats ?? '', applicant.Certificats ?? '');

  // Location Matching
  const locationScore = stringSimilarity.compareTwoStrings(job.ville_pays, applicant.ville_pays);

  // Overall Score
  const overallScore =
    skillsScore * weights.skills +
    experienceScore * weights.experience +
    certificationsScore * weights.certifications +
    locationScore * weights.location;

  return {
    skillsScore,
    experienceScore,
    certificationsScore,
    locationScore,
    overallScore,
  };
}

// Endpoint: Compare Job Requirement with Applicant Profile
router.post("/match", async (req, res) => {
  const { jobRequirement, candidateProfile } = req.body;

  if (!jobRequirement || !candidateProfile) {
    return res.status(400).send({ error: "Job requirement and candidate profile are required." });
  }

  try {
    const scores = await calculateMatchScore1(jobRequirement, candidateProfile);

    res.send({
      matchDetails: scores,
      message: `The overall match score is ${(scores.overallScore * 100).toFixed(2)}%.`,
    });
  } catch (error) {
    console.error("Error in matching:", error);
    res.status(500).send({ error: "An error occurred during the match calculation." });
  }
});

module.exports = router;