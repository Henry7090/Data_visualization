const margin = {top: 20, right: 100, bottom: 100, left: 100},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const x = d3.scaleTime()
    .range([0, width]);

const y = d3.scaleLinear()
    .range([height, 0]);

const color = d3.scaleOrdinal(d3.schemeCategory10);

const area = d3.area()
    .x(d => x(d.data.date))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

const svg = d3.select('#chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

const parseDate = d3.timeParse('%d/%m/%Y');

d3.csv('data.csv', d => {
    return {
        date: parseDate(d.saledate),
        MA: +d.MA,
        type: d.type,
        bedrooms: +d.bedrooms
    };
}).then(data => {
    const types = Array.from(new Set(data.map(d => d.type)));
    const bedroomsList = Array.from(new Set(data.map(d => d.bedrooms))).sort((a, b) => a - b);

    const keys = [];
    types.forEach(type => {
        bedroomsList.forEach(bedrooms => {
            const exists = data.some(d => d.type === type && d.bedrooms === bedrooms);
            if (exists) {
                keys.push(`${type} ${bedrooms}BR`);
            }
        });
    });

    color.domain(keys);

    const nestedData = d3.group(data, d => d.date);

    const stackData = [];

    nestedData.forEach((values, key) => {
        const obj = { date: key };
        values.forEach(v => {
            const k = `${v.type} ${v.bedrooms}BR`;
            obj[k] = (obj[k] || 0) + v.MA;
        });
        stackData.push(obj);
    });

    stackData.forEach(d => {
        keys.forEach(key => {
            if (!d[key]) {
                d[key] = 0;
            }
        });
    });

    stackData.sort((a, b) => a.date - b.date);

    x.domain(d3.extent(stackData, d => d.date));

    // Set stack offset to silhouette to center the streamgraph
    const stack = d3.stack()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetSilhouette);

    let layers = stack(stackData);

    // Adjust y-domain to include negative values
    const yMin = d3.min(layers, layer => d3.min(layer, d => d[0]));
    const yMax = d3.max(layers, layer => d3.max(layer, d => d[1]));
    y.domain([yMin, yMax]);

    let layer = svg.selectAll('.layer')
        .data(layers)
      .enter().append('path')
        .attr('class', 'layer area')
        .attr('d', area)
        .style('fill', d => color(d.key));

    const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y'));
    const yAxis = d3.axisLeft(y);

    svg.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
      .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append('g')
        .attr('class', 'axis axis--y')
        .call(yAxis);

    svg.selectAll('.layer')
        .on('mousemove', function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const x0 = x.invert(mouseX);

            const bisectDate = d3.bisector(d => d.date).left;
            const idx = bisectDate(stackData, x0, 1);
            const d0 = stackData[idx - 1];
            const d1 = stackData[idx];
            const dPoint = x0 - d0.date > d1.date - x0 ? d1 : d0;

            const value = dPoint[d.key];

            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            tooltip.html(`Date: ${d3.timeFormat('%d/%m/%Y')(dPoint.date)}<br>` +
                         `Stream: ${d.key}<br>` +
                         `Price: $${value.toLocaleString()}`)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', function() {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    const legend = d3.select('#legend');

    const legendItems = legend.selectAll('.legend-item')
        .data(keys)
      .enter().append('div')
        .attr('class', 'legend-item')
        .on('click', function(event, key) {
            const item = d3.select(this);
            const isInactive = item.classed('inactive');
            item.classed('inactive', !isInactive);
            updateChart();
        });

    legendItems.append('div')
        .attr('class', 'legend-color-box')
        .style('background-color', d => color(d));

    legendItems.append('span')
        .text(d => d);

    function updateChart() {
        const activeKeys = [];
        legendItems.each(function(d) {
            if (!d3.select(this).classed('inactive')) {
                activeKeys.push(d);
            }
        });

        stack.keys(activeKeys)
             .offset(d3.stackOffsetSilhouette); // Ensure offset is silhouette
        layers = stack(stackData);

        // Adjust y-domain
        const yMin = d3.min(layers, layer => d3.min(layer, d => d[0]));
        const yMax = d3.max(layers, layer => d3.max(layer, d => d[1]));
        y.domain([yMin, yMax]);

        const layerSelection = svg.selectAll('.layer')
            .data(layers, d => d.key);

        layerSelection.exit().remove();

        const newLayer = layerSelection.enter().append('path')
            .attr('class', 'layer area')
            .style('fill', d => color(d.key))
            .on('mousemove', function(event, d) {
                const [mouseX, mouseY] = d3.pointer(event);
                const x0 = x.invert(mouseX);

                const bisectDate = d3.bisector(d => d.date).left;
                const idx = bisectDate(stackData, x0, 1);
                const d0 = stackData[idx - 1];
                const d1 = stackData[idx];
                const dPoint = x0 - d0.date > d1.date - x0 ? d1 : d0;

                const value = dPoint[d.key];

                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`Date: ${d3.timeFormat('%d/%m/%Y')(dPoint.date)}<br>` +
                             `Stream: ${d.key}<br>` +
                             `Price: $${value.toLocaleString()}`)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        const mergedLayer = newLayer.merge(layerSelection);

        mergedLayer.transition()
            .duration(500)
            .attr('d', area);

        svg.select('.axis--y')
            .transition()
            .duration(500)
            .call(yAxis);
    }

    legendItems.classed('inactive', false);

    const reorderOptions = ['Original', 'Ascending', 'Descending'];

    const reorderDiv = d3.select('#reorder-options');

    reorderDiv.selectAll('button')
        .data(reorderOptions)
      .enter().append('button')
        .text(d => d)
        .on('click', function(event, option) {
            reorderStreams(option);
        });

    function reorderStreams(option) {
        if (option === 'Original') {
            stack.order(d3.stackOrderNone);
        } else if (option === 'Ascending') {
            stack.order(d3.stackOrderAscending);
        } else if (option === 'Descending') {
            stack.order(d3.stackOrderDescending);
        }
        stack.offset(d3.stackOffsetSilhouette); // Ensure offset is silhouette
        layers = stack(stackData);

        // Adjust y-domain
        const yMin = d3.min(layers, layer => d3.min(layer, d => d[0]));
        const yMax = d3.max(layers, layer => d3.max(layer, d => d[1]));
        y.domain([yMin, yMax]);

        const layerSelection = svg.selectAll('.layer')
            .data(layers, d => d.key);

        layerSelection.transition()
            .duration(500)
            .attr('d', area);

        svg.select('.axis--y')
            .transition()
            .duration(500)
            .call(yAxis);
    }

}).catch(error => {
    console.error('Error loading or processing the data:', error);
});


//http://83a56eda714b2fd4.vis.lab.djosix.com:2024/