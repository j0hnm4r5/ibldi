function mapRange(val, fromMin, fromMax, toMin, toMax) {
  return toMin + (val - fromMin) * (toMax - toMin) / (fromMax - fromMin);
};

function getTileXY(lat, lon, zoom) {
  // from Lukas Vrabel (http://stackoverflow.com/a/23058284/2543753)
  var x = parseInt(Math.floor((lon + 180) / 360 * (1<<zoom) ));
  var y = parseInt(Math.floor((1 - Math.log(Math.tan(lat * 0.0174532925) + 1 / Math.cos(lat * 0.0174532925)) / Math.PI) / 2 * (1<<zoom) ));
  return [x, y];
}

// function getTileLatLng(row, col, zoom) {

//   Math.sinh = Math.sinh || function(x) {
//     var y = Math.exp(x);
//     return (y - 1 / y) / 2;
//   }

//   var n = zoom Math.pow(zoom, 2);
//   var lon_deg = row / n * 360.0 - 180.0;
//   var lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * col / n)));
//   var lat_deg = lat_rad * (180 / Math.PI);

//   return [lat_deg, lon_deg];
// }

var map = L.map('map',{
	minZoom: 18,
	maxZoom: 18,
	zoomControl: false,
});

var southWest = L.latLng(40.6878, -74.0294),
  northEast = L.latLng(40.8915, -73.8918),
  bounds = L.latLngBounds(southWest, northEast);
map.setMaxBounds(bounds);

// map.setView([mapRange(Math.random(), 0, 1, southWest.lat, northEast.lat), mapRange(Math.random(), 0, 1, southWest.lng, northEast.lng)], 18);
map.setView([mapRange(Math.random(), 0, 1, 40.71, 40.79), mapRange(Math.random(), 0, 1, -74, -73.9)], 18);

L.tileLayer.provider('HERE.pedestrianDay', {
    app_id: 'lRi32xAykGrNZkTXlefT',
    app_code: 'La8aehptZXdUh3eOd-LedA',
    attribution: '<a href="http://threejs.org/">Three.js</a> | <a href="http://www.here.com/">here.com</a> | Inspired by <a href="http://terrafab.bengler.no/">terrafab</a> | Designed by <a href="http://m4r5.io">John Mars</a> for <a href="http://golancourses.net/2015/">IACD 2015</a> @ <a href="http://www.cmu.edu/">CMU</a> | <a href="https://www.shapeways.com/forum/index.php?t=ppost&toi=816799">Report a Problem</a>',
}).addTo(map);