const mysql = require('mysql2/promise');
const { Sequelize, DataTypes, Model, STRING } = require('sequelize');
const config  = {
  db: {
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME,
}};

// connection.connect(function(err) {
//     if (err) {
//       return console.error('error: ' + err.message);
//     }
  
//     console.log('Connected to the MySQL server.');
//     // var sql = "INSERT INTO candidate (name, dob, mobile) VALUES ('ashish gupta', '20/04/1996', '9006919284')";
//     // var sql = "SELECT * FROM candidate";
//     // connection.query(sql, function (err, result) {
//     //     if (err) throw err;
//     //     console.log("Result: " + JSON.stringify(result));
//     //   });
//   });

//   export default connection;
async function query(sql, params , callBack) {
  //console.log('sddssdssdsddsd',sql,params)
  const connection = await mysql.createConnection(config.db);
  try{
  const [results, ] = await connection.execute(sql, params);
  callBack(null,results)
  connection.end()
  }
  catch(e){
    callBack(e,null)
  }
  
}

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
  pool: {
    max: 20, // Increase if too low (default is 5)
    min: 0,
    acquire: 30000, // 30 seconds (increase if needed)
    idle: 5000 // Close idle connections after 10 seconds
},
logging: false // Disable logging if unnecessary
});

const connectWithRetry = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Database connection failed:', error);
    setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
  }
};


class Search extends Model {}
Search.init({
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    filename: { type: DataTypes.STRING },
    search_result: { type: DataTypes.TEXT },
    email: { type: DataTypes.STRING },
    numero_telephone: { type: DataTypes.STRING },
}, { sequelize, modelName: 'Search', tableName: 'searches' });

class Fiche extends Model {}
Fiche.init({
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    filename: { type: DataTypes.STRING },
    result_data: { type: DataTypes.TEXT },
    description_poste: { type: DataTypes.STRING },
    email:{type: DataTypes.STRING(1234)},
    jobID:{type: DataTypes.STRING(1234)}
}, { sequelize, modelName: 'Fiche', tableName: 'fiches' });

class Result extends Model {}
Result.init({
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    total_score: { type: DataTypes.FLOAT },
    individual_scores: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'Result', tableName: 'results' });

class CVResult extends Model {}
CVResult.init({
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    total_score: { type: DataTypes.FLOAT },
    individual_scores: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'CVResult', tableName: 'cv_results' });

class TrainingDataFiche extends Model {}
TrainingDataFiche.init({
    fiche_poste: { type: DataTypes.TEXT },
    cv: { type: DataTypes.TEXT },
    score: { type: DataTypes.FLOAT },
}, { sequelize, modelName: 'TrainingDataFiche', tableName: 'training_data_fiche' });

class TrainingDataCV extends Model {}
TrainingDataCV.init({
    fiche_poste: { type: DataTypes.TEXT },
    cv: { type: DataTypes.TEXT },
    score: { type: DataTypes.FLOAT },
}, { sequelize, modelName: 'TrainingDataCV', tableName: 'training_data_cv' });
//.........................Company Master.............................
class ComapnyMater extends Model {}
ComapnyMater.init({
  companyName: { type: DataTypes.TEXT },
  companyNumber: { type: DataTypes.STRING(1234) },
  compayEmployeeCount: {type: DataTypes.STRING(1234)},
  siren: {type: DataTypes.STRING(1234)},
  companyDescription: { type: DataTypes.TEXT },
  companyServiceType: { type: DataTypes.JSON },
  companyVideoURl: { type: DataTypes.TEXT },
  companyAddress: {type: DataTypes.TEXT},
  companyWebsite: {type: DataTypes.STRING(1234)},
  companyEmail: {type: DataTypes.TEXT}
}, { sequelize, modelName: 'ComapnyMater', tableName: 'company_master' });
//.........................JOB Master.............................
class JobMaster extends Model {}
JobMaster.init({
  jobName: { type: DataTypes.TEXT },
  jobDescription: { type: DataTypes.TEXT },
  jobVideoURl: { type: DataTypes.TEXT },
  jobLocationAddress: {type: DataTypes.TEXT},
  category: {type: DataTypes.STRING(1234)},
  experience: {type: DataTypes.STRING(1234)},
  location: {type: DataTypes.TEXT},
  salary: {type: DataTypes.STRING(1234)},
  employmentType: {type: DataTypes.TEXT},
  requiredSkills: {type: DataTypes.TEXT},
  recommendedSkills: {type: DataTypes.TEXT},
  companyEmail: {type: DataTypes.STRING(1234)},
  selectedDepartment: {type: DataTypes.TEXT}
}, { sequelize, modelName: 'JobMaster', tableName: 'job_master' });


//.........................Recuiter.............................
class Recuiter extends Model {}
Recuiter.init({
  firstname: {type: DataTypes.STRING(1234)},
  lastname: {type: DataTypes.STRING(1234)},
  mobile: {type: DataTypes.STRING(1234)},
  email : {type: DataTypes.STRING(1234)},
  password: {type: DataTypes.STRING(1234)},
  otpstatus: {type: DataTypes.STRING(1234)},
  firebaseUID: {type: DataTypes.STRING(1234)}
}, { sequelize, modelName: 'Recuiter', tableName: 'recuiter' });


//.........................Users.............................
class Users extends Model {}
Users.init({
  firstname: {type: DataTypes.STRING(1234)},
  lastname: {type: DataTypes.STRING(1234)},
  mobile: {type: DataTypes.STRING(1234)},
  email : {type: DataTypes.STRING(1234)},
  password: {type: DataTypes.STRING(1234)},
  otpstatus: {type: DataTypes.STRING(1234)},
  firebaseUID: {type: DataTypes.STRING(1234)},
  deviceToken:{type: DataTypes.STRING(1234)},
  isCandidate: {type: DataTypes.BOOLEAN},
  isRecuiter: {type: DataTypes.BOOLEAN}
}, { sequelize, modelName: 'Users', tableName: 'users' });

//.........................Users.............................
class CandidateData extends Model {}
CandidateData.init({
  email : {type: DataTypes.STRING(1234)},
  availabledate: {type: DataTypes.TEXT},
  position: {type: DataTypes.TEXT},
  sector : {type: DataTypes.TEXT},
  location: {type: DataTypes.TEXT},
  workmode: {type: DataTypes.TEXT},
  selectedskill: {type: DataTypes.TEXT},
  jobtitle: {type: DataTypes.STRING(1234)},
  experience: {type: DataTypes.TEXT},
  degree: {type: DataTypes.TEXT},
  video: {type: DataTypes.STRING(1234)},
  stage: {type: DataTypes.STRING(1234)},
  compiledCandidateDetails: {type: DataTypes.TEXT},
  selectedDepartment: {type: DataTypes.TEXT}
}, { sequelize, modelName: 'CandidateData', tableName: 'candidatedata' });

class RegionCity extends Model {}
RegionCity.init({
  region: {type: DataTypes.STRING(1234)},
  city: {type: DataTypes.STRING(1234)},
  country: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'RegionCity', tableName: 'regionCity' });

class JobType extends Model {}
JobType.init({
  jobType: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'JobType', tableName: 'job_type' });

class CompanySize extends Model {}
CompanySize.init({
  companySize: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'CompanySize', tableName: 'company_size' });

class SalaryRange extends Model {}
SalaryRange.init({
  salaryRange: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'SalaryRange', tableName: 'salary_range' });

class JobSector extends Model {}
JobSector.init({
  sector: {type: DataTypes.STRING(1234)},
  subsectors: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'JobSector', tableName: 'job_sector' });

class Skills extends Model {}
Skills.init({
  sector: {type: DataTypes.STRING(1234)},
  subsectors: {type: DataTypes.STRING(1234)},
  specificSkills: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'Skills', tableName: 'skills' });

class SkillMaster extends Model {}
SkillMaster.init({
  sector: {type: DataTypes.STRING(1234)},
  subsectors: {type: DataTypes.STRING(1234)},
  speciality: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'SkillMaster', tableName: 'skill_master' });

class MatchedData extends Model {}
MatchedData.init({
  recruiterEmail: {type: DataTypes.STRING(1234)},
  userType: {type: DataTypes.STRING(1234)},
  candidateEmail: {type: DataTypes.STRING(1234)},
  selectedUserType: {type: DataTypes.STRING(1234)},
  jobId:{type: DataTypes.TINYINT},
  total_score: {type: DataTypes.STRING(1234)},
  selection_status:{type: DataTypes.TINYINT},
  indivisual_score: {type: DataTypes.TEXT},
  actionUser: {type: DataTypes.STRING(1234)},
  end_chat: {type: DataTypes.BOOLEAN,defaultValue:false}
}, { sequelize, modelName: 'MatchedData', tableName: 'match_making_Data' });

class Department_City extends Model {}
Department_City.init({
  depId: {type: DataTypes.STRING(1234)},
  city: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'Department_City', tableName: 'department_city' });

class Departments extends Model {}
Departments.init({
  department: {type: DataTypes.STRING(1234)},
}, { sequelize, modelName: 'Departments', tableName: 'departments' });

// Sync database
sequelize.sync({ alter: false })
    .then(() => console.log('Database synchronized'))
    .catch(err => console.error('Error synchronizing database:', err));

module.exports = {
  query,
  connectWithRetry,
  sequelize,
  Search,
  TrainingDataCV,
  Fiche,
  TrainingDataFiche,
  CVResult,
  Result,
  JobMaster,
  ComapnyMater,
  Recuiter,
  RegionCity,
  Users,
  CandidateData,
  JobType,
  CompanySize,
  SalaryRange,
  JobSector,
  Skills,
  SkillMaster,
  MatchedData,
  Departments,
  Department_City
  
}