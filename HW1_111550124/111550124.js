const width = 1200;
const height = 600;

const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width)
    .attr("height", height + 80)
    .attr("transform", `translate(${(window.innerWidth - width) / 2}, 0)`);

let xScale = d3.scaleLinear()
    .range([40, width - 40]);

let yScale = d3.scaleLinear()
    .range([height - 40, 10]);

const colorScale = d3.scaleOrdinal()
    .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

function update_chart(x_axis, y_axis, data) {

    const xExtent = d3.extent(data.filter(d => +d[x_axis] !== 0), d => +d[x_axis]);
    const yExtent = d3.extent(data.filter(d => +d[y_axis] !== 0), d => +d[y_axis]);


    const xRange = xExtent[1] - xExtent[0];
    const yRange = yExtent[1] - yExtent[0];
    const maxRange = Math.max(xRange, yRange);

    const xStart = Math.floor(xExtent[0] * 2) / 2;
    const yStart = Math.floor(yExtent[0] * 2) / 2;
    const xEnd = Math.ceil(xExtent[1] * 2) / 2;
    const yEnd = Math.ceil(yExtent[1] * 2) / 2;

    xScale.domain([xStart, xEnd]);
    yScale.domain([yStart, yEnd]);

    svg.selectAll("*").remove();

    svg.selectAll("circle")
        .data(data.filter(d => +d[x_axis] !== 0 && +d[y_axis] !== 0))
        .enter()
        .append("circle")
        .attr("cx", d => xScale(+d[x_axis]))
        .attr("cy", d => yScale(+d[y_axis]))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.class));

    // Add X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height - 40})`)
        .call(d3.axisBottom(xScale)
            .tickValues(d3.range(xStart, xEnd + 0.5, 0.5))); 

    // Add X Axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 5)  // Adjust this to position below the axis
        .text(x_axis)
        .style("font-size", "16px");

    // Add Y Axis
    svg.append("g")
        .attr("transform", `translate(40,0)`)
        .call(d3.axisLeft(yScale)
            .tickValues(d3.range(yStart, yEnd + 0.5, 0.5)));

    // Add Y Axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")  // Rotate the text to make it vertical
        .attr("x", -(height / 2))
        .attr("y", 15)  // Adjust this to position beside the y-axis
        .text(y_axis)
        .style("font-size", "16px");

    // Add X axis gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - 40})`)
        .call(d3.axisBottom(xScale)
            .tickValues(d3.range(xStart, xEnd + 0.5, 0.5))
            .tickSize(-height + 50)
            .tickFormat(""));

    // Add Y axis gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(40,0)`)
        .call(d3.axisLeft(yScale)
            .tickValues(d3.range(yStart, yEnd + 0.5, 0.5))
            .tickSize(-width + 80)
            .tickFormat(""));

    const legend = svg.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${(width / 2) - 50}, ${(height + 70 - 20) - i * 20})`); 
        
    // Add colored squares for the legend
    legend.append("circle")
        .attr("cx", 9)  // Circle center X, half of the width for better alignment
        .attr("cy", 9)  // Circle center Y, half of the height for vertical alignment
        .attr("r", 5)   // Radius of the circle
        .style("fill", colorScale);


    // Add text labels for the legend

    legend.append("text")
        .attr("x", 25)  // Space between color and text
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => d);
}

// Load data and update the chart
d3.csv("./iris.csv").then(function(data) {

    update_chart('sepal length', 'sepal width', data);

    d3.select("#X_axis").on("change", function() {
        let x_axis = d3.select("#X_axis").property("value");
        let y_axis = d3.select("#Y_axis").property("value");
        update_chart(x_axis, y_axis, data);
    });

    d3.select("#Y_axis").on("change", function() {
        let x_axis = d3.select("#X_axis").property("value");
        let y_axis = d3.select("#Y_axis").property("value");
        update_chart(x_axis, y_axis, data);
    });

}).catch(function(error) {
    console.log("Error loading CSV: ", error);
});
