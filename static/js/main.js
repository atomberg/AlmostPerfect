function initializeChart (chart_number, info) {
	d3.select('#charts_container').insert("div",":first-child")
		.attr('id',"barchart" + chart_number)
		.attr('class', "product_container");

	var svg = d3.select("#barchart" + chart_number)
		.append('svg')
		.attr('width', 500)
		.attr('height', 150)
		.attr('style', "padding: 20px");

	var prodInfo = d3.select("#barchart" + chart_number)
		.append('div')
		.attr('style', "padding: 20px; float: left")
			.append('ul')
			.attr('class', "list-unstyled");

	
	prodInfo.selectAll('text')
		.data(["Product info for " + info.product_id, 
			info.tot_reviews + " reviews, " + info.pos_reviews + " positive", 
			info.rating.toFixed(2) + " avg rating"])
		.enter().append('li')
			.attr('style', "font-size: 18px")
			.text(function(d){return d;});

		
	return svg;
}

var submitProductQuery = function() {
	var product_ID = d3.select('#inputField').property('value');
	console.log(product_ID);
	$.getJSON("product/" + product_ID, function(result){ 
		console.log("Json request succeded!")
		var data = processJSON(result);
		var svg = initializeChart(chart_index, data.info);
		drawChart(svg, data.chart);
		chart_index++;
	});
	d3.select('#inputField').property('value', '');
	
};

d3.select('#newProductForm').on('submit', function() {
	d3.event.preventDefault();
	submitProductQuery();
});

function processJSON (result) {
	var data = [];
	for (var i = 0; i < Object.keys(result.data.tokens).length; i++) {
		data[i] = { token: result.data.tokens[i], value: result.data.tot_count[i], link: result.data.links[i]};
	}
	return {chart: data, info: result.product_info};
}

function drawChart(chart_selector, data){
	var len_factor = 10;
	chart_selector.selectAll('rect')
	.data(data).enter().append('rect')
		.attr('y', function(d, i) { return i * 22; })
	      	.attr('x', function(d) { return 150; })
	     	.attr('height', 20)
	      	.attr('width', 0)
		.attr('fill', "Navy")
	    	.transition()
	      	  .delay(function(d, i) { return i * 100; })
	          .duration(200)
	          .attr('width', function(d) { return d.value * len_factor; });

	chart_selector.selectAll('links')
	.data(data).enter().append('a')
		.attr('xlink:href', function(d) {return d.link;})
		.append('text')
			.attr('y', function(d, i) { return 15 + i * 22; })
			.attr('x', function(d) { return 140; })
			.attr('fill',"Black")
			.text(function(d) { return d.token;})
			.attr("text-anchor", "end")
			.attr('font-size', 18)
			.attr('width', function(d) { return d.value * len_factor; });

	chart_selector.selectAll('label')
	.data(data).enter().append('text')
		.attr('y', function(d, i) { return 15 + i * 22; })
		.attr('x', function(d) { return 140 + d.value * len_factor; })
		.attr('fill',"White")
		.text(function(d) { return d.value.toFixed(2);})
		.attr("text-anchor", "end")
		.attr('font-size', 14)
		.attr('font-weight', 700);
}

