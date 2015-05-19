var express = require('express');
var router = express.Router();

var config = require('../config.json');

var shapeways = require('shapeways');



/* GET auth page. */
router.get('/', function(req, res, next) {
	res.render('auth', { title: config.app.name + ": AUTHORIZATION" });
});


/* GET login. */
router.get('/login', function(req, res, next) {

	var callbackUrl = req.protocol + '://' + req.hostname;
	if(config.port != 80){
		callbackUrl += ':' + config.port;
	}
	callbackUrl += '/auth/callback';

	var client = new shapeways.client({
		consumerKey: config.app.key,
		consumerSecret: config.app.secret,
		authorizationCallback: callbackUrl
	}, function(error, authUrl) {
		if (!error && authUrl) {
			req.session.oauthToken = client.oauthToken;
			req.session.oauthSecret = client.oauthSecret;
			res.writeHead(302, {Location: authUrl + "&oauth_callback=" + callbackUrl});
			return res.end();
		} else {
			console.log(error);
			res.render('error', {
				title: config.app.name + ': Error Authorizing with Shapeways',
				message: config.app.name + ': Error Authorizing with Shapeways', 
				error: error
			});
		}
	});
});

/* GET callback after login. */
router.get('/callback', function(req, res, next) {
	var client = new shapeways.client({
		consumerKey: config.app.key,
		consumerSecret: config.app.secret,
		oauthToken: req.session.oauthToken,
		oauthSecret: req.session.oauthSecret
	});
	client.verifyUrl(req.url, function(error){
		if(!error){
			req.session.oauthToken = client.oauthToken;
			req.session.oauthSecret = client.oauthSecret;
			res.writeHead(302, {Location: '/'});
			return res.end();
		} else {
			console.log(error);
			res.render('error', {
				title: config.app.name + ': Error Authorizing with Shapeways',
				message: config.app.name + ': Error Authorizing with Shapeways', 
				error: error

			});
		}
	});
});

module.exports = router;