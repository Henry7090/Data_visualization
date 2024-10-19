var margin = {top: 80, right: 30, bottom: 50, left: 80},
    size = 180,
    padding = 30; 

var attributes = ["sepal length", "sepal width", "petal length", "petal width"];

var width = size * attributes.length + padding * (attributes.length - 1),
    height = size * attributes.length + padding * (attributes.length - 1);

var color = d3.scaleOrdinal()
    .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
    .range(["pink", "lightgreen", "skyblue"]);

var svgElement = d3.select("#my_dataviz").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

var svg = svgElement.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv", function(data) {

  data.forEach(function(d) {
    attributes.forEach(function(attr) {
      d[attr] = +d[attr];
    });
  });

  data = data.filter(function(d) {
    return attributes.every(function(attr) {
      return !isNaN(d[attr]);
    });
  });

  data.forEach(function(d, i) {
    d.id = i;
  });

  var x = {}, y = {};
  attributes.forEach(function(attr) {
    x[attr] = d3.scaleLinear()
      .domain(d3.extent(data, function(d) { return d[attr]; }))
      .range([padding / 2, size - padding / 2]);

    y[attr] = d3.scaleLinear()
      .domain(d3.extent(data, function(d) { return d[attr]; }))
      .range([size - padding / 2, padding / 2]);
  });

  var cell = svg.selectAll(".cell")
      .data(cross(attributes, attributes))
    .enter().append("g")
      .attr("class", "cell")
      .attr("transform", function(d) {
        var xPos = attributes.indexOf(d.x) * (size + padding);
        var yPos = attributes.indexOf(d.y) * (size + padding);
        return "translate(" + xPos + "," + yPos + ")";
      });

  cell.each(plot);

  attributes.forEach(function(attr, i) {
    svg.append("text")
      .attr("x", i * (size + padding) + size / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(attr);
  });

  attributes.forEach(function(attr, i) {
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", - (i * (size + padding) + size / 2))
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(attr);
  });

  var classes = color.domain();

  var legend = svgElement.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + (margin.left + width / 2) + "," + (margin.top / 2 - 20) + ")");

  var legendItemSpacing = 150;

  var legendItem = legend.selectAll('.legend-item')
      .data(classes)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', function(d, i) {
          return 'translate(' + ((i - classes.length / 2 + 0.5) * legendItemSpacing) + ',0)';
      });

  legendItem.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 6)
      .style('fill', function(d) { return color(d); });

  legendItem.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(function(d) { return d; })
      .style('font-size', '12px');

  var selectedIDs = []; 
  var brushCell;

  function plot(p) {
    var cell = d3.select(this);

    cell.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", "translate(0," + (size - padding / 2) + ")")
        .call(d3.axisBottom(x[p.x]).ticks(5));

    cell.append("g")
        .attr("class", "axis y-axis")
        .attr("transform", "translate(" + (padding / 2) + ",0)")
        .call(d3.axisLeft(y[p.y]).ticks(5));

    cell.append("rect")
        .attr("class", "frame")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding)
        .style("fill", "none")
        .style("stroke", "#aaa");

    if (p.x === p.y) {
      var histogram = d3.histogram()
          .value(function(d) { return d[p.x]; })
          .domain(x[p.x].domain())
          .thresholds(x[p.x].ticks(20));

      var bins = histogram(data);

      var yHist = d3.scaleLinear()
          .domain([0, d3.max(bins, function(d) { return d.length; })])
          .range([size - padding / 2, padding / 2]);

      cell.selectAll("rect.hist")
          .data(bins)
        .enter().append("rect")
          .attr("class", "hist")
          .attr("x", function(d) { return x[p.x](d.x0); })
          .attr("y", function(d) { return yHist(d.length); })
          .attr("width", function(d) { return x[p.x](d.x1) - x[p.x](d.x0) - 1; })
          .attr("height", function(d) { return size - padding / 2 - yHist(d.length); })
          .style("fill", "#ccc");
    } else {
      cell.selectAll("circle")
          .data(data)
        .enter().append("circle")
          .attr("cx", function(d) { return x[p.x](d[p.x]); })
          .attr("cy", function(d) { return y[p.y](d[p.y]); })
          .attr("r", 3)
          .style("fill", function(d) { return color(d["class"]); })
          .style("opacity", 0.7)
          .attr("data-id", function(d) { return d.id; });

      var brush = d3.brush()
          .extent([[0, 0], [size, size]])
          .on("start", brushstart)
          .on("brush", brushmove)
          .on("end", brushend);

      cell.append("g")
          .attr("class", "brush")
          .call(brush);
    }

    function brushstart() {
      if (brushCell !== this) {
        svg.selectAll(".brush").call(d3.brush().move, null);
        brushCell = this;
        selectedIDs = [];
      }
      d3.event.stopPropagation();
    }

    function brushmove() {
      var e = d3.event.selection;
      if (e) {
        selectedIDs = [];
        var extent = e;
        cell.selectAll("circle")
            .each(function(d) {
              var cx = x[p.x](d[p.x]);
              var cy = y[p.y](d[p.y]);
              if (extent[0][0] <= cx && cx <= extent[1][0]
                  && extent[0][1] <= cy && cy <= extent[1][1]) {
                selectedIDs.push(d.id);
              }
            });

        svg.selectAll("circle")
            .style("opacity", function(d) {
              return selectedIDs.indexOf(d.id) !== -1 ? 1 : 0.1;
            });
      }
    }

    function brushend() {
      d3.select(this).call(d3.brush().move, null);

      if (selectedIDs.length === 0) {
        svg.selectAll("circle").style("opacity", 0.7);
        brushCell = null;
      }
    }
  }

  svg.on('click', function() {
    if (d3.event.defaultPrevented) return; 
    selectedIDs = [];
    svg.selectAll("circle").style("opacity", 0.7);
  });
});

function cross(a, b) {
  var c = [], n = a.length, m = b.length, i, j;
  for (i = 0; i < n; i++) {
    for (j = 0; j < m; j++) {
      c.push({x: a[i], y: b[j]});
    }
  }
  return c;
}


// http://60a07238dd57284e.vis.lab.djosix.com:2024/