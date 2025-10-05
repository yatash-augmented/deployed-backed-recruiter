var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { exec } = require('child_process');
const { PythonShell } = require('python-shell');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var candidateRouter = require('./routes/candidate');
var recuiterRouter = require('./routes/recuiter');
var recuiterSelection = require('./routes/selectionMaster');
//  const matchCV = require('./routes/macthCv')
var cvConverterRouter = require('./routes/back_st');
var matchMaking = require('./routes/matchMaking');
const bodyParser = require('body-parser');
var app = express();
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, '/.well-known/apple-app-site-association'));
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use('/video',express.static(path.join(__dirname, 'public')))
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use('/images',express.static('public'))
global.__basedir = __dirname;
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/candidate', candidateRouter);
app.use('/recuiter', recuiterRouter);
app.use('/cvConverter', cvConverterRouter);
app.use('/selectionMaster',recuiterSelection)
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'apple-app-site-association'));
});

//app.use('/matchCV',matchCV)
app.use('/match',matchMaking)
app.get('/user/:id', (req, res) => {
  const { id } = req.params;

  const intentUrl = `intent://smarttalent.augmentedresourcing.com/user/${id}#Intent;scheme=https;package=com.smarttalent;end;`;

  res.redirect(intentUrl);
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
