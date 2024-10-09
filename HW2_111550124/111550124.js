var margin = { top: 30, right: 50, bottom: 10, left: 50 },
    width = 1200 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom ;

var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom + 100)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const data_path = "./iris.csv";
d3.csv(data_path).then(function (data) {
    data.splice(150, 1);
    var color = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["skyblue", "lightgreen", "pink"]);

    var dimensions = ["sepal length", "sepal width", "petal length", "petal width"];

    // For each dimension, build a linear scale. Store all in a y object
    var y = {};

    // For each dimension, determine the max and min using d3.extent, and build the y scale
    dimensions.forEach(function(d) {
        const extent = d3.extent(data, row => +row[d]); // Get min and max values for the dimension
        
        y[d] = d3.scaleLinear()
            .domain([Math.floor(extent[0]), Math.ceil(extent[1])]) // Set domain based on extent
            .range([height, 0]);
    });


    // Build the X scale -> it finds the best position for each Y axis
    var x = {};
    var tmpx = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);

    dimensions.forEach(function(d) {
        
        x[d] = tmpx(d);
        // console.log(d);
        // console.log(x[d]);
    });


    // The path function takes a row of the csv as input, and returns x and y coordinates of the line to draw for this row.
    function path(d) {
        var lineGenerator = d3.line();
        var points = dimensions.map(function(p) {
            return [x[p], y[p](d[p])];
        });
        return lineGenerator(points);
    }
    

    var dragg = [];
    var ID = [];

    // Draw the lines
    var tmp1 = svg.selectAll("myPath")
        .data(data)
        .enter()
        .append("path")
        .attr("class", function (d) { return "line " + d.class; }) // 2 classes for each line: 'line' and the group name
        .attr("d", path)
        .style("fill", "none")
        .style("opacity", 0.5)
        .style("stroke", function (d) { return color(d.class); })
        .attr("stroke-width", 1.5);


    // Function to update the visibility of the lines based on the checkbox status
    function updateVisibility() {
        // For each checkbox
        d3.selectAll("input[name='species']").each(function() {
            var checkbox = d3.select(this);
            var className = checkbox.property("value");
            console.log(className);
            // Select the corresponding line for the class (species)
            d3.selectAll("." + className)
                .transition()
                .style("opacity", checkbox.property("checked") ? 1 : 0);
        });
    }

    // Attach event listener to each checkbox
    d3.selectAll("input[name='species']").on("change", updateVisibility);

    // Initial call to set the visibility based on the initial state of the checkboxes
    updateVisibility();


    // Draw the axis
    // Function to create axis and handle drag behavior


    // Draw the axis
    var tmp = svg.selectAll("myAxis")
                .data(dimensions)
                .enter()
                .append("g")
                .attr("class", "axis")
                .attr("transform", function (d) { return "translate(" + x[d] + ")"; })
                .each(createAxis); // Use the refactored function here

    tmp.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function (d) { return d; })
        .style("fill", "black");

    
    function createAxis(dimension, index) {
        // Create axis and attach ticks
        numTicks = 5;
        dragg[index] = d3.select(this).call(
            d3.axisLeft(y[dimension])
              .tickValues(d3.range(numTicks).map(d => {
                const domain = y[dimension].domain();
                const step = (domain[1] - domain[0]) / (numTicks - 1);
                return domain[0] + d * step;
              }))
          );
    
        // Define drag behavior
        const dragBehavior = d3.drag()
            .on("start", () => {
                d3.select(this).style("cursor", "grabbing");  // Start dragging cursor
            })
            .on("drag", (event) => {
                const draggedX = Math.min(Math.max(event.x, -10), width + 10);
                x[dimension] = draggedX;    
                d3.select(this).attr("transform", `translate(${draggedX})`);
                const sortedDimensions = dimensions.sort((a, b) => x[a] - x[b]);
    
                // Update the dimensions array based on sorting result
                dimensions = sortedDimensions;
    
                // Debounce the path update for performance improvement
                debouncedUpdatePath();
            })
            .on("end", () => {
                d3.select(this).style("cursor", "grab");  // Revert to default cursor after drag ends
            });
    
        // Attach drag behavior to the axis
        dragg[index].call(dragBehavior);
    }
    

    // Create a debounced function to limit the number of path updates during dragging
    function debounce(func, delay) {
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(func, delay);
        };
    }

    const debouncedUpdatePath = debounce(function () {
        tmp1.attr("d", path);  // Update the path positions after swapping
    }, 50);  // 50ms delay for debouncing

        


    // Define offsets and radius for the circles
    const labelYOffset = 20;
    const circleRadius = 5;
    const spacing = 10; // Space between circle and text

    // Set for each species: color and label text
    const speciesData = [
        { label: "setosa", color: "skyblue" },
        { label: "versicolor", color: "lightgreen" },
        { label: "virginica", color: "pink" }
    ];

    // Loop through species data and add a circle followed by text
    speciesData.forEach((species, i) => {
        const yPosition = height - labelYOffset + (i * 20); // Adjust Y position for each species

        // Append a circle
        svg.append("circle")
            .attr("cx", width / 2 - 30) // Center the group, offset for the circle
            .attr("cy", yPosition+60)
            .attr("r", circleRadius)
            .style("fill", species.color);

        // Append the text next to the circle
        svg.append("text")
            .attr("text-anchor", "start")
            .attr("x", width / 2 - 30 + circleRadius + spacing) // Position text to the right of the circle
            .attr("y", yPosition + 65) // Slight adjustment to align text vertically with the circle
            .text(species.label)
            .style("fill", species.color);
    });



});