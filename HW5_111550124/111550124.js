// 111550124.js

// Set margins of the graph
var margin = {top: 30, right: 200, bottom: 50, left: 400};

// Set total width of the SVG
var totalWidth = 1200; // Adjusted width to accommodate all elements

// Create the SVG object and store it in 'svg'
var svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", totalWidth);

// Create a 'g' element inside the SVG and store it in 'chart'
var chart = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// List of subgroups (criteria)
var subgroups = ["scores_teaching", "scores_research", "scores_citations", "scores_industry_income", "scores_international_outlook"];

// Color palette
var color = d3.scaleOrdinal()
  .domain(subgroups)
  .range(d3.schemeCategory10);

// Tooltip
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Load the data from data.csv
d3.csv("data.csv").then(function(data) {

    // Filter out schools without complete data
    data = data.filter(function(d) {
        // Check that all required score fields are present and are numbers
        return subgroups.every(function(key) {
            var value = parseFloat(d[key]);
            return !isNaN(value);
        });
    });

    // Convert string values to numbers
    data.forEach(function(d) {
        subgroups.forEach(function(key) {
            d[key] = +d[key];
        });

        // Handle 'scores_overall' which may contain ranges like '55.9–58.6'
        if (d.scores_overall.includes('–')) {
            d.scores_overall = parseFloat(d.scores_overall.split('–')[0]);
        } else {
            d.scores_overall = parseFloat(d.scores_overall) || 0; // Default to 0 if NaN
        }
    });

    // Set initial sorting by overall score descending
    data.sort(function(a, b) {
        return b.scores_overall - a.scores_overall;
    });

    // Store the original data for later use
    var originalData = data.slice();

    // Function to update the chart based on selected number of universities
    function updateChart() {
        // Get the selected number of universities
        var selectedNumber = d3.select("#number").property("value");

        // Filter data based on the selected number
        if (selectedNumber !== "all") {
            data = originalData.slice(0, +selectedNumber);
        } else {
            data = originalData.slice();
        }

        // Set dimensions of the graph
        var barHeight = 20; // Height allocated per bar
        var height = data.length * barHeight; // Total chart height
        var width = totalWidth - margin.left - margin.right; // Chart width

        // Update SVG dimensions
        svg.attr("height", height + margin.top + margin.bottom);

        // List of groups (universities)
        var groups = data.map(function(d) { return d.name; });

        // Update groups after sorting
        groups = data.map(function(d) { return d.name; });

        // Update X axis
        var x = d3.scaleLinear()
            .domain([0, d3.max(data, function(d) {
                return d3.sum(subgroups, function(key) {
                    return d[key];
                });
            })])
            .range([0, width]);

        chart.selectAll(".x-axis").remove(); // Remove previous x-axis

        chart.append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));

        // Update Y axis
        var y = d3.scaleBand()
            .domain(groups)
            .range([0, height])
            .padding([0.2]);

        chart.selectAll(".y-axis").remove(); // Remove previous y-axis

        var yAxis = chart.append("g")
          .attr("class", "y-axis")
          .call(d3.axisLeft(y));

        // Implement text wrapping for y-axis labels
        yAxis.selectAll(".tick text")
          .call(wrap, margin.left - 20); // Adjust wrap width based on left margin

        // Stack the data
        var stackedData = d3.stack()
          .keys(subgroups)
          (data);

        // Remove previous layers
        chart.selectAll("g.layer").remove();

        // Create the stacked bars
        var layers = chart.append("g")
          .selectAll("g.layer")
          .data(stackedData, function(d) { return d.key; })
          .enter().append("g")
            .attr("class", "layer")
            .attr("fill", function(d) { return color(d.key); });

        var rects = layers.selectAll("rect")
          .data(function(d) { return d; })
          .enter().append("rect")
            .attr("y", function(d) { return y(d.data.name); })
            .attr("x", function(d) { return x(d[0]); })
            .attr("height", y.bandwidth())
            .attr("width", function(d) { return x(d[1]) - x(d[0]); })
            .on("mouseover", function(event, d) {
                var subgroupName = d3.select(this.parentNode).datum().key;
                var subgroupValue = d.data[subgroupName];

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("University: " + d.data.name + "<br/>" +
                             subgroupName.replace("scores_", "").replace(/_/g, " ") + ": " + subgroupValue)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Update legend positions
        chart.selectAll(".legend").remove();

        // Legend
        var activeCriteria = {};
        subgroups.forEach(function(s) {
            activeCriteria[s] = true;
        });

        var legend = chart.append("g")
          .attr("class", "legend")
          .attr("font-family", "sans-serif")
          .attr("font-size", 12)
          .attr("text-anchor", "start")
          .attr("transform", "translate(" + (width + 40) + ",0)") // Position legend appropriately
          .selectAll("g")
          .data(subgroups)
          .enter().append("g")
            .attr("transform", function(d, i) { return "translate(0," + i * 25 + ")"; });

        legend.append("rect")
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", color)
            .attr("stroke", color)
            .on("click", function(event, d) {
                // Toggle criterion
                activeCriteria[d] = !activeCriteria[d];

                // Update the opacity of the legend item
                d3.select(this).attr("opacity", activeCriteria[d] ? 1 : 0.5);

                // Update the subgroups
                var filteredSubgroups = subgroups.filter(function(key) {
                    return activeCriteria[key];
                });

                // Recompute the stack
                var stackedData = d3.stack()
                    .keys(filteredSubgroups)
                    (data);

                // Update the x scale domain
                x.domain([0, d3.max(data, function(d) {
                    return d3.sum(filteredSubgroups, function(key) {
                        return d[key];
                    });
                })]);

                // Update the x-axis
                chart.select(".x-axis")
                    .transition()
                    .duration(1000)
                    .call(d3.axisBottom(x));

                // Update the bars
                var groupsLayer = chart.selectAll("g.layer")
                    .data(stackedData, function(d) { return d.key; });

                groupsLayer.exit().remove();

                var groupEnter = groupsLayer.enter().append("g")
                    .attr("class", "layer")
                    .attr("fill", function(d) { return color(d.key); });

                var rects = groupEnter.merge(groupsLayer)
                    .selectAll("rect")
                    .data(function(d) { return d; });

                rects.enter().append("rect")
                    .attr("x", function(d) { return x(d[0]); })
                    .attr("y", function(d) { return y(d.data.name); })
                    .attr("height", y.bandwidth())
                    .attr("width", 0)
                    .on("mouseover", function(event, d) {
                        var subgroupName = d3.select(this.parentNode).datum().key;
                        var subgroupValue = d.data[subgroupName];

                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html("University: " + d.data.name + "<br/>" +
                                     subgroupName.replace("scores_", "").replace(/_/g, " ") + ": " + subgroupValue)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    })
                    .merge(rects)
                    .transition()
                    .duration(1000)
                    .attr("x", function(d) { return x(d[0]); })
                    .attr("y", function(d) { return y(d.data.name); })
                    .attr("height", y.bandwidth())
                    .attr("width", function(d) { return x(d[1]) - x(d[0]); });

                rects.exit().remove();
            });

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function(d) { return d.replace("scores_", "").replace(/_/g, " "); });

    d3.select("#sort-button").on("click", function() {
        var sortBy = d3.select("#sort-by").property("value");
        var sortOrder = d3.select("#sort-order").property("value");

        data.sort(function(a, b) {
            var aValue = a[sortBy];
            var bValue = b[sortBy];
            if (sortBy === "scores_overall") {
                aValue = parseFloat(aValue.toString().split('–')[0]) || 0;
                bValue = parseFloat(bValue.toString().split('–')[0]) || 0;
            }
            if (sortOrder === "ascending") {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        y.domain(data.map(function(d) { return d.name; }));

        var filteredSubgroups = subgroups.filter(function(key) {
            return activeCriteria[key];
        });

        if (filteredSubgroups.includes(sortBy)) {
            filteredSubgroups = filteredSubgroups.filter(function(d) { return d !== sortBy; });
            filteredSubgroups.unshift(sortBy); 
        }

        var stackedData = d3.stack()
            .keys(filteredSubgroups)
            (data);

        var groupsLayer = chart.selectAll("g.layer")
            .data(stackedData, function(d) { return d.key; });

        groupsLayer.order();

        groupsLayer.exit().remove();

        var groupEnter = groupsLayer.enter().append("g")
            .attr("class", "layer")
            .attr("fill", function(d) { return color(d.key); });

        var rects = groupEnter.merge(groupsLayer)
            .selectAll("rect")
            .data(function(d) { return d; });

        rects.enter().append("rect")
            .attr("x", function(d) { return x(d[0]); })
            .attr("y", function(d) { return y(d.data.name); })
            .attr("height", y.bandwidth())
            .attr("width", 0)
            .on("mouseover", function(event, d) {
                var subgroupName = d3.select(this.parentNode).datum().key;
                var subgroupValue = d.data[subgroupName];

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("University: " + d.data.name + "<br/>" +
                            subgroupName.replace("scores_", "").replace(/_/g, " ") + ": " + subgroupValue)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .merge(rects)
            .transition()
            .duration(1000)
            .attr("x", function(d) { return x(d[0]); })
            .attr("y", function(d) { return y(d.data.name); })
            .attr("height", y.bandwidth())
            .attr("width", function(d) { return x(d[1]) - x(d[0]); })
            .style("opacity", function(d) {
                var subgroupName = d3.select(this.parentNode).datum().key;
                if (sortBy === "scores_overall") {
                    return 1; 
                }
                return subgroupName === sortBy ? 1 : 0.3; 
            });

        rects.exit().remove();

        x.domain([0, d3.max(data, function(d) {
            return d3.sum(filteredSubgroups, function(key) {
                return d[key];
            });
        })]);

        chart.select(".x-axis")
            .transition()
            .duration(1000)
            .call(d3.axisBottom(x));

        chart.select(".y-axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y));

        chart.select(".y-axis").selectAll(".tick text")
            .call(wrap, margin.left - 20); 

        chart.selectAll(".legend rect")
            .transition()
            .duration(1000)
            .style("opacity", function(d) {
                if (sortBy === "scores_overall") {
                    return 1; 
                }
                return d === sortBy ? 1 : 0.1;
            });
    });


        // Function to wrap text in SVG
        function wrap(text, width) {
            text.each(function() {
                var text = d3.select(this),
                    words = text.text().split(/(\s+|\-|\–)/).reverse(), // Split on spaces, hyphens, en-dashes
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    yText = text.attr("y"),
                    dy = parseFloat(text.attr("dy")) || 0,
                    tspan = text.text(null)
                                .append("tspan")
                                .attr("x", -10)
                                .attr("y", yText)
                                .attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(""));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(""));
                        line = [word];
                        tspan = text.append("tspan")
                                    .attr("x", -10)
                                    .attr("y", yText)
                                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                    .text(word);
                    }
                }
            });
        }
    }

    // Initial chart rendering
    updateChart();

    // Listen for changes on the select input
    d3.select("#number").on("change", function() {
        updateChart();
    });

});
