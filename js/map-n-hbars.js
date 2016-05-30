var sumoas;
var mapController = {
    loadMap: function(cnf){
	d3.xml(cnf.mapUrl, "image/svg+xml", function(error, xml) {
	    if (error) throw error;
	    document.getElementById(cnf.mapId).appendChild(xml.documentElement);
	    cnf.map = d3.select('#'+cnf.mapId).selectAll('svg');
	    cnf.map.attr('width',cnf.mapWidth).attr('height',cnf.height());
	    cnf.map.selectAll('path').on('click',function (){mapController.mapClick(this, cnf)});
	});
    },

    loadGraph: function(cnf){
	cnf.svg = d3.select('#'+cnf.chartId).append('svg')
	    .attr('width', cnf.width + cnf.margin.left + cnf.margin.right)
	    .attr('height', cnf.height() + cnf.margin.top + cnf.margin.bottom)
	    .append('g')
	    .attr('transform', 'translate(' + cnf.margin.left + ',' + cnf.margin.top + ')');

	cnf.svg.append('g').attr('class', 'x axis');

	cnf.svg.append('g').attr('class', 'y axis')
	    .append('line')
	    .attr('class', 'domain')
	    .attr('y2', cnf.height());
	},

    setDataDptos: function(cnf){
	d3.csv(cnf.url, function(error,data) {
	    if (error) console.log(error);
	    cnf.dptos = data;
	    //document.getElementsByName(cnf.toggleNames)[0].click()
	});
    },

    mapClick: function(elem, cnf){
	cnf.map.selectAll('path').classed('selected',false);
	cnf.map.select('#'+elem.id).classed('selected',true);
	cnf.svg.selectAll('.bar rect').classed('selected',false);
	cnf.svg.select('#'+cnf.codPrefix+elem.id.split('-')[1]).classed('selected',true);
	cnf.createMapDatumLabel(cnf.svg.select('#'+cnf.codPrefix+elem.id.split('-')[1]).datum());
    },
}

var MapGenerator = {
    generate:function(mapColors, dataurl, chartId, mapId, toggleNames, mapLegendTitle = undefined, mapLegendMetric = undefined){
	var mapColors = mapColors

	var mapinstance = {
	    url:dataurl,
	    mapUrl: 'assets/ColombiaMap.svg',
	    top:100,
	    chartId: chartId,
	    mapId: mapId,
	    toggleNames: toggleNames,
	    codPrefix: 'cod-',
	    mapWidth: 550,
	    highligthed: '',
	    margin: {top: 20, right: 55, bottom: 10, left: 130},
	    width: 420,
	    height: function(){return 700 - this.margin.top - this.margin.bottom},
	    format: locale_esCo.numberFormat(',.1f'),
	    selection: Object.keys(mapColors)[0],
	    selectedDatum: undefined,
	    dptos: undefined, 
	    menu: undefined, 
	    svg: undefined,
	    map: undefined,
	    mapScale: undefined,
	    mapQuartiles: undefined,
	    mapFunction: function(d, selector){return parseFloat(d[selector])},
	    mapLegendTitle: mapLegendTitle,
	    mapLegendMetric: mapLegendMetric,

	    //-----PROPERTIES-----
	    x: undefined,
	    getX: function(){
		if(!this.x) this.x = d3.scale.linear().range([0, this.width]);
		return this.x;
	    },

	    y: undefined,
	    getY: function(){
		if(!this.y) this.y = d3.scale.ordinal().rangeRoundBands([0, this.height()], .1);
		return this.y;
	    },

	    xAxis: undefined,
	    getXAxis: function(){
		if(!this.xAxis) this.xAxis = d3.svg.axis().scale(this.getX())
		    .orient("top").tickSize(-this.height() - this.margin.bottom)
		    .tickFormat(this.format)
		    .ticks(4);
		return this.xAxis;
	    },


	    //----- methods -----
	    setMapScale: function(domain,range){
		this.mapScale = d3.scale.linear().domain(domain).range(range);;
		return this.mapScale
	    },
	    redraw: function(){
		var instance = this;

		instance.redrawMap();
		var top = instance.dptos.sort(function(a, b){return instance.mapFunction(b, instance.selection)-instance.mapFunction(a, instance.selection);})
						  .slice(0,instance.top);		
		instance.getY().domain(top.map(function(d){return d.name;}));

		var bar = instance.svg.selectAll('.bar').data(top,function(d){return d.name;});

		var barEnter = bar.enter().insert('g', '.axis')
		    .attr('class', function(d){
			if(d.name == instance.highligthed) return 'bar highlighted';
			return 'bar';
		    })
		    .attr('transform', function(d) { return 'translate(0,' + (instance.getY()(d.name) + instance.height()) + ')'; })
		    .style('fill-opacity', 0);

		barEnter.append('rect')
		    .attr('width', function(d){return instance.getX()(instance.mapFunction(d, instance.selection));})
		    .attr('height', instance.getY().rangeBand())
		    .attr('id', function(d){return instance.codPrefix+d.divipola;});

		barEnter.append('text')
		    .attr('class', 'label')
		    .attr('x', -3)
		    .attr('y', instance.getY().rangeBand()/2)
		    .attr('dy', '.35em')
		    .attr('text-anchor', 'end')
		    .text(function(d){return d.name;});

		barEnter.append('text')
		    .attr('class', 'value')
		    .attr('x', function(d){return instance.getX()(instance.mapFunction(d, instance.selection))-6;})
		    .attr('y', instance.getY().rangeBand()/2)
		    .attr('dy', '.35em')
		    .attr('text-anchor', 'end');
		instance.getX().domain([0,instance.mapFunction(top[0], instance.selection)]);

		var barUpdate = d3.transition(bar)
		    .attr('transform', function(d){return 'translate(0,'+(d.y0 = instance.getY()(d.name))+')';})
		    .style('fill-opacity', 1);

		barUpdate.select('rect')
		    .attr('width', function(d){return instance.getX()(instance.mapFunction(d, instance.selection));})
		    .style('fill',function(d){if(d){return mapColors[instance.selection].color;}})
		    .style('opacity',function(d){return instance.getOpacity(d)});;

		barUpdate.select('.value')
		    .attr('x', function(d){
			var lbl_length=instance.format(instance.mapFunction(d,instance.selection)).length;
			return instance.getX()(instance.mapFunction(d,instance.selection))+(6*lbl_length);
		    })
		    .text(function(d){ return instance.format(instance.mapFunction(d, instance.selection));});

		var barExit = d3.transition(bar.exit())
		    .attr('transform',function(d){return 'translate(0,'+(d.y0 + instance.height())+')';})
		    .style('fill-opacity', 0)
		    .remove();

		barExit.select('rect')
		    .attr('width', function(d){return instance.getX()(d[instance.selector]);});

		barExit.select('.value')
		    .attr('x', function(d){return instance.getX()(d[instance.selector])-6;})
		    .text(function(d){return instance.format(d[instance.selector]);});

		d3.transition(instance.svg).select('.x.axis').call(instance.getXAxis());
	    },
	    redrawMap: function(){
		var instance = this;
	    	
		var top = instance.dptos.sort(function(a, b){return b[instance.selection]-a[instance.selection];})
				  .slice(0,instance.top);

		// Get data quartiles
		instance.mapQuartiles = [];
		var data = top.map(function(d){return d[instance.selection]});
		[0.75,0.5,0.25].forEach(function(d,i){
		    instance.mapQuartiles.push(d3.quantile(data,d));
		});
		// Remove map legend
		instance.map.selectAll('path').data(top,function(d){
		    if (d){
			d3.select('#' + instance.mapId +' #divi-'+d.divipola).datum(function(){return d});}
		});
		instance.map.selectAll('path').style('fill','grey').style('opacity',1);
		instance.map.selectAll('path')
		    .style('fill',function(d){if(d){return mapColors[instance.selection].color;}}).transition().duration(00)
		    .style('fill-opacity',function(d){return instance.getOpacity(d)});
		instance.updateMapDatumLabel();
	    },
	    getOpacity: function(d){
		cnf = this;
		function between(x, min, max) { 
		    return x >= min && x <= max;
		};
		if(d){ 
		    var opa = {low:0.2,gap:0.8};
		    var dataRan;
		    if(mapColors[cnf.selection].range) dataRan = mapColors[cnf.selection].range; 
		    else dataRan = cnf.mapQuartiles;


		    var step = opa.gap /dataRan.length;
		    var value = d[cnf.selection];

		    if(value<dataRan[0]) return opa.low;
		    for(i=0;i<dataRan.length-1;i++){
			if(between(value,dataRan[i],dataRan[i+1])) return opa.low+step*(i+1);
		    }
		    if(value>dataRan[dataRan.length]) return 1;
		}
	    },
	    updateMapDatumLabel: function(){
		if(this.selectedDatum) this.createMapDatumLabel(this.selectedDatum);
	    },
	    createMapDatumLabel: function(datum){
		cnf = this; 
		cnf.map.selectAll('.datum-label').remove();
		cnf.selectedDatum = datum;
		cnf.map.append('text')
		    .attr('x', 60)
		    .attr('y', 1150) // ToDo: find pixel according to svg
		    .classed('datum-label',true)
		    .attr('dy', '.35em')
		    .style('font-family','sans-serif')
		    .style('font-size','30px')
		    .style('font-weight','bold')
		    .text(datum.name);
		
		cnf.map.append('text')
		    .attr('x', 60)
		    .attr('y', 1200) // ToDo: find pixel according to svg
		    .classed('datum-label',true)
		    .attr('dy', '.35em')
		    .style('font-family','sans-serif')
		    .style('font-size','30px')
		    .text(this.format(datum[this.selection]));
		
	    }
	};
	mapController.loadMap(mapinstance);
	mapController.loadGraph(mapinstance);
	mapController.setDataDptos(mapinstance); 
	return mapinstance;      
    }
};
var oas;
function init(){
    var mapColors = {					
	pop_density_2015:{color:"#FF2C3F"},
	pib_corriente_2014pr:{color:"#A1898A"},
	pib_cons_2005_2014pr:{color:"#B8A7A8"},
	expo_2015:{color:"#1E2345"},
	impo_2015:{color:"#8F2842"}
    };

    var mhbcnf = MapGenerator.generate(mapColors = mapColors, 
				       dataurl = 'json/data.csv',
				       chartId = 'mhb-graph',
				       mapId = 'mhb-map',
				       toggleNames = 'mhb-input')

    $("input[name=mhb-input]").click(function(){
	mhbcnf.selection = this.value;
	d3.transition().duration(750).each(function(index){mhbcnf.redraw();});
	
	$(".mhbBgButtom").css("background-color",function(i,val){
	    return mapColors[$(this).children("input")[0].value].color;
	});
	document.getElementById('mhb-graph-title').innerText = this.parentNode.children[1].textContent;
    });
};

$(document).ready(function(){
    init();
});
