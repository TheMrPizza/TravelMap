// Work & Home Map Visualization with different data sources
var map_id = 2;
var filter = 3; // source

function calcPassengers(feature) {
	/**
	 * Calculate the passangers count of a polygon
	 * @param {Feature} feature The polygon feature
	 */
	var sum = 0;
	for (var i in clicked_layers) {
		var cur_id = geo.getLayer(clicked_layers[i]).feature.properties['ID'];
		sum += data[is_home][cur_id][feature.properties['ID']-1][filter];
	}
	feature.properties['passengers'] = sum;
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
        this.legend.innerHTML = '<div class="row">' +
									'<button class="button" id=1 onClick="toggleLegend(this.id)">פלאפון</button>' +
									'<button class="button" id=0 onClick="toggleLegend(this.id)">GPS</button>' +
								'</div><div class="row">' +
									'<button class="button" id=3 onClick="toggleLegend(this.id)">סלולרי</button>' +
									'<button class="button" id=2 onClick="toggleLegend(this.id)">סלקום</button>' +
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
		this.expand.setAttribute('onClick', 'toggleLegend("expand")');
		this.expand.innerHTML = '<i class="arrow right"></i>';
		this.is_expanded = false;
		return this.div;
    };
	legend.addTo(map);
	this.table.style.height = document.getElementById('legend').offsetHeight;

    legend.update = function() {
        L.DomUtil.get('tag').innerHTML = 'אזורי התנועה שסומנו<br>הם <b>' + (is_home ? 'בתים' : 'עבודות') + '</b>';
        var labels = [0].concat(passengers);
        this.colors.innerHTML = '';
        for (var i = 1; i < labels.length; i++) {
            this.colors.innerHTML += '<i style="background:' + getColor(labels[i] + 1, false, true) + '"></i> ' +
                labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] + '<br>' : '+');
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

function toggleLegend(id) {
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
		document.getElementById(filter).style.color = 'black';
		document.getElementById(filter).style.backgroundColor = '#ccc';
		document.getElementById(id).style.color = 'white';
		document.getElementById(id).style.backgroundColor = '#2196F3';
		filter = id;
		restyleMap(false);
	}
}