function initializeChart (chart_number, data) {
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
		.attr('style', "padding: 20px; float: left");

	var prodInfoList = prodInfo.append('ul').attr('class', "list-unstyled");

	prodInfo.selectAll('infotext')
		.data(["Product info for " + data.info.product_id, 
			data.info.tot_reviews + " reviews, " + data.info.pos_reviews + " positive", 
			data.info.rating.toFixed(2) + " avg rating"])
		.enter().append('li')
			.attr('style', "font-size: 18px")
			.text(function(d) {return d;});

	prodInfo.append('p')
		.attr('style', "font-size: 18px")
		.text("Hide review snippets")
		.on("click", function(){
			var isHidden = d3.select("#snippets" + chart_number)
						.style('display') == 'none';
			//this.text("Show review snippets");
			d3.select("#snippets" + chart_number)
				.style('display', isHidden ? 'inherit' : 'none');
		});

	var snip = d3.select("#barchart" + chart_number)
		.append('div')
		.attr('id', "snippets" + chart_number)
		.attr('style', "padding: 20px; float: left")
			.append('ul')
			.attr('class', "list-unstyled");

	var bq = snip.selectAll('sniptext')
		.data(getSnippetList(data))
		.enter().append('li').append('blockquote')

	bq.append('p').append('small')
		.attr('style', "font-size: 14px")
		.text(function(d) {return d.token;})
	bq.append('p')
		.attr('style', "font-size: 14px")
		.text(function(d) {return "\"" + d.snippet + "\"";})

	return svg;
}

// Returns a list of dicts of the form {token: "keyword", snippet: "text"}
function getSnippetList (json_data) {
	var snipList = [];

	for(var k = 0; k < json_data.chart.length; k++){
		var key = json_data.chart[k].token;
		var neg_list = json_data.snippets[key].negative
		snipList[k] = {token: key, snippet: neg_list[Math.floor(Math.random() * neg_list.length)]}
	}

	return snipList;
}

// var item = items[Math.floor(Math.random()*items.length)];

//var data_global;

var submitProductQuery = function() {
	var product_ID = d3.select('#inputField').property('value');
	console.log(product_ID);
	$.getJSON("product/" + product_ID, function(result){ 
		console.log("Json request succeded!")
		var data = processJSON(result);
		var svg = initializeChart(chart_index, data);
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
	return {chart: data, info: result.product_info, snippets: result.snippets};
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
		.text(function(d) { return d.value;})
		.attr("text-anchor", "end")
		.attr('font-size', 14)
		.attr('font-weight', 700);
}
