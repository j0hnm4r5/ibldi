var container;
var camera, scene, renderer;
var controls;
var activeMergedMesh, activeCompleteMesh, activeFilename;

function hideWelcome() {

	var wash = document.getElementById('wash');
	var lightbox = document.getElementById('welcome');

	wash.style.display = "none";
	lightbox.style.display = "none";
}

init();
render();

function onMapClick(e) {
	console.log(getTileXY(e.latlng.lat, e.latlng.lng, 18));
	var row = getTileXY(e.latlng.lat, e.latlng.lng, 18)[0];
	var col = getTileXY(e.latlng.lat, e.latlng.lng, 18)[1];
	
	loadMesh(row, col, 18);
}
map.on('click', onMapClick);

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function UrlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}

function init() {

	container = document.getElementById('viewer');

	// camera creation ---------
	var fov = 35;
	var aspect = container.clientWidth / container.clientHeight;
	camera = new THREE.PerspectiveCamera(fov, aspect, 1, 20000);


	// camera position ----------
	camera.position.z = 900;
	camera.position.y = 100;

	// scene/light creation ----------
	scene = new THREE.Scene();

	var ambient = new THREE.AmbientLight(0xcccccc);
	scene.add(ambient);

	var directionalLight = new THREE.DirectionalLight(0xffaabb);
	directionalLight.position.set(1, 1, 1).normalize();
	scene.add(directionalLight);

	// renderer ----------
	renderer = new THREE.WebGLRenderer({alpha: true});
	renderer.setPixelRatio(window.devicePixelRatio);
	// renderer.setClearColor(0xffffff);
	renderer.setSize(container.clientWidth, container.clientHeight);
	container.innerHTML = "";
	container.appendChild(renderer.domElement);

	window.addEventListener('resize', onWindowResize, false);

	if (sessionStorage["row"] && sessionStorage["col"] && sessionStorage["zoom"]) {
		loadMesh(sessionStorage["row"], sessionStorage["col"], sessionStorage["zoom"]);
	}
}

function loadMesh(row, col, zoom) {
	var loader = new THREE.OBJMTLLoader();

	var filepath = "models/";

	var filename = "" + zoom + '_' + row + '_' + col;
	if (UrlExists(filepath + filename + '.obj')) {
		
		loader.load(
			true, // merge duplicate vertices
			filepath + filename + '.obj', 	// obj
			filepath + filename + '.mtl', 	// mtl
			function(object) {	// called when loaded

				scene.remove(activeMergedMesh);

				var mesh = object.children[0].children[0];

				makeSolid(mesh);
				
				mesh.material.side = THREE.DoubleSide;
				mesh.material.shading = THREE.FlatShading;
				mesh.geometry.computeBoundingBox();

				mesh.position.x -= (mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x) / 2;
				mesh.position.y -= (mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y) / 2;

				activeMergedMesh = mesh;
				activeFilename = filename;

				sessionStorage["row"] = row;
				sessionStorage["col"] = col;
				sessionStorage["zoom"] = zoom;

				scene.add(activeMergedMesh);
				console.log(activeMergedMesh);
			}
		);

		loader.load(
			false, // merge duplicate vertices
			filepath + filename + '.obj', 	// obj
			filepath + filename + '.mtl', 	// mtl
			function(object) {	// called when loaded

				var mesh = object.children[0].children[0];

				activeCompleteMesh = mesh;
			}
		);

	} else {
		console.log("Data Unavailable at this Location");
	}
}

function recenter() {

	var address = document.getElementById('bar').value;
	console.log(address);

	var geocoder = new google.maps.Geocoder();
	if (address != "enter landmark or address") {
		geocoder.geocode( {'address': address}, function(results, status) {
			console.log(status);
			var lat = results[0].geometry.location.lat();
			var lng = results[0].geometry.location.lng();
			console.log(lat, lng);
			map.setView([lat, lng], 18);
		});
	}
}

function makeSolid(mesh) {

	function hashEdge(v1, v2) {

		// Vector hashing algorithm from Optimized Spatial Hashing for Collision Detection of Deformable Objects (http://www.beosil.com/download/CollisionDetectionHashing_VMV03.pdf)

		// large prime numbers
		var p1 = 105037,
			p2 = 200009;

		s1 = [v1, v2].sort()[0];
		s2 = [v1, v2].sort()[1];

		return ((s1 * p1) ^ (s2 * p2));
	}

	// Transversal algorithm from Darren Engwirda (http://stackoverflow.com/a/14109211/2543753)

	// find all edges only referenced once -----
	var allEdges = {};
	var boundaries = [];
	var faces = mesh.geometry.faces;

	// hash and add all edges to allEdges
	for (var j = faces.length - 1; j >= 0; j--) {
		var face = faces[j];

		// ab
		hash = String(hashEdge(face.a, face.b));
		if (hash in allEdges) {
			allEdges[hash] += 1;
		} else {
			allEdges[hash] = 0;
		}

		// bc
		hash = String(hashEdge(face.b, face.c));
		if (hash in allEdges) {
			allEdges[hash] += 1;
		} else {
			allEdges[hash] = 0;
		}

		// ca
		hash = String(hashEdge(face.c, face.a));
		if (hash in allEdges) {
			allEdges[hash] += 1;
		} else {
			allEdges[hash] = 0;
		}
	}

	// add all unshared edges to boundaries list
	for (var j = faces.length - 1; j >= 0; j--) {
		var face = faces[j];

		// ab
		hash = String(hashEdge(face.a, face.b));
		if (allEdges[hash] == 0) {
			boundaries.push([face.a, face.b]);
		}

		// bc
		hash = String(hashEdge(face.b, face.c));
		if (allEdges[hash] == 0) {
			boundaries.push([face.b, face.c]);
		}

		// ca
		hash = String(hashEdge(face.c, face.a));
		if (allEdges[hash] == 0) {
			boundaries.push([face.c, face.a]);
		}
	}


	// make edge loop -----

	var geo = new THREE.Geometry();
	var mat = new THREE.LineBasicMaterial({color: 0xffffff, linewidth: 3});

	var edgeLoop = [];

	edgeLoop.push(boundaries[0][0]);
	edgeLoop.push(boundaries[0][1]);

	var v0 = edgeLoop[1];
	var tempBugFix = 0;
	// while (v0 != edgeLoop[0]) {
	while (tempBugFix < 3000) { // TODO: edge following does not work all the time. This time-outs the follower.

		for (var j = boundaries.length - 1; j >= 0; j--) {

			if (boundaries[j][2] != true) {
			
				if (boundaries[j][0] == v0) {
					edgeLoop.push(boundaries[j][1]);

					mesh.geometry.vertices[boundaries[j][1]].x = Math.round(mesh.geometry.vertices[boundaries[j][1]].x);
					mesh.geometry.vertices[boundaries[j][1]].y = Math.round(mesh.geometry.vertices[boundaries[j][1]].y);
					
					mesh.geometry.verticesNeedUpdate = true;

					geo.vertices.push(mesh.geometry.vertices[boundaries[j][1]]);

					boundaries[j][2] = true;
					v0 = boundaries[j][1];

					break;
				}

				if (boundaries[j][1] == v0) {
					edgeLoop.push(boundaries[j][0]);

					mesh.geometry.vertices[boundaries[j][0]].x = Math.round(mesh.geometry.vertices[boundaries[j][0]].x);
					mesh.geometry.vertices[boundaries[j][0]].y = Math.round(mesh.geometry.vertices[boundaries[j][0]].y);

					mesh.geometry.verticesNeedUpdate = true;
					geo.vertices.push(mesh.geometry.vertices[boundaries[j][0]]);
					
					boundaries[j][2] = true;
					v0 = boundaries[j][0];

					break;
				}
			}
		}
		tempBugFix++;
	}

	var boundary = new THREE.Line(geo, mat);
	boundary.position.x = mesh.position.x;
	boundary.position.y = mesh.position.y;

	// make base -----

	var geo = new THREE.Geometry();
	var mat = new THREE.MeshBasicMaterial({color: 0x222222, side: THREE.DoubleSide});
	// var mat = new THREE.MeshBasicMaterial({color: 0x12f0ab, wireframe: true});

	// vertices
	for (var p = 0, l = boundary.geometry.vertices.length; p < l; p++) {
		geo.vertices.push(boundary.geometry.vertices[p]);
		geo.vertices.push(new THREE.Vector3(boundary.geometry.vertices[p].x, boundary.geometry.vertices[p].y, -15));
	}

	
	// edge faces
	var face;
	for (var p = 0, l = geo.vertices.length; p < l; p+=2) {

		face = new THREE.Face3(p, (p + 1) % geo.vertices.length, (p + 2) % geo.vertices.length);
		geo.faces.push(face);
		face = new THREE.Face3((p + 3) % geo.vertices.length, (p + 2) % geo.vertices.length, (p + 1) % geo.vertices.length);
		geo.faces.push(face);

	}
	face = new THREE.Face3((p + 3) % geo.vertices.length, (p + 2) % geo.vertices.length, (p + 1) % geo.vertices.length);
	geo.faces.push(face);

	// bottom face
	var lastIndex = geo.vertices.push(new THREE.Vector3(127, 127, -15)) - 1;
	for (var p = 1, l = geo.vertices.length; p < l; p += 2) {
		var face = new THREE.Face3(p, lastIndex, (p + 2) % geo.vertices.length);
		geo.faces.push(face);
	}
	geo.faces[geo.faces.length - 1].c = 1; // since center point is part of the array, the last face needs to skip over it


	var sides = new THREE.Mesh(geo, mat);
	sides.position.x = mesh.position.x;
	sides.position.y = mesh.position.y;
	// scene.add(sides);

	mesh.add(sides);

	// mesh.geometry.merge(sides.geometry);
	// mesh.geometry.verticesNeedUpdate = true;
	// mesh.geometry.elementsNeedUpdate = true;
}

function exportVRML(mergedMesh, completeMesh, filename) {


	var output = "";

	output += "#VRML V2.0 utf8" + '\n';
	output += '\n';



	// BUILDINGS
	{
		var geometry = completeMesh.geometry;

		output += "Shape {" + '\n';
		output += '\n';

		output += '\t' + "appearance Appearance {" + '\n';
		output += '\t' + '\t' + "texture ImageTexture {" + '\n';
		output += '\t' + '\t' + '\t' + 'url ["' + filename + '.jpg"]' + '\n';
		output += '\t' + '\t' + '\t' + "repeatS FALSE" + '\n';
		output += '\t' + '\t' + '\t' + "repeatT FALSE" + '\n';
		output += '\t' + '\t' + "}" + '\n';
		output += '\t' + "}" + '\n';
		output += '\n';

		output += '\t' + "geometry IndexedFaceSet {" + '\n';
		output += '\t' + '\t' + "ccw TRUE" + '\n';
		output += '\t' + '\t' + "convex TRUE" + '\n';
		output += '\t' + '\t' + "solid FALSE" + '\n';
		output += '\n';

		// FACES (P1, P2, P3)
		output += '\t' + '\t' + "coordIndex [" + '\n';

		for (var i = 0, l = geometry.faces.length; i < l; i++) {
			var face = geometry.faces[i];
			output += '\t' + '\t' + '\t' + face.a + ", " + face.b + ", " + face.c + ", -1," + '\n';
		};

		output += '\t' + '\t' + "]" + '\n';
		output += '\n';

		// POINTS (X, Y, Z)
		output += '\t' + '\t' + "coord Coordinate { point [" + '\n';

		for (var i = 0, l = geometry.vertices.length; i < l; i++) {
			var vertex = geometry.vertices[i];
			// if (vertex.x > 255.5) vertex.x = 256;
			// if (vertex.y > 255.5) vertex.y = 256;
			// if (vertex.x < .5) vertex.x = 0;
			// if (vertex.x < .5) vertex.y = 0;
			output += '\t' + '\t' + '\t' + vertex.x + " " + vertex.y + " " + vertex.z + "," + '\n' ;
		};

		output += '\t' + '\t' + "] }" + '\n';
		output += '\n';

		// TEXTURES (U, V)
		output += '\t' + '\t' + "texCoord TextureCoordinate { point [" + '\n';

		var uvCoords = {};
		for (var i = 0, l = geometry.faceVertexUvs[0].length; i < l; i++) {
			var vertexUvs = geometry.faceVertexUvs[0][i];
			var face = geometry.faces[i];

			if (!uvCoords[face.a]) uvCoords[face.a] = vertexUvs[0];
			if (!uvCoords[face.b]) uvCoords[face.b] = vertexUvs[1];
			if (!uvCoords[face.c]) uvCoords[face.c] = vertexUvs[2];

			// uvCoords[face.a] = vertexUvs[0];
			// uvCoords[face.b] = vertexUvs[1];
			// uvCoords[face.c] = vertexUvs[2];
		}

		// console.log(uvCoords.length);
		console.log(Object.keys(uvCoords).length);

		for (var i = 0; i < geometry.vertices.length; i++) {
			var uv = uvCoords[i];
			output += '\t' + '\t' + '\t' + uv.x + " " + uv.y + ", " + '\n';
		}
		output += '\t' + '\t' + "] }" + '\n';
		output += '\n';

		output += '\t' + "}" + '\n';
		output += '\n';

		output += "}" + '\n';
		output += '\n';
	}

	// SIDES & BOTTOM
	{
		geometry = mergedMesh.children[0].geometry;

		output += "Shape {" + '\n';
		output += '\n';

		output += '\t' + "geometry IndexedFaceSet {" + '\n';
		output += '\t' + '\t' + "ccw TRUE" + '\n';
		output += '\t' + '\t' + "convex TRUE" + '\n';
		output += '\t' + '\t' + "solid FALSE" + '\n';
		output += '\n';

		// FACES (P1, P2, P3)
		output += '\t' + '\t' + "coordIndex [" + '\n';

		for (var i = 0, l = geometry.faces.length; i < l; i++) {
			var face = geometry.faces[i];
			output += '\t' + '\t' + '\t' + face.a + ", " + face.b + ", " + face.c + ", -1," + '\n';
		};

		output += '\t' + '\t' + "]" + '\n';
		output += '\n';

		// POINTS (X, Y, Z)
		output += '\t' + '\t' + "coord Coordinate { point [" + '\n';

		for (var i = 0, l = geometry.vertices.length; i < l; i++) {
			var vertex = geometry.vertices[i];
			output += '\t' + '\t' + '\t' + vertex.x + " " + vertex.y + " " + vertex.z + "," + '\n' ;
		};

		output += '\t' + '\t' + "] }" + '\n';
		output += '\n';

		output += '\t' + "}" + '\n';
		output += '\n';


		output += "}" + '\n';
		output += '\n';
	}

	function post(path, params, method) {
		method = method || "post"; // Set method to post by default if not specified.

		var form = document.createElement("form");
		form.setAttribute("method", method);
		form.setAttribute("action", path);

		for(var key in params) {
			if(params.hasOwnProperty(key)) {
				var hiddenField = document.createElement("input");
				hiddenField.setAttribute("type", "hidden");
				hiddenField.setAttribute("name", key);
				hiddenField.setAttribute("value", params[key]);

				form.appendChild(hiddenField);
			}
		}

		document.body.appendChild(form);
		form.submit();
	}

	post("/upload", { "name": activeFilename, "vrml": output });

	var wash = document.getElementById('wash');
	var lightbox = document.getElementById('uploading');
	var quote = document.getElementById('quotes');

	wash.style.display = "inline";
	lightbox.style.display = "inline";

	var quotes = [
		"Marking area for extraction...",
		"Sharpening diamond saw blades...",
		"Evacuating citizens...",
		"Launching fleet of skycranes...",
		"Affixing lift-ropes to corners...",
		"Relocating superheroes...",
		"Applying full upward thrust...",
		"Gawking at giant hole...",
		"Rerouting public transit...",
		"Patching things up with locals...",
		"Checking for seismic activity...",
		"Applying shrink-ray...",
		"Analyzing structural integrity...",
		"Uploading...",
		"Still uploading...",
		"Well, technically, the model is already uploaded, but...",
		"Shapeways is running checks on it to make sure it's printable.",
		"Big models take a long time to check.",
		"Almost done! Maybe.",
		"Wow, this sure is taking a long time, huh?",
		"I'm going to tell you a story about the time I extracted a city:"
	];

	var q = 0;
	window.setInterval(function() {
		quote.innerHTML = quotes[q % quotes.length];
		q++;
	}, 5000);
}

var angle = 0;
var waveHeight = .1;
function updateCamera() {

	if (activeMergedMesh) {
		angle += .01;
		activeMergedMesh.rotation.y = (Math.sin(angle) * waveHeight);
		activeMergedMesh.rotation.x = (Math.sin(angle * 2) * waveHeight) - Math.PI / 4;
		// activeMergedMesh.rotation.z = angle / 2;
	}
}

function onWindowResize() {

	// screen resize ----------
	camera.aspect = container.clientWidth / container.clientHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(container.clientWidth, container.clientHeight);
}

function render() {
	requestAnimationFrame(render);
	// controls.update();
	updateCamera();
	renderer.render(scene, camera);
} 