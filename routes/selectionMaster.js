const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { 
    sequelize,
    RegionCity,
    JobType,
    CompanySize,
    SalaryRange,
    JobSector,
    Skills,
    SkillMaster,
    Departments,
    Department_City,
  } = require('../db_connection')


  /* POST candidate Dashboard. */
router.post('/saveLocationMaster', async(req, res, next) => {
  const transaction = await sequelize.transaction();
    try{
 
   await RegionCity.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
      await transaction.rollback()
        res.status(400).json(e);  
    }
});

  /* POST candidate Dashboard. */
  router.post('/saveJobTypeMaster', async(req, res, next) => {
    try{
    const transaction = await sequelize.transaction();
   await JobType.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
        res.status(400).json(e);  
    }
});

  /* POST candidate Dashboard. */
  router.post('/saveCompanySizeMaster', async(req, res, next) => {
    try{
    const transaction = await sequelize.transaction();
   await CompanySize.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
        res.status(400).json(e);  
    }
});

/* POST candidate Dashboard. */
router.post('/saveSalaryRangeMaster', async(req, res, next) => {
    try{
    const transaction = await sequelize.transaction();
   await SalaryRange.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
        res.status(400).json(e);  
    }
});

/* POST candidate Dashboard. */
router.post('/saveJobSectorMaster', async(req, res, next) => {
    try{
        console.log("req.body",req.body)
        req.body.forEach(data=>{
            data.subsectors = JSON.stringify(data.subsectors)
        })
    const transaction = await sequelize.transaction();
   await JobSector.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
        res.status(400).json(e);  
    }
});

/* POST candidate Dashboard. */
router.post('/saveSkillsMaster', async(req, res, next) => {
    try{
        console.log("req.body",req.body)
        req.body.forEach(data=>{
            data.subsectors = JSON.stringify(data.subsectors)
        })
    const transaction = await sequelize.transaction();
   await SkillMaster.bulkCreate(req.body)
   await transaction.commit();
    res.status(200).json({ success: true, message: ' Save Successfully.', stage: 'updated' });
    }
    catch(e){
        res.status(400).json(e);  
    }
});

router.get('/getMasterData',async(req, res, next) => {
  const transaction = await sequelize.transaction();
    const {reasonCity,
        jobType,
        companySize,
        salaryRang,
        jobSector,
        skills,
        skillText,
        jobSectorText,
        jobSubSectorText
    } = req.query

    const masterData = {}
    if(reasonCity){
        const reasonCityData = await RegionCity.findAll({attributes: ['region', 'city']})
        masterData['reasonCity'] = reasonCityData
    }
  if(jobType){
    const jobTypeData = await JobType.findAll({attributes: ['jobType']})
    masterData['jobType'] = jobTypeData
  }

  if(companySize){
    const companySizeData = await CompanySize.findAll({attributes: ['companySize']})
    masterData['companySize'] = companySizeData
  }
  if(salaryRang){
    const salaryRangData = await  SalaryRange.findAll({attributes: ['salaryRange']})
    masterData['salaryRang'] = salaryRangData
  }
  if(jobSector){
    

    let jobSectorData
    if(jobSectorText && jobSectorText.length > 0){
        jobSectorData = await JobSector.findAll({
        attributes: ['sector', 'subsectors'],
        where: {
            sector: {
            [Op.like]: `%${jobSectorText}%`
          }
        }
      });
    }
    else if(jobSubSectorText && jobSubSectorText.length > 0){
        jobSectorData = await JobSector.findAll({
        attributes: ['sector', 'subsectors'],
        where: {
            subsectors: {
            [Op.like]: `%${jobSubSectorText}%`
          }
        }
      });
    }
    else {
        jobSectorData = await JobSector.findAll({
            attributes: ['sector', 'subsectors'],
          });
    }
    masterData['jobSector'] = jobSectorData

    
  }
  if(skills){
    let skillsData
    if(skillText && skillText.length > 0){
     skillsData = await SkillMaster.findAll({
        attributes: ['sector', 'subsectors', 'speciality'],
        where: {
          speciality: {
            [Op.like]: `%${skillText}%`
          }
        }
      });
    }
    else {
        skillsData = await SkillMaster.findAll({
            attributes: ['sector', 'subsectors', 'speciality'],
          });
    }
    masterData['skills'] = skillsData
  }
   
   
await transaction.commit()
   res.status(200).json({ success: true, masters: masterData });
})

router.get('/getDepartmentData',async(req, res, next) => {
  const transaction = await sequelize.transaction();
  const reasonCityData = await Departments.findAll({
    attributes: ['id', 'department'],
    order: [sequelize.literal("SUBSTRING_INDEX(department, ' - ', -1) ASC")], 
  })
  await transaction.commit()
  res.status(200).json({ success: true, DepartmentMaster: reasonCityData });
})

router.get('/getDepartmentCity', async (req, res, next) => {
  const { depIds } = req.query;
  const ids = depIds || '';

  const transaction = await sequelize.transaction();
  const depsIds = ids.split(',');
  let reasonCityData = [];

  try {
    for (const depId of depsIds) {
      const data = await Department_City.findAll({
        attributes: ['depId', 'city'],
        where: { depId },
        limit: 10
      });
      reasonCityData = reasonCityData.concat(data);
    }

    await transaction.commit();
    res.status(200).json({ success: true, DepartmentCity: reasonCityData });

  } catch (error) {
     await transaction.commit();
    res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
  }
});

router.get('/getDepartmentCityPagination', async (req, res, next) => {
  const { depIds, pages } = req.query;

  const page = parseInt(pages) || 1; // default to page 1
  const limit = 10;
  const offset = (page - 1) * limit;

  const ids = depIds || '';
  const depsIds = ids.split(',').map(id => id.trim());

  let reasonCityData = [];

  const transaction = await sequelize.transaction();

  try {
    for (const depId of depsIds) {
      const data = await Department_City.findAll({
        attributes: ['depId', 'city'],
        where: { depId },
        limit,
        offset
      });
      reasonCityData = reasonCityData.concat(data);
    }

    await transaction.commit();
    res.status(200).json({ success: true, DepartmentCity: reasonCityData });

  } catch (error) {
    await transaction.commit();
    res.status(500).json({ success: false, message: 'Failed to fetch data', error: error.message });
  }
});

module.exports = router; 