// Work & Home Map Visualization with different day times
const passengers = [1, 10, 50, 200, 1000, 2000, 5000, 10000];
const rings_colors = {10: '#eb4334', 20: '#345feb', 50: '#22d457'};
var rings = {};
var rings_layer;
var data = {true: {}, false: {}};
var clicked_layers = [];
var top10 = [];
var popup;
var day_time = 9;
var is_home = true;
var is_rings = false;
var is_control = false;
var reader = new jsts.io.GeoJSONReader();
var writer = new jsts.io.GeoJSONWriter();
var factory = new jsts.geom.GeometryFactory();

// Map configuration
// Creating the map object, and adding a tile layer, JSON polgons layer and layer group for the rings
const map = L.map('mapid', {boxZoom: false, zoomControl: false}).setView([31.5, 35], 7);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(map);
L.control.zoom({position: 'topright'}).addTo(map);
geo = L.geoJson(polygons, {onEachFeature: onEachFeature}).addTo(map);
geo.setStyle(style);
rings_layer = L.layerGroup().addTo(map);
// Adding the map controls
createInfoControl();
createLegendControl();
createLoaderControl();
// Initialize the map when the 1000th layer is clicked (the ID of the clicked polygon depends on the
// Leaflet code and changes every time)
geo.getLayer(1000).fire('click');
buttonClick(day_time);

map.on({
	keydown: onKeyDown,
	keyup: onKeyUp,
	zoomend: onZoom
});

function getColor(p, is_clicked=false, is_legend=false) {
	/**
	 * Get the color of a polygon according to its passangers count
	 * @param {Number} p The passengers of the polygon
	 * @param {Boolean} is_clicked Is the polygon clicked
	 * @param {Boolean} is_legend Is the function called from legend control
	 * @return {String} The polygon color
	 */
	if (is_clicked && !is_legend)
        p = clicked_layers.map((a) => geo.getLayer(a).feature.properties['passengers']).reduce((a, b) => a + b);
	if ((is_home && !is_clicked) || (!is_home && is_clicked)) {
		return p > passengers[7] ? '#800026':
		   p > passengers[6] ? '#bd0026':
		   p > passengers[5] ? '#e31a1c':
		   p > passengers[4] ? '#fc4e2a':
		   p > passengers[3] ? '#fd8d3c':
		   p > passengers[2] ? '#feb24c':
		   p > passengers[1] ? '#fed976':
		   p > passengers[0] ? '#ffeda0':
		   		   			   '#ffffff';
	}
	return p > passengers[7] ? '#081d58':
		   p > passengers[6] ? '#253494':
		   p > passengers[5] ? '#225ea8':
		   p > passengers[4] ? '#1d91c0':
		   p > passengers[3] ? '#41b6c4':
		   p > passengers[2] ? '#7fcdbb':
		   p > passengers[1] ? '#c7e9b4':
		   p > passengers[0] ? '#edf8b1':
		   		   			   '#ffffff';
}

function style(feature, is_clicked=false) {
	/**
	 * Define the style of a polygon
	 * @param {Feature} feature The polygon feature
	 * @param {Boolean} is_clicked Is the polygon clicked
	 * @return {Object} The polygon style
	 */
	let fill = getColor(feature.properties['passengers'], is_clicked);
	return {
		fillColor: fill,
		weight: is_clicked || map.getZoom() >= 12 ? 2 : map.getZoom() >= 10 ? 1 : 0,
		color: is_clicked ? '#8a8a8a' : 'white',
		fillOpacity: fill == '#ffffff' ? 0.5 : 0.7
	};
}

function onEachFeature(feature, layer) {
	/**
	 * Set polygon functions for mouse events
	 * @param {Feature} feature The polygon feature (Not necessary - the function is being called with it automatically)
	 * @param {Layer} layer The polygon layer
	 */
	layer.on({
		mouseover: onOver,
		mouseout: onOut,
		mousemove: onMove,
		click: onClick,
	});
}

// Mouse events
function onOver(feature) {
	/**
	 * Change the map when the mouse is over a polygon
	 * @param {Feature} feature The polygon feature
	 */
	if (!clicked_layers.includes(geo.getLayerId(feature.target))) {
		feature.target.setStyle({
			color: '#b8b8b8'
		});
	}
	feature.target.bringToFront();
	for (var i in clicked_layers)
		geo.getLayer(clicked_layers[i]).bringToFront();
	var name = feature.target.feature.properties['name'].length > 35 ? feature.target.feature.properties['name'].slice(0, 35) + '...' : feature.target.feature.properties['name'];
	feature.target.bindPopup('<div dir="rtl" align="right">אזור תנועה <b>#' + feature.target.feature.properties['ID'] + '</b>' + '<br>' + name + '<br><b>' + feature.target.feature.properties['passengers'].toString() + '</b> נסיעות</div>', {closeButton: false, autoPan: false});
	feature.target.openPopup();
	popup = feature.target.getPopup();
}

function onOut(feature) {
	/**
	 * Change the map when the mouse is out of a polygon
	 * @param {Feature} feature The polygon feature
	 */
	if (!clicked_layers.includes(geo.getLayerId(feature.target))) {
		feature.target.setStyle({
			color: 'white'
		});
	}
	feature.target.closePopup();
	rings_layer.eachLayer(function(layer) {
		layer.bringToFront();
	})
}

function onMove(feature) {
	/**
	 * Change the map when the mouse moves
	 * @param {Feature} feature The mouse feature
	 */
	popup.setLatLng(feature.latlng);
}

function onZoom() {
	/**
	 * Change the map when the it's being zoomed
	 */
	geo.eachLayer(function(layer) {
        layer.setStyle(style(layer.feature, clicked_layers.includes(geo.getLayerId(layer))));
    });
}

function onClick(feature) {
	/**
	 * Change the map when a polygon is clicked
	 * @param {Feature} feature The polygon feature
	 */
	if (is_control) {
		if (clicked_layers.includes(geo.getLayerId(feature.target))) {
			if (clicked_layers.length > 1)
				clicked_layers.splice(clicked_layers.indexOf(geo.getLayerId(feature.target)), 1);
		}
		else
			clicked_layers.push(geo.getLayerId(feature.target));
	}
	else
		clicked_layers = [geo.getLayerId(feature.target)];
	restyleMap();
}

// Data calculations
function calcPassengers(feature) {
	/**
	 * Calculate the passangers count of a polygon
	 * @param {Feature} feature The polygon feature
	 */
	var sum = 0;
	for (var i in clicked_layers) {
		var cur_id = geo.getLayer(clicked_layers[i]).feature.properties['ID'];
		if (day_time == 8) // Morning (6 AM + 7 AM + 8 AM)
			sum += data[is_home][cur_id][feature.properties['ID']-1].slice(0, 3).reduce((a, b) => a + b);
		else if (day_time == 9) // All Day
			sum += data[is_home][cur_id][feature.properties['ID']-1].reduce((a, b) => a + b);
		else // Specific day time
			sum += data[is_home][cur_id][feature.properties['ID']-1][day_time];
	}
	feature.properties['passengers'] = sum;
}

function calcRings() {
	/**
	 * Calculate the distance of each polygon from the clicked polygons and sort them by categories
	 * @return {Object} The distance categories with the geometry of each polygon
	 */
	var center = [];
	for (var i in clicked_layers)
		center.push(turf.point(geo.getLayer(clicked_layers[i]).feature.properties['center']));
	var collections = {10: [], 20: [], 50: []};
	geo.eachLayer(function(layer) {
		var cur_center = turf.point(layer.feature.properties['center']);
		var min_distance = 9999;
		for (var i in center) {
			var cur_distance = turf.distance(center[i], cur_center);
			if (cur_distance < min_distance)
				min_distance = cur_distance;
		}
		layer.feature.properties['distance'] = min_distance;
		if (min_distance <= 10)
			collections[10].push(reader.read(layer.feature.geometry));
		else if (min_distance <= 20)
			collections[20].push(reader.read(layer.feature.geometry));
		else if (min_distance <= 50)
			collections[50].push(reader.read(layer.feature.geometry));
	});
	return collections;
}

function unionRings(collections) {
	/**
	 * Union the rings of each category polygons
	 * @param {Object} collections The distance categories from calcRings()
	 */
	rings = {10: [], 20: [], 50: []};
	var last = {50: 20, 20: 10, 10: 10};
	for (var i in collections) {
		var collection = new jsts.geom.GeometryCollection(rings[last[i]].map((r) => reader.read(r.toGeoJSON().geometry)).concat(collections[i]), factory);
		var union = writer.write(new jsts.operation.union.UnaryUnionOp(collection).union()).coordinates;
		if (union[0][0].length != 2) { // More than one polygon
			for (var j in union) {
				var p = L.polygon(turf.flip(turf.polygon(union[j])).geometry.coordinates[0], {color: rings_colors[i], fillOpacity: 0, interactive: false});
				rings[i].push(p);
			}
		}
		else {
			var p = L.polygon(turf.flip(turf.polygon(union)).geometry.coordinates[0], {color: rings_colors[i], fillOpacity: 0, interactive: false});
			rings[i].push(p);
		}
	}
}

// Server requests
function loadData(id) {
	/**
	 * Load the passengers data of the given polygon from the server [Async Function]
	 * @param {Integer} id The polygon ID
	 */
	$.ajax({url: '/cgi-bin/server.py',
			typle: 'get',
			data: {'request': 'DATA', 'clicked_id': id, 'map_id': 1, 'is_home': is_home},
			dataType: 'text',
			success: function(response) {
				response = response.slice(0, response.length-1); // Response always contains unnecessary \n at the end!
				var arr = [];
				var parts = response.split('|');
				for (var i in parts) {
					if (parts[i] == '')
						arr.push([0, 0, 0, 0, 0, 0, 0]);
					else
						arr.push(parts[i].slice(1, parts.length-1).split(',').map((c) => parseInt(c)));
				}
				data[is_home][id] = arr;
				restyleMap();
			}
		}
	);
}

function checkPassword(password) {
	/**
	 * Check with the server if the password is correct [Async Function]
	 * @param {String} password The password
	 */
	$.ajax({url: '/cgi-bin/server.py',
			typle: 'get',
			data: {'request': 'CONNECT', 'password': password},
			dataType: 'text',
			success: function(response) {
				response = response.slice(0, response.length-1); // Response always contains unnecessary \n at the end!
				if (response == 'True')
					document.documentElement.style.display = ''; // Releasing the map
				else
					window.onload(); // Opening the dialogue again
			}
		}
	);
}

// Keyboard events
function onKeyDown(event) {
	/**
	 * Change the is_control boolean to the Ctrl button state
	 * @param {Event} event Key down event
	 */
	if (event.originalEvent.key == 'Control')
		is_control = true;
}

function onKeyUp(event) {
	/**
	 * Change the is_control boolean to the Ctrl button state
	 * @param {Event} event Key up event
	 */
	if (event.originalEvent.key == 'Control')
		is_control = false;
}

// Window events
window.onblur = function() {
	/**
	 * Set is_control to false when the page is out of focus
	 */
	is_control = false;
}

window.onload = function() {
	/**
	 * Open the dialogue and ask for password
	 */
	document.documentElement.style.display = 'none';
	var password;
	do {
		password = prompt('Please enter the password');
	} while (password == null);
	checkPassword(password);
}

// Map and tooltips updates
function restyleMap(is_rings_changed=true) {
	/**
	 * Restyle the map when something has changed
	 * @param {Boolean} is_rings_changed Have the rings changed and should be recalculated
	 */
	loader.open();
	// Loading passengers data if needed; The function will be called again for each polygon data.
	for (var i in clicked_layers) {
		var id = geo.getLayer(clicked_layers[i]).feature.properties['ID'];
		if (!(id in data[is_home])) {
			loadData(id);
			return;
		}
	}
	// Calculating rings and uniting them if needed
	var collections = calcRings();
	if (is_rings && is_rings_changed)
		unionRings(collections);
	// Restyling the map layers
	geo.eachLayer(function(layer) {
		calcPassengers(layer.feature);
		layer.setStyle(style(layer.feature, clicked_layers.includes(geo.getLayerId(layer))));
		layer.bringToFront();
	});
	for (var i in clicked_layers)
		geo.getLayer(clicked_layers[i]).bringToFront();
	// Redrawing rings if needed
	rings_layer.clearLayers();
	if (is_rings) {
		var keys = [50, 20, 10];
		for (var i of keys) {
			for (var j of rings[i]) {
				rings_layer.addLayer(j);
			}
		}
	}
	// Updating tooltips and controls
	updateTooltips();
	info.update(geo.getLayer(clicked_layers[clicked_layers.length - 1]).feature);
	legend.update();
	loader.close()
}

function updateTooltips() {
	/**
	 * Update the tooltips when something has changed
	 */
	var passengers = [];
	geo.eachLayer(function(layer) {
		passengers.push({
			id: geo.getLayerId(layer),
			value: layer.feature.properties['passengers']
		});
	});
	passengers.sort((a, b) => b.value - a.value);
	top10.length = 0;
	for (var i = 0; i < 10; i++)
		top10.push(passengers[i].id);

	geo.eachLayer(function(layer) {
		layer.unbindTooltip();
		if (top10.includes(geo.getLayerId(layer))) {
			var center = turf.centerOfMass(turf.polygon(layer.feature.geometry.coordinates));
			layer.bindTooltip(layer.feature.properties['passengers'].toString(), {permanent: true, direction: 'center', className: 'label'}).openTooltip();
			layer.openTooltip(L.latLng(center.geometry.coordinates[1], center.geometry.coordinates[0]));
			layer.getTooltip().getElement().style.color = getColor(layer.feature.properties['passengers'], clicked_layers.includes(geo.getLayerId(layer)));
		}
	});
}

// Info control
function createInfoControl() {
	/**
	 * Create the info control containing the current polygon information
	 */
	info = L.control({position: 'topleft'});
	info.onAdd = function(map) {
		this.div = L.DomUtil.create('div', 'info');
		return this.div;
	};
	info.addTo(map);

	info.update = function(feature) {
		var name = feature.properties['name'].length > 35 ? feature.properties['name'].slice(0, 35) + '...' : feature.properties['name'];
		var pop = 0;
		for (var i of clicked_layers)
			pop += geo.getLayer(i).feature.properties['Over8Pop'];
		var travels = 0;
		var total_distance = 0;
		var radius = {0: feature.properties['passengers'], 10: 0, 20: 0, 50: 0};
		geo.eachLayer(function(layer) {
			if (layer.feature.properties['distance'] <= 10)
				radius[10] += layer.feature.properties['passengers'];
			else if (layer.feature.properties['distance'] <= 20)
				radius[20] += layer.feature.properties['passengers'];
			else if (layer.feature.properties['distance'] <= 50)
				radius[50] += layer.feature.properties['passengers'];
			travels += layer.feature.properties['passengers'];
			total_distance += layer.feature.properties['passengers'] * layer.feature.properties['distance'];
		});
		if (travels == 0)
			travels = 1;
		for (var i in radius)
			radius[i] = radius[i] / parseFloat(travels);
		var html = '<div dir="rtl" align="right">אזור תנועה <b>#' + feature.properties['ID'] + '</b>, ' + name + '<br>';
		if (clicked_layers.length == 1) {
				html += 'נסועה של <b>' + parseInt(total_distance) + '</b> ק"מ, בממוצע <b>' + 
						(travels == 0 ? '</b>0 ק"מ<br>' : parseInt(total_distance / travels) + '</b> ק"מ<br>');
		}
		if (pop == null || pop == 0)
			html += 'מבין התושבים מעל גיל 8:<br><b>';
		else
			html += '<b>' + pop + '</b> תושבים מעל גיל 8, מתוכם:<br><b>';
		html += parseInt(100 * radius[0]) + '%</b> נשארים באזור התנועה<br>' + 
				'<d style="color: #eb4334"><b>' + parseInt(100 * radius[10]) + '%</b></d> נשארים ברדיוס של 10 ק"מ<br>' + 
				'<d style="color: #345feb"><b>' + parseInt(100 * (radius[10] + radius[20])) + '%</b></d> נשארים ברדיוס של 20 ק"מ<br>' + 
				'<d style="color: #22d457"><b>' + parseInt(100 * (radius[10] + radius[20] + radius[50])) + '%</b></d> נשארים ברדיוס של 50 ק"מ</div>';
		this.div.innerHTML = html;
	};
}

// Legend control
function createLegendControl() {
	/**
	 * Create the legend control containing the legend and the control panel
	 */
	legend = L.control({position: 'bottomleft'});
	legend.onAdd = function(map) {
		this.div = L.DomUtil.create('div', 'd');
		this.div.setAttribute('style', 'display: flex');
		this.box = L.DomUtil.create('div', 'box', this.div);
		this.legend = L.DomUtil.create('div', 'legend', this.box);
		this.legend.setAttribute('id', 'legend');
		this.legend.innerHTML = '<div class="row">' +
									'<button class="button2" id=2 onClick="buttonClick(this.id)">8</button>' +
									'<button class="button3" id=1 onClick="buttonClick(this.id)">7</button>' +
									'<button class="button4" id=0 onClick="buttonClick(this.id)">6</button>' +
									'<button class="button1" id=8 onClick="buttonClick(this.id)">בוקר</button>' +
								'</div><div class="row">' +
									'<button class="button" id=4 onClick="buttonClick(this.id)">אחה"צ</button>' +
									'<button class="button" id=3 onClick="buttonClick(this.id)">צהריים</button>' +
								'</div><div class="row">' +
									'<button class="button" id=9 onClick="buttonClick(this.id)">יממה</button>' +
									'<button class="button" id=6 onClick="buttonClick(this.id)">לילה</button>' +
									'<button class="button" id=5 onClick="buttonClick(this.id)">ערב</button>' +
								'</div><div align="right" id="text" class="text">' + 
									'<tag id="tag">אזורי התנועה שסומנו<br>הם <b>' + (is_home ? 'מוצאים' : 'יעדים') + '</b></tag>' + 
									'<label class="switch"><input type="checkbox" id="switchHome" onclick="toggle(this.id)" checked><span class="slider round"></span></label><br><div style="padding-top: 1px"></div>' + 
									'הצג רדיוסים<label class="switch"><input type="checkbox" id="switchRings" onclick="toggle(this.id)"><span class="slider round"></span></label>' + 
								'</div>';
		var labels = [0].concat(passengers);
		this.colors = L.DomUtil.create('div', 'colors', this.legend);
		for (var i = 1; i < labels.length; i++) {
			this.colors.innerHTML += '<div style="height: 1.5em"><i style="background: ' + getColor(labels[i] + 1, false, true) + '"></i> ' +
				labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] : '+') + '</div>';
		}
		this.table = L.DomUtil.create('div', 'table', this.box);
		this.table.setAttribute('id', 'table');
		this.table.setAttribute('dir', 'rtl');
		this.expand = L.DomUtil.create('div', 'expand', this.div);
		this.expand.setAttribute('id', 'expand');
		this.expand.setAttribute('onClick', 'buttonClick("expand")');
		this.expand.innerHTML = '<i class="arrow right"></i>';
		this.is_expanded = false;
		return this.div;
	};
	legend.addTo(map);
	this.table.style.height = document.getElementById('legend').offsetHeight;

	legend.update = function() {
		L.DomUtil.get('tag').innerHTML = 'אזורי התנועה שסומנו<br>הם <b>' + (is_home ? 'מוצאים' : 'יעדים') + '</b>';
		var labels = [0].concat(passengers);
		this.colors.innerHTML = '';
		for (var i = 1; i < labels.length; i++) {
			this.colors.innerHTML += '<div style="height: 1.5em"><i style="background:' + getColor(labels[i] + 1, false, true) + '"></i> ' +
				labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] : '+') + '</div>';
		}
		var html = '<table id="top10"><tr>' +
					   "<th style='width: 50px'>מס' אזור התנועה</th>" + 
					   '<th>שם אזור התנועה</th>' + 
					   "<th style='width: 50px'>מרחק אווירי (מ')</th>" + 
					   '<th style="width: 30px">כמות נסיעות</th></tr>';
		for (var i in top10) {
			var properties = geo.getLayer(top10[i]).feature.properties;
			var name = properties['name'].length > 25 ? properties['name'].slice(0, 25) + '...' : properties['name'];
			html += '<tr><td>' + properties['ID'] + '</td>' + 
						'<td>' + name + '</td>' + 
						'<td>' + parseInt(properties['distance'] * 1000) + '</td>' + 
						'<td>' + properties['passengers'] + '</td></tr>';
		}
		this.table.innerHTML = html + '</table>';
	}
}

// Loader Control
function createLoaderControl() {
	/**
	 * Create the loader control while the client loads data from the server
	 */
	loader = L.control({position: 'topright'});
	loader.onAdd = function(map) {
		this.div = L.DomUtil.create('div', 'loader');
		this.is_open = false;
		return this.div;
	}
	loader.addTo(map);

	loader.open = function() {
		if (!this.is_open)
			this.div.innerHTML = '<div class="loading-wheel"></div>';
		this.is_open = true;
	}

	loader.close = function() {
		this.div.innerHTML = '';
		this.is_open = false;
	}
}

function toggle(id) {
	/**
	 * Change the booleans value when the switches in the legend control are toggled
	 * @param {String} id The switch ID
	 */
	if (id == "switchHome") {
		is_home = !is_home;
		legend.update();
		restyleMap(false);
	}
	else if (id == "switchRings") {
		is_rings = !is_rings;
		restyleMap();
	}
}

function buttonClick(id) {
	/**
	 * Change the buttons style when a button in the legend control is clicked
	 * @param {String/Integer} id The button ID
	 */
	if (id == "expand") {
		legend.update();
		if (legend.is_expanded) {
			document.getElementById("table").style.maxWidth = "0px";
			document.getElementById("legend").style.borderRight = "0";
			document.getElementById("legend").style.borderRadius = "5px";
			document.getElementById("expand").innerHTML = '<i class="arrow right"></i>';
		}
		else {
			document.getElementById("table").style.maxWidth = "1000px";
			document.getElementById("legend").style.borderRight = "1px solid #cccccc";
			document.getElementById("legend").style.borderRadius = "5px 0px 0px 5px";
			document.getElementById("expand").innerHTML = '<i class="arrow left"></i>';
		}
		legend.is_expanded = !legend.is_expanded;
	}
	else {
		document.getElementById(day_time).style.color = 'black';
		document.getElementById(day_time).style.backgroundColor = '#ccc';
		document.getElementById(id).style.color = 'white';
		document.getElementById(id).style.backgroundColor = '#2196F3';
		day_time = id;
		restyleMap(false);
	}
}