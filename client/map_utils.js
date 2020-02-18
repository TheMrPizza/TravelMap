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
		let selectedLanguageDirection = LANG[currentLang].props.direction;
		let currentTableDirection = this.table.getAttribute('dir');
		if (selectedLanguageDirection != currentTableDirection) {
			this.table.setAttribute('dir', LANG[currentLang].props.direction);
			toggleControlsDirection();
		}
		this.colors.innerHTML = getPassengersScaleHtml(passengers);
		this.table.innerHTML = getTop10TableHtml();
	}
}

function createDistanceGraph() {
	graph = L.control({position: 'topright'});
	graph.onAdd = function(map) {
		this.div = L.DomUtil.create('div', 'graph');
		return this.div;
	};
	graph.addTo(map);

	graph.update = function(show) {
		if (!show) {
			this.div.innerHTML = "";
			this.div.setAttribute('style', 'display: none');
			return;
		}
		this.div.setAttribute('style', 'display: block');
		var html = '<div id="dist_graph" style="width: 450px; height: 250px"></div>';
		this.div.innerHTML = html;
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

function applyFilter(filter, newValue) {
	let current_filter = document.getElementById(filter+map_filters[filter]);
	current_filter.style.color = 'black';
	current_filter.style.backgroundColor = '#ccc';

	let selected_filter = document.getElementById(filter+newValue);
	selected_filter.style.color = 'white';
	selected_filter.style.backgroundColor = '#2196F3';

	map_filters[filter] = newValue;
}

function revertFiltersOrder() {
	$('.swap').each(function(i, row){
		$(row).children().each(function(j, btn) { row.prepend(btn) });
	})
}

function toggleContainersAlignment() {
	let container = $('#legend div#text');
	container.attr('align', LANG[currentLang].props.alignment);
	container.children("label, div[class*=switch-]").each(function(i, child) {
		$(child).toggleClass("switch-right");
		$(child).toggleClass("switch-left");
	});
}