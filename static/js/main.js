function initializeChart (chart_number, data) {
	var top_container = d3.select('#charts_container')
				.insert("div",":first-child")
				.attr('id',"barchart" + chart_number)
				.attr('style', "background-color: white; margin: 10px 0")
				.attr('class', "product_container")
					.append('div')
					.attr('class', "container")
					.attr('style', "margin: 10px 0; padding: 10px 0");

	var title_row = top_container.append('div')
			.attr('class', "row");				
	
	var data_row = top_container.append('div')
			.attr('class', "row");
	var img_slot = data_row.append('div')
			.attr('class', "col-md-3")
	var chart_slot = data_row.append('div')
			.attr('class', "col-md-6");

	chart_slot.append('div').attr('class', "row")
			.append('div').attr('class', "col-xs-12")
			.append('p').text("Keywords ranked by their scores and the number of reviews mentioning that keyword. Click on each keyword to see the reviews associated with it.");

	var svg = chart_slot.append('svg')
				.attr('width', chart_slot.node().getBoundingClientRect().width)
				.attr('height', 90)
				.attr('style', "margin: 10px");




	$.getJSON("productinfo/" + data.info.product_id, function(response){ 
		console.log("Json info request succeded!");
		
		title_row.append('div')
			.attr('class', "col-xs-6")
				.append('h4')
				.html(response.title + "<br><small>" + data.info.product_id + "</small>");
		title_row.append('div')
			.attr('class', "col-xs-6")
				.append('h4')
				.html("Average rating " + data.info.rating.toFixed(1) + " out of 5 <br><small>" + data.info.tot_reviews + " reviews, " + data.info.pos_reviews + " positive </small>");

		img_slot.append('img')
			.attr('src', response.img)
			.attr('alt', response.title)
			.attr('style', "height: 150px; margin 10px");


	});
//<img src="pic_mountain.jpg" alt="Mountain View" style="width:304px;height:228px;"> float: right

	top_container.append('div').attr('class', "row")
			.append('div').attr('class', "col-xs-2 col-xs-offset-5 text-center")
				.append('button')
				.attr('type', "button")
				.attr('class', "btn btn-default btn-sm")
				.attr('id', "hideshow" + chart_number)
				.html(makeHideShowButton(true))
				.on("click", function(){
					var isHidden = d3.select("#snippets" + chart_number)
								.style('display') == 'none';
					d3.select("#hideshow" + chart_number)
						.html(makeHideShowButton(isHidden));
	
					d3.select("#snippets" + chart_number)
						.style('display', isHidden ? 'inherit' : 'none');
				});

	printSnippets (chart_number, data);

	return svg;
}





function makeHideShowButton(toggle) {
	if (toggle) {
		return '<span class="glyphicon glyphicon-chevron-up"></span> Hide review snippets <span class="glyphicon glyphicon-chevron-up"></span>';
	} else {
		return '<span class="glyphicon glyphicon-chevron-down"></span> Show review snippets <span class="glyphicon glyphicon-chevron-down"></span>';
	}
}

// Prints snippets from data as blockquotes and returns the handle
// to the outermost div.
function printSnippets (chart_number, data) {
	var snip = d3.select("#barchart" + chart_number)
		.append('div')
		.attr('id', "snippets" + chart_number)
		.attr('style', "padding: 20px; background-color: white")
			.append('ul')
			.attr('class', "list-unstyled");

	var bq = snip.selectAll('sniptext')
		.data(getSnippetList(data))
		.enter().append('li').append('blockquote')

	bq.append('p').append('small')
		.attr('style', "font-size: 16px")
		.text(function(d) {return d.token;})
	bq.append('p')
		.attr('style', "font-size: 14px")
		.html(function(d) {return "\"" + d.snippet + "\"";})

	return snip;
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

var data_global;

var submitProductQuery = function() {
	var product_ID = d3.select('#inputBox').property('value');
	if (product_ID == 'other') {
		product_ID = d3.select('#inputField').property('value');
	}
	console.log(product_ID);
	$.getJSON("product/" + product_ID, function(result){ 
		$('#error_container').hide();
		console.log("Json request succeded!");
		var data = processJSON(result);
		data_global = data
		var svg = initializeChart(chart_index, data);
		drawChart(svg, data.chart);
		chart_index++;
	}).fail(function() {
		console.log( "Json request failed!" )
		$('#error_container').show();

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

	var maxwidth = chart_selector.node().getBoundingClientRect().width
	var maxval = 0;
	for(var k = 0; k < data.length; k++) {
		maxval = data[k].value > maxval ? data[k].value : maxval;
	}
	var len_factor = (maxwidth - 200) * 1.0 / maxval;

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
			.attr('target', "_blank")
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
