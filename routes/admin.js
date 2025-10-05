var express = require('express');
var router = express.Router();
var con = require('../db_connection');
const  verifyEmail  = require('../constant/sendotp');

/* GET home page. */
router.get('/', function (req, res, next) {
  verifyEmail('ak316019@gmail.com',res,1234)
  // res.render('index');
});
const auth = () => {

}

router.post('/login', function (req, res, next) {
  console.log('req body', req.body.first);
  var sql = "Select * from admin where username = ? and password = ?";
  //  var sql = "SELECT * FROM candidate";
  con.query(sql, [req.body.first, req.body.password], function (err, result) {
    if (err) throw err;
    console.log("Result: " + JSON.stringify(result));
    if (result.length > 0) {
      res.render('dashboard');
    } else {
      res.render('index', { title: 'Please enter correct credentials.' });
      // res.send('admin')
    }
  });


});



router.get('/dashboard', function (req, res, next) {
  var sql = "Select * from candidate";
  var sql2 = "Select * from recuiter";
  var candidate = []
  var recuiter = []
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("candidate Result: " + JSON.stringify(result));
    candidate = result
    con.query(sql2, function (err, result1) {
      if (err) throw err;
      console.log("recuiter Result: " + JSON.stringify(result1));
      recuiter = result1

    });
  });

  res.render('admindashboard', { candidate: candidate, recuiter: recuiter });


});

module.exports = router;