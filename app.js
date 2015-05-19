var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var shapeways = require('shapeways');
var AdmZip = require('adm-zip');
var JSZip = require("jszip");

var config = require('./config.json');

var routes = require('./routes/index');
var auth = require('./routes/auth');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('json spaces', 2);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret: 'bld'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this middleware gets called with every request
// it redirects to /auth/login if the user has no Shapeways API credentials, otherwise, it loads them
app.use(function(req, res, next) {
	
	// if the user tries to send a model to Shapeways
	if (req.url == '/upload' || ~req.url.indexOf('/status')) {
		req.appApi = new shapeways.client({
			consumerKey: config.app.key,
			consumerSecret: config.app.secret,
			oauthToken: config.app.oauthToken,
			oauthSecret: config.app.oauthSecret
		});

		console.log(req.appApi);

		// Since I'm no longer authenticating the user, this is all unnecessary, but I'm going to leave it gor posterity.

		// // if there is no oathSecret of oauthToken
		// if(!req.session.oauthSecret || !req.session.oauthToken){
		// 	// go to the auth page
		// 	res.writeHead(302, {Location: '/auth'});
		// 	return res.end();
		// } else {

		// 	// set the api info

		// 	req.userApi = new shapeways.client({
		// 		consumerKey: config.app.key,
		// 		consumerSecret: config.app.secret,
		// 		oauthToken: req.session.oauthToken,
		// 		oauthSecret: req.session.oauthSecret
		// 	});

		// 	req.appApi = new shapeways.client({
		// 		consumerKey: config.app.key,
		// 		consumerSecret: config.app.secret,
		// 		oauthToken: config.app.oauthToken,
		// 		oauthSecret: config.app.oauthSecret
		// 	});

		// 	console.log(req.userApi);
		// 	console.log(req.appApi);
		// 	console.log("ALREADY LOGGED IN");
		// }
	}
	
	next();
});


app.use('/', routes);
app.use('/auth', auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


module.exports = app;
