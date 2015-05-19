var express = require('express');
var router = express.Router();

var config = require('../config.json');

var shapeways = require('shapeways');

var AdmZip = require('adm-zip');

/* Home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: config.app.name });
});

/* Build page. */
router.post('/upload', function(req, res, next) {

	console.log("INSIDE UPLOAD");

	var vrml = req.body.vrml;
	var filename = req.body.name;

	console.log("READY TO ZIP");
	// zip files and make a buffer out of them
	var zip = new AdmZip();
	console.log(zip);

	zip.addFile(filename + ".wrl", new Buffer(vrml));
	console.log(__dirname, __filename);
	zip.addLocalFile("/home/johnmars/bld/public/models/" + filename + ".jpg");

	console.log(zip);



	console.log("READY TO BUFFER");
	zip.toBuffer(function(buffer) {

		console.log("INSIDE BUFFER");

		function tileToLatLng(row, col, zoom) {

			var n = Math.PI - 2 * Math.PI * col / Math.pow(2, zoom);
			var lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

			var lng = row / Math.pow(2, zoom) * 360 - 180;

			return [lat, lng];
		}

		var splitFilename = filename.split('_');
		var latLng = tileToLatLng(splitFilename[1], splitFilename[2], splitFilename[0]);

		
		var file = buffer;
		var title = "ibldi | LAT:" + latLng[0] + " LNG:" + latLng[1];
		var fileName = filename + ".zip";
		var description = "CREATED WITH IBLDI (http://ibldi.xyz)\nPlease be advised that the ibldi service is a PROTOTYPE. This model may have a mistake, and it might even be unprintable. Please ensure it looks structurally sound and complete before purchasing it.";

		var params = {
			"file": file,
			"title": title,
			"description": description,
			"fileName": fileName,
			"uploadScale": .0001875, // ~5cm
			"hasRightsToModel": true,
			"acceptTermsAndConditions": true,
			"isForSale": true,
			"isDownloadable": true,
			"isPublic": true,
			"defaultMaterialId": 26,
			"categories": [27, 38, 101, 16],
			"materials": { 
				"26": { // color sandstone
					"markup": 0,
					"isActive": true
				}
			}
		}

		console.log("READY TO UPLOAD");
		console.log(req.appApi);

		// send model to Shapeways
		req.appApi.addModel(params, function(error, data) {

			console.log(error, data);

			var modelPrintable = "processing";
			var materialPrintable = false;

			// poll to see if checks have completed.
			var uploadTimer = setInterval(function() {
				req.appApi.getModelInfo(data.modelId, function(error, data) {
					console.log(error, data.printable, data.materials["26"].isPrintable);

					modelPrintable = data.printable;
					materialPrintable = data.materials["26"].isPrintable;

					// if model is ready
					if (modelPrintable == "yes" && materialPrintable == true) {
						clearInterval(uploadTimer);
						res.redirect(data.urls.publicProductUrl.address);
						console.log("COMPLETE");
					}

					// if model cannot be printed
					if (modelPrintable == "no") {
						clearInterval(uploadTimer);
						res.redirect(data.urls.publicProductUrl.address);
						console.log("MODEL IS NOT PRINTABLE");
					}

				});
			}, 10000/*ms*/);

		});
	});
});

module.exports = router;
