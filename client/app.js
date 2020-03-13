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
const agg_max = 2630;
const multiselect_agg = 2630;
const dist_graph_agg = 1250;
var rings = {};
var map;
var dist_chart;
var geo;
var rings_layer;
var data = { true: {}, false: {} };
var distributions = { true: {}, false: {} };
var clicked_layers = [];
var top10 = [];
var popup;
var is_home = true;
var is_rings = false;
var is_control = false;
var agg_group_switches = {
	switch_multiselect: map_id == 1 ? false : true,
	switch_dist_graph: false
};
var is_merged = true;
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
	createDistributionGraph();
	createLoaderControl();
	initializeLegendFilters();
	$('#switch-language-' + currentLang).toggleClass('checked');
}

function unsafeCopy(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function createInfoControl() {
	/**
	 * Create the info control containing the current polygon information
	 */
	info = L.control({ position: 'topleft' });
	info.onAdd = function (map) {
		this.div = L.DomUtil.create('div', 'info');
		return this.div;
	};
	info.addTo(map);

	info.update = function (feature) {
		if (!feature.properties) {
			this.div.innerHTML = "";
			this.div.setAttribute('style', 'display: none');
			return;
		}
		this.div.setAttribute('style', 'display: block');
		var local_name = name_dict[feature.properties['ID']][currentLang];
		var name = local_name.length > 35 ? local_name.slice(0, 35) + '...' : local_name;
		var pop = 0;
		for (var i of clicked_layers)
			pop += geo.getLayer(i).feature.properties['Over8Pop'];
		var travels = 0;
		var total_distance = 0;
		var radius = { 0: feature.properties['passengers'], 10: 0, 20: 0, 50: 0 };
		geo.eachLayer(function (layer) {
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
		var html = '<div dir=' + LANG[currentLang].props.direction + ' align=' + LANG[currentLang].props.alignment + '>' + LANG[currentLang].Traffic_area + ' <b>#' + feature.properties['ID'] + '</b>, ' + name + '<br>';
		if (clicked_layers.length == 1) {
			html += LANG[currentLang].Traveled_km + ' <b>' + parseInt(total_distance) + '</b> ' + LANG[currentLang].Km_traveled + LANG[currentLang].Average_of + ' <b>' +
				(travels == 0 ? '</b>0 ' + LANG[currentLang].Km + '<br>' : parseInt(total_distance / travels) + '</b> ' + LANG[currentLang].Km + ' ' + LANG[currentLang].Per_travel + '<br>');
		}
		if (pop == null || pop == 0)
			html += LANG[currentLang].Citizens_over_the_age + ' 8:<br><b>';
		else
			html += '<b>' + pop + '</b> ' + LANG[currentLang].Citizens_over_the_age_of + ' 8, ' + LANG[currentLang].Of_whom + ':<br><b>';
		html += parseInt(100 * radius[0]) + '%</b> ' + LANG[currentLang].Remain_in_the_traffic_area + '<br>' +
			'<d style="color: #eb4334"><b>' + parseInt(100 * radius[10]) + '%</b></d> ' + LANG[currentLang].Remain_within_10 + '<br>' +
			'<d style="color: #345feb"><b>' + parseInt(100 * (radius[10] + radius[20])) + '%</b></d> ' + LANG[currentLang].Remain_within_20 + '<br>' +
			'<d style="color: #22d457"><b>' + parseInt(100 * (radius[10] + radius[20] + radius[50])) + '%</b></d> ' + LANG[currentLang].Remain_within_50 + '</div>';
		this.div.innerHTML = html;
	};
}

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
		this.legend.innerHTML = getMapFiltersHtml();
		
		this.colors = L.DomUtil.create('div', 'colors', this.legend);
		this.colors.innerHTML = getPassengersScaleHtml(passengers);
		
		this.table = L.DomUtil.create('div', 'table', this.box);
		this.table.setAttribute('id', 'table');
		this.table.setAttribute('dir', LANG[currentLang].props.direction);
		
		this.expand = L.DomUtil.create('div', 'expand', this.div);
		this.expand.setAttribute('id', 'expand');
		this.expand.setAttribute('onClick', 'toggleLegendTable()');
		this.expand.innerHTML = '<i class="arrow right"></i>';
		this.is_expanded = false;
		return this.div;
	};
	legend.addTo(map);
	this.table.style.height = document.getElementById('legend').offsetHeight;

	legend.update = function() {
		localizeText();
		let currentTextDirection = this.table.getAttribute('dir');
		let newTextDirection = LANG[currentLang].props.direction;
		if (newTextDirection != currentTextDirection) {
			this.table.setAttribute('dir', newTextDirection);
			toggleControlsDirection();
		}
		this.colors.innerHTML = getPassengersScaleHtml(passengers);
		this.table.innerHTML = getTop10TableHtml();
	}
}

function getPassengersScaleHtml(passengers) {
	let html = '';
	let labels = [0].concat(passengers);
	for (let i = 1; i < labels.length; i++) {
		html += '<div style="height: 1.5em"><i style="background: ' + getColor(labels[i] + 1, false, true) + '"></i> ' +
				labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] : '+') + '</div>';
	}
	return html;
}

function toggleLegendTable() {
	/**
	 * Change the buttons style when a button in the legend control is clicked
	 * @param {String/Integer} id The button ID
	 */
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

function getTop10TableHtml() {
	const MaxNameLength = 25;
	let html = '<table id="top10"><tr>' +
					"<th style='width: 50px'>" + LANG[currentLang].Traffic_area_number + "</th>" + 
					'<th>' + LANG[currentLang].Traffic_area_name + '</th>' + 
					"<th style='width: 50px'>" + LANG[currentLang].Aerial_Distance + "</th>" + 
					'<th style="width: 30px">' + LANG[currentLang].Amount_of_travel + '</th></tr>';
	for (let i in top10) {
		let properties = geo.getLayer(top10[i]).feature.properties;
		let local_name = name_dict[properties['ID']][currentLang];
		let short_name = local_name.length > MaxNameLength 
						? local_name.slice(0, MaxNameLength) + '...' 
						: local_name;
		html += '<tr><td>' + properties['ID'] + '</td>' + 
					'<td>' + short_name + '</td>' + 
					'<td>' + parseInt(properties['distance'] * 1000) + '</td>' + 
					'<td>' + properties['passengers'] + '</td></tr>';
	}
	return html + '</table>';
}

function createDistributionGraph() {
	graph = L.control({position: 'topright'});
	graph.onAdd = function(map) {
		this.div = L.DomUtil.create('div', 'graph');
		this.div.setAttribute('style', 'display: none');
		this.div.innerHTML = getDistributionGraphHtml();
		return this.div;
	};
	graph.addTo(map);

	graph.update = function(show, is_checked) {
		this.div.setAttribute('style', show ? 'display: block' : 'display: none');
		this.div.innerHTML = getDistributionGraphHtml(is_checked);
	}
}

function getDistributionGraphHtml(is_checked) {
	return '<div class="bg-white">' +
				'<div class="padding-5">' + 
					'<input type="checkbox" id="toggle-dist-graph" ' + (is_checked ? 'checked' : '') + '/>' +
					'<label for="toggle-dist-graph">' + LANG[currentLang].Toggle_graph_view + '</label>' +
				'</div>' +
				'<div id="dist_chart" style="width: 500px; height: 300px"></div>' +
			'</div>';
}

function createLoaderControl() {
	/**
	 * Create the loader control while the client loads data from the server
	 */
	loader = L.control({ position: 'topright' });
	loader.onAdd = function (map) {
		this.div = L.DomUtil.create('div', 'loader');
		this.is_open = false;
		return this.div;
	}
	loader.addTo(map);

	loader.open = function () {
		if (!this.is_open)
			this.div.innerHTML = '<div class="loading-wheel"></div>';
		this.is_open = true;
	}

	loader.close = function () {
		this.div.innerHTML = '';
		this.is_open = false;
	}
}

function initializeLegendFilters() {
	for (let filter in map_filters)
		applyFilter(filter, map_filters[filter]);
	restyleMap(false);
}

function applyFilter(filter, newValue) {
	let current_filter = document.getElementById(filter+map_filters[filter]);
	current_filter.style.color = 'black';
	current_filter.style.backgroundColor = '#ccc';

	let selected_filter = document.getElementById(filter+newValue);
	selected_filter.style.color = 'white';
	selected_filter.style.backgroundColor = '#2196F3';

	map_filters[filter] = newValue;
}

function resetMapView() {
	clicked_layers = [];
	rings = { 10: [], 20: [], 50: [] };
	info.update({});
	updateMapAggregation(true, false);
}

function updateMapAggregation(update_origin, recalc_rings = true) {	
	if (!update_origin && clicked_layers.length == 0)
		return;

	let agg_origin_level = agg_max;
	let agg_destination_level = agg_max;
	if (map_filters.agg_origin && map_filters.agg_destination) {
		if (is_home) {
			agg_origin_level = map_filters.agg_origin;
			agg_destination_level = map_filters.agg_destination;	
		} else {
			agg_origin_level = map_filters.agg_destination;
			agg_destination_level = map_filters.agg_origin;	
		}
	}
	let has_origin = aggregations[agg_origin_level];
	let has_destination = aggregations[agg_destination_level];
	
	if (has_origin && has_destination) {
		reloadMapLayers(update_origin, agg_origin_level, agg_destination_level);
		restyleMap(recalc_rings);
	} else {
		let aggregation_level = has_origin ? agg_destination_level : agg_origin_level;
		loader.open();
		loadAggregatedPolygonsAsync(aggregation_level)
			.then(() => {
				loader.close();
				reloadMapLayers(update_origin, agg_origin_level, agg_destination_level);
				restyleMap(recalc_rings);
			});
	}
}

function reloadMapLayers(update_origin, agg_origin, agg_destination) {
	polygons = clicked_layers.length 
				? unsafeCopy(aggregations[agg_destination]) 
				: unsafeCopy(aggregations[agg_origin]);

	let clicked_polys_ids;
	if (!update_origin) {
		let clicked_polys = clicked_layers.map((id) => geo.getLayer(id).feature);
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
	if (clicked_polys_ids) {
		geo.eachLayer(function (layer) {
			if (clicked_polys_ids.includes(layer.feature.properties.ID))
				clicked_layers.push(geo.getLayerId(layer));
		});
	}
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
		let l = geo.getLayer(clicked_layers[i]).feature.properties;
		center.push(turf.point(l['center']));
	}

	var collections = { 10: [], 20: [], 50: [] };
	geo.eachLayer(function (layer) {
		let f = layer.feature.properties;
		var cur_center = turf.point(f['center']);
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
			
			if (!isValidCollection(collection))
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

function isValidCollection(collection) {
	var isValidOp = new jsts.operation.valid.IsValidOp(collection);
	return isValidOp.isValid();
}

function restyleMapLayers() {
	geo.eachLayer(function (layer) {
		calcPassengers(layer.feature);
		layer.setStyle(style(layer.feature, clicked_layers.includes(geo.getLayerId(layer))));
		layer.bringToFront();
	});
	for (var i in clicked_layers) {
		geo.getLayer(clicked_layers[i]).bringToFront();
	}
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
		p = clicked_layers.map((a) => geo.getLayer(a).feature.properties['passengers']).reduce((a, b) => a + b);
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
	let fillOpacity = !shouldFillPolygon(is_clicked) ? 0 :
					  fill == '#ffffff' ? 0.5 : 0.7;
	return {
		fillColor: fill,
		weight: is_clicked || map.getZoom() >= 12 ? 3 : map.getZoom() >= 10 ? 2 : 1,
		color: is_clicked ? polygon_colors.border_clicked : polygon_colors.border_default,
		fillOpacity: fillOpacity
	};
}

function shouldFillPolygon(is_clicked) {
	if (is_home)
		return !is_clicked || map_filters.agg_origin >= map_filters.agg_destination;
	return !is_clicked || map_filters.agg_origin <= map_filters.agg_destination;
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
	if (!isSelectionAllowed())
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

function isSelectionAllowed() {
	let agg_levels_match = map_filters.agg_origin == map_filters.agg_destination;
	return agg_levels_match || !clicked_layers.length;
}

function showDistGraph(layer_id) {
	let id = geo.getLayer(layer_id).feature.properties["ID"];
	loader.open();
	if (!distributions[is_home][id]) {
		$.ajax({
			url: '/cgi-bin/server.py',
			type: 'get',
			data: {
				'request': 'DISTRIBUTIONS',
				'clicked_id': id,
				'is_origin': is_home
			},
			dataType: 'json',
			success: function (response) {
				distributions[is_home][id] = toDistArray(response);
				graph.update(true, is_merged);
				google.charts.load('current', {'packages':['corechart']});
				google.charts.setOnLoadCallback(() => drawChart(is_merged));
				loader.close();
			},
			error: function(xhr, status, error) {
				alert(status);
				loader.close();
			}
		});
	} else {
		graph.update(true, is_merged);
		drawChart(is_merged);
		loader.close();
	}
}

function toDistArray(response_json) {
	var converted = response_json.map(arr => arr.map(el => parseFloat(el)));
	for (let i = 0; i < converted.length; i++) {
		const arr = converted[i];
		const total = arr[1]; // 0 - destination id, 1 - total trips
		for (let j = 2; j < arr.length; j++)
			arr[j] *= total;
	}
	return converted;
}

function drawChart(is_combined = true) {
	var clicked_id = geo.getLayer(clicked_layers[0]).feature.properties['ID'];
	var dt = new google.visualization.DataTable();
	dt.addColumn('number', LANG[currentLang].Hour);
	let selectedDist = distributions[is_home][clicked_id];
	let rows;
	if (is_combined) {
		dt.addColumn('number', LANG[currentLang].Trips);
		rows = getMerged(selectedDist);
	} else {
		for (let i = 0; i < selectedDist.length; i++) {
			const dist = selectedDist[i];
			dt.addColumn('number', dist[0]);
		}
		rows = getSeparated(selectedDist);
	} 

	dt.addRows(rows);
	dist_chart = new google.visualization.LineChart(document.getElementById('dist_chart'));
	dist_chart.draw(dt, getOptions());
}

function getMerged(dist) {
	let merged = transpose(dist);
	merged.splice(0, 2);
	for (let i = 0; i < merged.length; i++)
		merged[i] = [i + 1, Math.round(merged[i].reduce((a, b) => a + b))];
	return merged;
}

let transpose = m => m[0].map((x,i) => m.map(x => x[i]));

function getSeparated(dist) {
	let separated = transpose(dist);
	separated.splice(0, 2);
	for (let i = 0; i < separated.length; i++)
		separated[i].unshift(i + 1);
	return separated;
}

function getOptions() {
	return {
		title: LANG[currentLang].Distribution,
		legend: { position: 'none' },
		hAxis: {
			title: LANG[currentLang].Time_of_day_hour,
			viewWindow: { min: 0 },
			gridlines: { count: 8 }
		},
		vAxis: {
			title: LANG[currentLang].Trips,
			viewWindow: { min: 0 },
			gridlines: { count: 5 }
		}
	};
}

window.onload = function () {
	// Open the dialogue and ask for password
	document.documentElement.style.display = 'none';
	var password;
	do {
		password = prompt('Please enter the password');
	} while (password == null);
	checkPassword(password);
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
	let agg_origin = map_filters.agg_origin;
	if (agg_origin) {
		applyFilter(agg_origin_filter, map_filters.agg_destination);
		applyFilter(agg_destination_filter, agg_origin);
	}
	updateMapAggregation(false, is_rings);
	
	if (agg_group_switches.switch_dist_graph)
		showDistGraph(clicked_layers[0]);
});

$('#switch_rings').click(function() {
	is_rings = !is_rings;
	if (clicked_layers.length)
		restyleMap();
});

$('#switch_multiselect').click(function(e) {
	applySwitch(e.target.id, multiselect_agg, false);
});

$('#switch_dist_graph').click(function(e) {
	let show_graph = clicked_layers.length != 0 && e.target.checked;
	applySwitch(e.target.id, dist_graph_agg, show_graph);
});

function applySwitch(switch_name, aggregation, checked) {
	let current_checked = !agg_group_switches[switch_name];
	toggleAggreationFilters(current_checked);
	
	for (const sname in agg_group_switches) {
		agg_group_switches[sname] = false;
	}
	agg_group_switches[switch_name] = current_checked;

	if (current_checked 
		&& !(map_filters.agg_origin == aggregation 
		&& map_filters.agg_origin == map_filters.agg_destination)) {
		applyFilter(agg_origin_filter, aggregation);
		applyFilter(agg_destination_filter, aggregation);
		resetMapView();
	}
	if (checked && clicked_layers.length) {
		showDistGraph(clicked_layers[0]);
	} else {
		graph.update(false, is_merged);
	}
}

function toggleAggreationFilters(disabled) {
	$('.filters-aggregation > button').each((i, btn) => {
		btn.disabled = disabled;
		btn.title = btn.disabled ? LANG[currentLang].Disable_multiselect : "";
	});
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
	graph.update(false, is_merged);
	resetMapView();
});

$(document).on("click", "input[type=checkbox]#toggle-dist-graph", function() {
	is_merged = !is_merged;
	showDistGraph(clicked_layers[0]);
});