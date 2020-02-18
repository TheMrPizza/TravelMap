const tile_server_url = 'https://{s}.tile.osm.org/{z}/{x}/{y}.png';
const passengers = [1, 10, 50, 200, 1000, 2000, 5000, 10000];
const rings_colors = { 10: '#ff073a', 20: '#0a0dff', 50: '#39ff14' };
const polygon_colors = { 
	border_clicked: '#ffffff', 
	border_hover: '#7581a2', 
	border_default: '#ababab' 
}
const agg_origin_filter = "agg_origin";
const agg_destination_filter = "agg_destination";
const agg_origin_default = 33;
const agg_destination_default = 33;
const multiselect_agg = 2630;
const dist_graph_agg = 1250;
var rings = {};
var map;
var geo;
var rings_layer;
var data = { true: {}, false: {} };
var distances = {};
var clicked_layers = [];
var top10 = [];
var popup;
var is_home = true;
var is_rings = false;
var is_control = false;
var agg_group_switches = {
	switch_multiselect: false,
	switch_dist_graph: false
};
var reader = new jsts.io.GeoJSONReader();
var writer = new jsts.io.GeoJSONWriter();
var wktwriter = new jsts.io.WKTWriter();
var factory = new jsts.geom.GeometryFactory();
var aggregations = {};

initializeMap();

function initializeMap() {
	let aggLevelInitial = map_filters.agg_origin || agg_origin_default;
	aggregations[aggLevelInitial] = unsafeCopy(polygons);

	map = L.map('mapid', { boxZoom: false, zoomControl: false }).setView([31.5, 35], 7);
	map.on({
		keydown: onKeyDown,
		keyup: onKeyUp,
		zoomend: onZoom,
	});
	L.tileLayer(tile_server_url, { maxZoom: 18 }).addTo(map);
	L.control.zoom({ position: 'topright' }).addTo(map);
	geo = L.geoJSON(polygons, { onEachFeature: onEachFeature }).addTo(map);
	geo.setStyle(style);
	rings_layer = L.layerGroup().addTo(map);

	createInfoControl();
	createLegendControl();
	createDistanceGraph();
	createLoaderControl();
	initializeLegendFilters();
	$('#switch-language-' + currentLang).toggleClass('checked');
}

function initializeLegendFilters() {
	for (let filter in map_filters)
		applyFilter(filter, map_filters[filter]);
	restyleMap(false);
}

function resetMapView() {
	clicked_layers = [];
	rings = { 10: [], 20: [], 50: [] };
	info.update({});
	graph.update(false);
	updateMapAggregation(true, false);
}

function updateMapAggregation(update_origin, recalc_rings = true) {	
	if (!update_origin && clicked_layers.length == 0)
		return;

	let agg_origin_level = is_home ? map_filters.agg_origin : map_filters.agg_destination;
	let agg_destination_level = is_home ? map_filters.agg_destination : map_filters.agg_origin;	
	let has_origin = aggregations[agg_origin_level];
	let has_destination = aggregations[agg_destination_level];
	
	if (has_origin && has_destination) {
		reloadMapLayers(update_origin, agg_origin_level, agg_destination_level);
		restyleMap(recalc_rings);
	} else {
		let aggregation_level = has_origin ? agg_destination_level : agg_origin_level;
		loadAggregatedPolygonsAsync(aggregation_level)
			.then(() => {
				reloadMapLayers(update_origin, agg_origin_level, agg_destination_level);
				restyleMap(recalc_rings);
			});
	}
}

function reloadMapLayers(update_origin, agg_origin, agg_destination) {
	polygons = clicked_layers.length 
				? unsafeCopy(aggregations[agg_destination]) 
				: unsafeCopy(aggregations[agg_origin]);

	let clicked_polys = clicked_layers.map((id) => geo.getLayer(id).feature);
	let clicked_polys_ids;

	if (update_origin) {
		clicked_polys_ids = clicked_polys.map(l => l.properties.related[agg_origin]);
		if (agg_origin != agg_destination) {
			let clicked_origin = 
				unsafeCopy(aggregations[agg_origin].features.filter(f => clicked_polys_ids.includes(f.properties.ID)));
			polygons.features.unshift.apply(polygons.features, clicked_origin)
		}
	} else {
		clicked_polys_ids = clicked_polys.map(l => l.properties.ID);
		if (agg_origin != agg_destination)
			polygons.features.unshift.apply(polygons.features, clicked_polys);
	}
	
	rings = { 10: [], 20: [], 50: [] };
	data = { true: {}, false: {} };
	clicked_layers = [];
	top10 = [];
	map.removeLayer(geo);
	geo = L.geoJSON(polygons, { onEachFeature: onEachFeature }).addTo(map);
	geo.setStyle(style);
	if (clicked_polys_ids.length) {
		geo.eachLayer(function (layer) {
			if (clicked_polys_ids.includes(layer.feature.properties.ID))
				clicked_layers.push(geo.getLayerId(layer));
		});
	}
}

function unsafeCopy(obj) {
	return JSON.parse(JSON.stringify(obj));
}

async function loadAggregatedPolygonsAsync(aggregation_level) {
	return $.ajax({
		url: '/cgi-bin/server.py',
		type: 'get',
		data: {
			'request': 'AGGREGATION',
			'aggregation_level': aggregation_level
		},
		dataType: 'json',
		success: function (response) {
			aggregations[aggregation_level] = response;
		}
	});
}

function restyleMap(is_rings_changed = true) {
	/**
	 * Restyle the map when something has changed
	 * @param {Boolean} is_rings_changed Have the rings changed and should be recalculated
	 */
	loader.open();
	loadPassengersDataAsync().then(() => {
		recalculateRings(is_rings_changed);
		restyleMapLayers();
		redrawRings();
		updateTooltips();
		var feature = clicked_layers.length 
					? geo.getLayer(clicked_layers[clicked_layers.length - 1]).feature 
					: {};
		info.update(feature);
		legend.update();
		loader.close()
	});
}

async function loadPassengersDataAsync() {
	/**
	 * (async) Load passengers data if needed; 
	 * The function will be called again for each polygon data.
	 */
	for (var i in clicked_layers) {
		var layer = geo.getLayer(clicked_layers[i]);
		if (!(layer.feature.properties['ID'] in data[is_home])) {
			await loadDataAsync(layer.feature.properties['ID'], layer.feature.properties['Idx']);
		}
	}
}

function loadDataAsync(id, idx) {
	/**
	 * (async) Load the passengers data of the given polygon from the server [Async Function]
	 * @param {Integer} id The unique polygon ID
	 * @param {Integer} idx The zero-based index of the polygon
	 */

	let agg_origin = is_home ? map_filters.agg_origin : map_filters.agg_destination;
	let agg_destination = is_home ? map_filters.agg_destination : map_filters.agg_origin;

	return $.ajax(
		{
			url: '/cgi-bin/server.py',
			type: 'get',
			data: {
				'request': 'DATA',
				'clicked_id': idx,
				'agg_origin': agg_origin,
				'agg_destination': agg_destination,
				'map_id': map_id,
				'is_home': is_home
			},
			dataType: 'text',
			success: function (response) {
				response = response.trim(); // Response always contains unnecessary \n at the end!
				data[is_home][id] = toDataArray(response);
			}
		}
	);
}

function toDataArray(response_string) {
	let arr = [];
	let parts = response_string.split('|');
	for (var i in parts) {
		if (parts[i] == '')
			arr.push([0, 0, 0, 0, 0, 0, 0]);
		else
			arr.push(parts[i].slice(1, parts[i].length - 1).split(',').map((c) => parseInt(c)));
	}
	return arr;
}

function recalculateRings(is_rings_changed) {
	var collections = calcRings();
	if (is_rings && is_rings_changed)
		unionRings(collections);
}

function calcRings() {
	/**
	 * Calculate the distance of each polygon from the clicked polygons and sort them by categories
	 * @return {Object} The distance categories with the geometry of each polygon
	 */
	var center = [];
	for (var i in clicked_layers) {
		center.push(turf.point(geo.getLayer(clicked_layers[i]).feature.properties['center']));
	}

	var collections = { 10: [], 20: [], 50: [] };
	geo.eachLayer(function (layer) {
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
	rings = { 10: [], 20: [], 50: [] };
	var prev_level = { 50: 20, 20: 10, 10: 10 };
	for (var i in collections) {
		if (collections[i].length) {
			var ring_collection = rings[prev_level[i]].map((r) => reader.read(r.toGeoJSON().geometry));
			var  collection = new jsts.geom.GeometryCollection(ring_collection.concat(collections[i]), factory);
			
			if (!isValid(collection))
				collection = collection.buffer(0);
			
			var union = writer.write(new jsts.operation.union.UnaryUnionOp(collection).union()).coordinates;
			if (union[0][0].length != 2) { // More than one polygon
				for (var j in union) {
					var p = L.polygon(turf.flip(turf.polygon(union[j])).geometry.coordinates[0], { color: rings_colors[i], fillOpacity: 0, interactive: false });
					rings[i].push(p);
				}
			}
			else {
				var flipped = turf.flip(turf.polygon(union));
				var p = L.polygon(flipped.geometry.coordinates[0], { color: rings_colors[i], fillOpacity: 0, interactive: false });
				rings[i].push(p);
			}
		}
	}
}

function isValid(collection) {
	var isValidOp = new jsts.operation.valid.IsValidOp(collection);
	return isValidOp.isValid();
}

function restyleMapLayers() {
	geo.eachLayer(function (layer) {
		calcPassengers(layer.feature);
		layer.setStyle(style(layer.feature, clicked_layers.includes(geo.getLayerId(layer))));
		layer.bringToFront();
	});
	for (var i in clicked_layers)
		geo.getLayer(clicked_layers[i]).bringToFront();
}

function redrawRings(){
	rings_layer.clearLayers();
	if (!is_rings) 
		return;

	var keys = [50, 20, 10];
	for (var i of keys) {
		for (var j of rings[i])
			rings_layer.addLayer(j);
	}
}

function updateTooltips() {
	/**
	 * Update the tooltips when something has changed
	 */
	var passengers = [];
	geo.eachLayer(function (layer) {
		passengers.push({
			id: geo.getLayerId(layer),
			value: layer.feature.properties['passengers']
		});
	});
	passengers.sort((a, b) => b.value - a.value);
	top10.length = 0;
	for (var i = 0; i < 10; i++)
		top10.push(passengers[i].id);

	geo.eachLayer(function (layer) {
		layer.unbindTooltip();
		if (top10.includes(geo.getLayerId(layer)) &&
			layer.feature.properties['passengers']) {
			var center = turf.centerOfMass(turf.polygon(layer.feature.geometry.coordinates));
			layer.bindTooltip(
				layer.feature.properties['passengers'].toString(), 
				{ 
					permanent: true, 
					direction: 'center',
					className: 'label' 
				}).openTooltip();
			layer.openTooltip(L.latLng(center.geometry.coordinates[1], center.geometry.coordinates[0]));
			layer.getTooltip().getElement().style.color = 
				getColor(layer.feature.properties['passengers'], 
						 clicked_layers.includes(geo.getLayerId(layer)));
		}
	});
}

function getColor(p, is_clicked = false, is_legend = false) {
	/**
	 * Get the color of a polygon according to its passangers count
	 * @param {Number} p The passengers of the polygon
	 * @param {Boolean} is_clicked Is the polygon clicked
	 * @param {Boolean} is_legend Is the function called from legend control
	 * @return {String} The polygon color
	 */
	if (is_clicked && !is_legend)
		return '';//p = clicked_layers.map((a) => geo.getLayer(a).feature.properties['passengers']).reduce((a, b) => a + b);
	if ((is_home && !is_clicked) || (!is_home && is_clicked)) {
		return p > passengers[7] ? '#800026' :
			    p > passengers[6] ? '#bd0026' :
			    p > passengers[5] ? '#e31a1c' :
				p > passengers[4] ? '#fc4e2a' :
				p > passengers[3] ? '#fd8d3c' :
				p > passengers[2] ? '#feb24c' :
				p > passengers[1] ? '#fed976' :
				p > passengers[0] ? '#ffeda0' : '#ffffff';
	}
	return p > passengers[7] ? '#081d58' :
			p > passengers[6] ? '#253494' :
			p > passengers[5] ? '#225ea8' :
			p > passengers[4] ? '#1d91c0' :
			p > passengers[3] ? '#41b6c4' :
			p > passengers[2] ? '#7fcdbb' :
			p > passengers[1] ? '#c7e9b4' :
			p > passengers[0] ? '#edf8b1' : '#ffffff';
}

function style(feature, is_clicked = false) {
	/**
	 * Define the style of a polygon
	 * @param {Feature} feature The polygon feature
	 * @param {Boolean} is_clicked Is the polygon clicked
	 * @return {Object} The polygon style
	 */
	let fill = getColor(feature.properties['passengers'], is_clicked);
	let fillOpacity = fill == '' ? 0 :
					  fill == '#ffffff' ? 0.5 : 0.7;
	return {
		fillColor: fill,
		weight: is_clicked || map.getZoom() >= 12 ? 3 : map.getZoom() >= 10 ? 2 : 1,
		color: is_clicked ? polygon_colors.border_clicked : polygon_colors.border_default,
		fillOpacity: fillOpacity
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
		click: onPolygonClick,
	});
}

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

function onOver(feature) {
	/**
	 * Change the map when the mouse is over a polygon
	 * @param {Feature} feature The polygon feature
	 */
	if (!clicked_layers.includes(geo.getLayerId(feature.target))) {
		feature.target.setStyle({
			weight: 2,
			color: polygon_colors.border_hover
		});
	}
	feature.target.bringToFront();
	for (let i in clicked_layers)
		geo.getLayer(clicked_layers[i]).bringToFront();
	let local_name = name_dict[feature.target.feature.properties['ID']][currentLang];
	let name = local_name.length > 35 ? local_name.slice(0, 35) + '...' : local_name;
	let passengers_count = feature.target.feature.properties['passengers'] || 0;
	let travel_label = passengers_count == 1 ? LANG[currentLang].Travel : LANG[currentLang].Travels;
	feature.target.bindPopup(
		'<div dir="' + LANG[currentLang].props.direction + '" align="' + LANG[currentLang].props.alignment + '">' 
		+ LANG[currentLang].Traffic_area + ' <b>#' + feature.target.feature.properties['ID'] + '</b>' 
		+ '<br>' + name + '<br><b>' + passengers_count.toString() 
		+ '</b> ' + travel_label + '</div>', { closeButton: false, autoPan: false });
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
			weight: 1,
			color: polygon_colors.border_default
		});
	}
	feature.target.closePopup();
	rings_layer.eachLayer(function (layer) {
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
	geo.eachLayer(function (layer) {
		layer.setStyle(style(layer.feature, clicked_layers.includes(geo.getLayerId(layer))));
	});
}

function onPolygonClick(feature) {
	/**
	 * Change the map when a polygon is clicked
	 * @param {Feature} feature The polygon feature
	 */
	let agg_levels_match = map_filters.agg_origin == map_filters.agg_destination;
	if (!agg_levels_match && clicked_layers.length)
		return;

	let clicked_id = geo.getLayerId(feature.target);
	if (is_control && agg_group_switches.switch_multiselect) {
		if (clicked_layers.length > 1 && 
			clicked_layers.includes(clicked_id)) {
			clicked_layers.splice(clicked_layers.indexOf(clicked_id), 1);
		} else {
			if (!clicked_layers.includes(clicked_id))
				clicked_layers.push(clicked_id);
		}
	}
	else
		clicked_layers = [clicked_id];

	if (agg_group_switches.switch_dist_graph)
		showDistGraph(clicked_id);

	if (map_filters.agg_origin != map_filters.agg_destination)
		updateMapAggregation(false);
	else
		restyleMap();
}

function showDistGraph(layer_id) {
	if (!distances[layer_id]) {
		var layer = geo.getLayer(layer_id);
		var id = layer.feature.properties["ID"];
		$.ajax({
			url: '/cgi-bin/server.py',
			type: 'get',
			data: {
				'request': 'DISTANCES',
				'clicked_id': id
			},
			success: function (response) {
				// TODO: should return numbers
				distances[layer_id] = response.map(row => row.map(e => parseFloat(e)));
				graph.update(true);
				google.charts.load('current', {'packages':['corechart']});
				google.charts.setOnLoadCallback(() => drawChart(layer_id));
			},
			error: function(xhr, status, error) {
				alert(status);
			}
		});
	} else {
		graph.update(true);
	}
}

function drawChart(id) {
	let raw = [['Destination', 'Total', 
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
	'13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24']];
	for (const arr in distances[id]) {
		for (const arr2 in distances[id][arr]) {
			const el = distances[id][arr][arr2];
		}
	}
	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Day');
	data.addColumn('number', 'Guardians of the Galaxy');
	data.addColumn('number', 'The Avengers');
	data.addColumn('number', 'Transformers: Age of Extinction');

	data.addRows([[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],
		[13],[14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24]
	]);

	var chart = new google.visualization.LineChart(document.getElementById('dist_graph'));
	chart.draw(data, options);
}


window.onload = function () {
	// Open the dialogue and ask for password
	//document.documentElement.style.display = 'none';
	var password;
	// do {
	// 	password = prompt('Please enter the password');
	// } while (password == null);
	// checkPassword(password);
}

window.onblur = function () {
	/**
	 * Set is_control to false when the page is out of focus
	 */
	is_control = false;
}

function checkPassword(password) {
	/**
	 * Check with the server if the password is correct [Async Function]
	 * @param {String} password The password
	 */
	$.ajax({
		url: '/cgi-bin/server.py',
		type: 'get',
		data: { 'request': 'CONNECT', 'password': password },
		dataType: 'text',
		success: function (response) {
			response = response.trim(); // Response always contains unnecessary \n at the end!
			if (response == 'True')
				document.documentElement.style.display = ''; // Releasing the map
			else
				window.onload(); // Opening the dialogue again
		}
	}
	);
}

$('a[id^="switch-language-"]').click(function () {
	$('#switch-language-' + currentLang).toggleClass('checked');
	$(this).toggleClass('checked');
	currentLang = $(this).data('language');
	localStorage.setItem(languageStorageVariable, currentLang)
	var feature = clicked_layers.length ? 
				  geo.getLayer(clicked_layers[clicked_layers.length - 1]).feature : {};
	info.update(feature);
	legend.update();
});

$('#switch_home').click(function() {
	is_home = !is_home;
	legend.update();
	let update_origin = map_filters.agg_origin != map_filters.agg_destination;
	updateMapAggregation(update_origin, is_rings);
});

$('#switch_rings').click(function() {
	is_rings = !is_rings;
	if (clicked_layers.length)
		restyleMap();
});

$('#switch_multiselect').click(function(e) {
	applySwitch(e.target.id, multiselect_agg);
});

$('#switch_dist_graph').click(function(e) {
	applySwitch(e.target.id, dist_graph_agg);
});

function applySwitch(switch_name, aggregation) {
	let show_dist_graph = !agg_group_switches[switch_name];
	toggleAggreationFilters(show_dist_graph);
	
	for (const sname in agg_group_switches)
		agg_group_switches[sname] = false;
	agg_group_switches[switch_name] = show_dist_graph;

	if (show_dist_graph 
		&& !(map_filters.agg_origin == aggregation 
		&& map_filters.agg_origin == map_filters.agg_destination)) {
		applyFilter(agg_origin_filter, aggregation);
		applyFilter(agg_destination_filter, aggregation);
	}
	resetMapView();
}

$('input[type=checkbox].agg-group').click((e) => {
	$('input[type=checkbox].agg-group').not(e.target).each((i, val) => val.checked = false);
});

$("div.filters button").click(function () {
	let filter = $(this).data('filter');
	let value = $(this).data('value');
	applyFilter(filter, value);
	restyleMap(false);
});

$("div.filters-aggregation button").click(function () {
	let agg_filter = $(this).data('filter');
	let agg_value = $(this).data('value');
	let curr_agg_value = map_filters[agg_filter];

	if (curr_agg_value == agg_value)
		return;

	applyFilter(agg_filter, agg_value);
	if (originAggregationChanged(agg_filter)) {
		resetMapView();
		return;
	}
	updateMapAggregation(false);
});

function originAggregationChanged(filter) {
	return is_home && filter == agg_origin_filter ||
		  !is_home && filter == agg_destination_filter;
}

$("button#aggregation-reset").click(function () {
	resetMapView();
});