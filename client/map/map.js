// Work & Home Map Visualization by data sources
var map_id = 2;
var map_filters = {
	source: 3
};

function calcPassengers(feature) {
	/**
	 * Calculate the passangers count of a polygon
	 * @param {Feature} feature The polygon feature
	 */
	var sum = 0;
	for (var i in clicked_layers) {
		var cur_id = geo.getLayer(clicked_layers[i]).feature.properties['ID'];
		sum += data[is_home][cur_id][feature.properties['Idx']-1][map_filters.source];
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
	return '<div class="row swap filters">' +
				'<button class="button" id="source1" data-filter="source" data-value=1>' + LANG[currentLang].Pelephone + '</button>' +
				'<button class="button" id="source0" data-filter="source" data-value=0>GPS</button>' +
			'</div><div class="row swap filters">' +
				'<button class="button" id="source3" data-filter="source" data-value=3>' + LANG[currentLang].Cellular + '</button>' +
				'<button class="button" id="source2" data-filter="source" data-value=2>' + LANG[currentLang].Cellcom + '</button>' +
			'</div><div align="right" id="text" class="text">' + 
				'<tag id="tag-home-dest">' + LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b></tag>' + 
				'<label class="switch-right"><input type="checkbox" id="switchHome" onclick="toggleHomeDestination(this.id)" checked><span class="slider round"></span></label><br><div style="padding-top: 1px"></div>' + 
				'<tag id="tag-radius">' + LANG[currentLang].Show_radius + '</tag><label class="switch-right"><input type="checkbox" id="switchRings" onclick="toggleHomeDestination(this.id)"><span class="slider round"></span></label>' + 
			'</div>';
}

function getFiltersLeftHtml() {
	return '<div class="row swap filters">' +
				'<button class="button" id="source0" data-filter="source" data-value=0>GPS</button>' +
				'<button class="button" id="source1" data-filter="source" data-value=1>' + LANG[currentLang].Pelephone + '</button>' +
			'</div><div class="row swap filters">' +
				'<button class="button" id="source2" data-filter="source" data-value=2>' + LANG[currentLang].Cellcom + '</button>' +
				'<button class="button" id="source3" data-filter="source" data-value=3>' + LANG[currentLang].Cellular + '</button>' +
			'</div><div align="left" id="text" class="text">' + 
				'<tag id="tag-home-dest">' + LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b></tag>' + 
				'<label class="switch-left"><input type="checkbox" id="switchHome" onclick="toggleHomeDestination(this.id)" checked><span class="slider round"></span></label><br><div style="padding-top: 1px"></div>' + 
				'<label class="switch-left"><input type="checkbox" id="switchRings" onclick="toggleHomeDestination(this.id)"><span class="slider round"></span></label><tag id="tag-radius">' + LANG[currentLang].Show_radius + '</tag>' +
			'</div>';
}

function localizeText() {
	L.DomUtil.get('tag-home-dest').innerHTML = LANG[currentLang].Marked_traffic_areas + '<br>' + LANG[currentLang].Are + ' <b>' + (is_home ? LANG[currentLang].Origin : LANG[currentLang].Destination) + '</b>';
	L.DomUtil.get('tag-radius').innerHTML = LANG[currentLang].Show_radius;
	
	L.DomUtil.get("source1").innerText = LANG[currentLang].Pelephone;
	L.DomUtil.get("source2").innerText = LANG[currentLang].Cellcom;
	L.DomUtil.get("source3").innerText = LANG[currentLang].Cellular;
}

function toggleControlsDirection() {
	revertFiltersOrder();
	toggleContainersAlignment();
}