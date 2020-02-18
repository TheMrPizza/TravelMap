// Work & Home Map Visualization by day times
var map_id = 1;
var map_filters = {
	day_time: 9,
	agg_origin: 33,
	agg_destination: 33
};

function calcPassengers(feature) {
	/**
	 * Calculate the passangers count of a polygon
	 * @param {Feature} feature The polygon feature
	 */
	var sum = 0;
	for (var i in clicked_layers) {
		var cur_id = geo.getLayer(clicked_layers[i]).feature.properties['ID'];
		var row_idx = feature.properties['Idx']-1;
		if (row_idx > data[is_home][cur_id].length)
			row_idx = data[is_home][cur_id].length - 1;
		if (map_filters.day_time == 8) // Morning (6 AM + 7 AM + 8 AM)
			sum += data[is_home][cur_id][row_idx].slice(0, 3).reduce((a, b) => a + b);
		else if (map_filters.day_time == 9) // All Day
			sum += data[is_home][cur_id][row_idx].reduce((a, b) => a + b);
		else // Specific day time
			sum += data[is_home][cur_id][row_idx][map_filters.day_time];
	}
	feature.properties['passengers'] = sum;
}

function getMapFiltersHtml() {
	let html = '';
	let currentTextAlignment = LANG[currentLang].props.alignment;
	
	if (currentTextAlignment == 'right')
		html = getFiltersRightHtml();
	else
		html = getFiltersLeftHtml();
	
	return html;
}

function getFiltersRightHtml() {
	let html = '<div class="row swap filters">' +
					'<button class="right-button2" id="day_time2" data-filter="day_time" data-value=2>8</button>' +
					'<button class="right-button3" id="day_time1" data-filter="day_time" data-value=1>7</button>' +
					'<button class="right-button4" id="day_time0" data-filter="day_time" data-value=0>6</button>' +
					'<button class="right-button1" id="day_time8" data-filter="day_time" data-value=8>' + LANG[currentLang].Morning + '</button>' +
				'</div><div class="row swap filters">' +
					'<button class="button" id="day_time4" data-filter="day_time" data-value=4>' + LANG[currentLang].Afternoon + '</button>' +
					'<button class="button" id="day_time3" data-filter="day_time" data-value=3>' + LANG[currentLang].Noon + '</button>' +
				'</div><div class="row swap filters">' +
					'<button class="button" id="day_time9" data-filter="day_time" data-value=9>' + LANG[currentLang].All_day + '</button>' +
					'<button class="button" id="day_time6" data-filter="day_time" data-value=6>' + LANG[currentLang].Night + '</button>' +
					'<button class="button" id="day_time5" data-filter="day_time" data-value=5>' + LANG[currentLang].Evening + '</button>' +
				'</div><div align="right" id="text" class="text">' + 
					'<tag id="tag-home-dest">' + LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b></tag>' + 
					'<label class="switch-right"><input type="checkbox" id="switch_home" checked><span class="slider round"></span></label><br>' + 
					'<tag id="tag-radius">' + LANG[currentLang].Show_radius + '</tag><label class="switch-right"><input type="checkbox" id="switch_rings"><span class="slider round"></span></label><br>' + 
					'<tag id="tag-multiselect">' + LANG[currentLang].Multiselect + '</tag><label class="switch-right"><input type="checkbox" id="switch_multiselect" class="agg-group"><span class="slider round"></span></label><br>' + 
					'<tag id="tag-dist-graph">' + LANG[currentLang].Show_dist_graph + '</tag><label class="switch-right"><input type="checkbox" id="switch_dist_graph" class="agg-group"><span class="slider round"></span></label>' + 
				'</div>';
	return html + getAggregationFiltersRightHtml();
}

function getAggregationFiltersRightHtml() {
	return '<div align="' + LANG[currentLang].props.alignment + '" id="text" class="text">' + 
				'<div class="swap">' +
					'<button class="button" id="aggregation-reset">' + 
					LANG[currentLang].Reset + '</button>' +
					'<tag id="tag-agg-label">' + LANG[currentLang].Aggregation_level + '</tag></div>' +
				'<tag id="tag-origin"><b>' + LANG[currentLang].Agg_origin + '</b></tag>' + 
				'<div class="row swap filters-aggregation">' + 
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin2630" data-filter="agg_origin" data-value=2630>2630</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin1250" data-filter="agg_origin" data-value=1250>1250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin250" data-filter="agg_origin" data-value=250>250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin33" data-filter="agg_origin" data-value=33>33</button>' +
				'</div><div style="padding-top: 1px"></div>' +
				'<tag id="tag-destination"><b>' + LANG[currentLang].Agg_destination + '</b></tag>' +
				'<div class="row swap filters-aggregation">' + 
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination2630" data-filter="agg_destination" data-value=2630>2630</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination1250" data-filter="agg_destination" data-value=1250>1250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination250" data-filter="agg_destination" data-value=250>250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination33" data-filter="agg_destination" data-value=33>33</button>' +
				'</div>' +
			'</div>';
}

function getFiltersLeftHtml() {
	let html = '<div class="row swap filters">' +
					'<button class="left-button1" id="day_time8" data-filter="day_time" data-value=8>' + LANG[currentLang].Morning + '</button>' +
					'<button class="left-button4" id="day_time0" data-filter="day_time" data-value=0>6</button>' +
					'<button class="left-button3" id="day_time1" data-filter="day_time" data-value=1>7</button>' +
					'<button class="left-button2" id="day_time2" data-filter="day_time" data-value=2>8</button>' +
				'</div><div class="row swap filters">' +
					'<button class="button" id="day_time3" data-filter="day_time" data-value=3>' + LANG[currentLang].Noon + '</button>' +
					'<button class="button" id="day_time4" data-filter="day_time" data-value=4>' + LANG[currentLang].Afternoon + '</button>' +
				'</div><div class="row swap filters">' +
					'<button class="button" id="day_time5" data-filter="day_time" data-value=5>' + LANG[currentLang].Evening + '</button>' +
					'<button class="button" id="day_time6" data-filter="day_time" data-value=6>' + LANG[currentLang].Night + '</button>' +
					'<button class="button" id="day_time9" data-filter="day_time" data-value=9>' + LANG[currentLang].All_day + '</button>' +
				'</div><div align="left" id="text" class="text">' + 
					'<tag id="tag-home-dest">' + LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b></tag>' + 
					'<label class="switch-left"><input type="checkbox" id="switch_home" checked><span class="slider round"></span></label><br>' + 
					'<label class="switch-left"><input type="checkbox" id="switch_rings"><span class="slider round"></span></label><tag id="tag-radius">' + LANG[currentLang].Show_radius + '</tag><br>' +
					'<label class="switch-left"><input type="checkbox" id="switch_multiselect" class="agg-group"><span class="slider round"></span></label><tag id="tag-multiselect">' + LANG[currentLang].Multiselect + '</tag><br>' + 
					'<label class="switch-left"><input type="checkbox" id="switch_dist_graph" class="agg-group"><span class="slider round"></span></label><tag id="tag-dist-graph">' + LANG[currentLang].Show_dist_graph + '</tag>' +
				'</div>';
	return html + getAggregationFiltersLeftHtml();
}

function getAggregationFiltersLeftHtml() {
	return '<div align="' + LANG[currentLang].props.alignment + '" id="text" class="text">' + 
				'<div class="swap">' +
					'<tag id="tag-agg-label">' + LANG[currentLang].Aggregation_level + '</tag>' +
					'<button class="button" id="aggregation-reset">' + 
					LANG[currentLang].Reset + '</button></div>' +
				'<tag id="tag-origin"><b>' + LANG[currentLang].Agg_origin + '</b></tag>' + 
				'<div class="row swap filters-aggregation">' + 
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin33" data-filter="agg_origin" data-value=33>33</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin250" data-filter="agg_origin" data-value=250>250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin1250" data-filter="agg_origin" data-value=1250>1250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_origin2630" data-filter="agg_origin" data-value=2630>2630</button>' +
				'</div><div style="padding-top: 1px"></div>' +
				'<tag id="tag-destination"><b>' + LANG[currentLang].Agg_destination + '</b></tag>' +
				'<div class="row swap filters-aggregation">' + 
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination33" data-filter="agg_destination" data-value=33>33</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination250" data-filter="agg_destination" data-value=250>250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination1250" data-filter="agg_destination" data-value=1250>1250</button>' +
					'<button class="' + LANG[currentLang].props.alignment + '-button" id="agg_destination2630" data-filter="agg_destination" data-value=2630>2630</button>' +
				'</div>' +
			'</div>';
}

function localizeText() {
	L.DomUtil.get('tag-home-dest').innerHTML = LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b>';
	L.DomUtil.get('tag-radius').innerHTML = LANG[currentLang].Show_radius;
	L.DomUtil.get('tag-agg-label').innerHTML = LANG[currentLang].Aggregation_level;
	L.DomUtil.get('tag-origin').innerHTML = '<b>' + LANG[currentLang].Agg_origin + '</b>';
	L.DomUtil.get('tag-destination').innerHTML = '<b>' + LANG[currentLang].Agg_destination + '</b>';
	L.DomUtil.get('aggregation-reset').innerHTML = LANG[currentLang].Reset;

	L.DomUtil.get("day_time8").innerText = LANG[currentLang].Morning;
	L.DomUtil.get("day_time4").innerText = LANG[currentLang].Afternoon;
	L.DomUtil.get("day_time3").innerText = LANG[currentLang].Noon;
	L.DomUtil.get("day_time5").innerText = LANG[currentLang].Evening;
	L.DomUtil.get("day_time6").innerText = LANG[currentLang].Night;
	L.DomUtil.get("day_time9").innerText = LANG[currentLang].All_day;
}

function toggleControlsDirection() {
	revertFiltersOrder();
	toggleSwitchAlignment();
	toggleContainersAlignment();
}

function toggleSwitchAlignment() {
	$('.swap').first().children().each(function(i, btn) {
		var classList = $(btn).attr('class').split(/\s+/);
		$.each(classList, function(index, c) {
			if (c.startsWith('right-button')) {
				$(btn).toggleClass(c);
				$(btn).toggleClass(c.replace(/^right/g, 'left'));
				return false;
			}

			if (c.startsWith('left-button')) {
				$(btn).toggleClass(c);
				$(btn).toggleClass(c.replace(/^left/g, 'right'));
				return false;
			}
		});
	});
}

function toggleAggreationFilters(disabled) {
	$('.filters-aggregation > button').each((i, btn) => {
		btn.disabled = disabled;
		btn.title = btn.disabled ? LANG[currentLang].Disable_multiselect : "";
	});
}