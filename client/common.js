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