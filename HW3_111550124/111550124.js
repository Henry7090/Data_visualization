function correlation(x, y) {
    const n = x.length;
    const meanX = d3.mean(x);
    const meanY = d3.mean(y);
    const numerator = d3.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)));
    const denominator = Math.sqrt(
        d3.sum(x.map(xi => (xi - meanX) ** 2)) *
        d3.sum(y.map(yi => (yi - meanY) ** 2))
    );
    return numerator / denominator;
}

function computeCorrelationMatrix(data) {
    const variables = ["Length", "Diameter", "Height", "WholeWeight", "ShuckedWeight", "VisceraWeight", "ShellWeight", "Rings"];
    const matrix = [];

    variables.forEach((v1, i) => {
        matrix[i] = [];
        variables.forEach((v2, j) => {
            const x = data.map(d => +d[v1]);
            const y = data.map(d => +d[v2]);
            matrix[i][j] = correlation(x, y);
        });
    });
    return { matrix, variables };
}

function drawCorrelationMatrix(correlationMatrix, variables, category) {

    const width = 1000;  
    const height = 900; 
    const margin = { top: 50, right: 50, bottom: 150, left: 150 }; 
    const cellSize = (width - margin.left - margin.right) / variables.length;

    const formattedVariables = variables.map(v => {
        switch(v) {
            case 'WholeWeight': return 'Whole\nWeight';
            case 'ShuckedWeight': return 'Shucked\nWeight';
            case 'VisceraWeight': return 'Viscera\nWeight';
            case 'ShellWeight': return 'Shell\nWeight';
            default: return v;
        }
    });

    d3.select("#mychart").select("svg").remove();

    const svg = d3.select(`#mychart`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([-2, 2]);

    svg.selectAll("rect")
        .data(correlationMatrix.flat())
        .enter()
        .append("rect")
        .attr("x", (d, i) => (i % variables.length) * cellSize)
        .attr("y", (d, i) => Math.floor(i / variables.length) * cellSize)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", d => colorScale(d));

    svg.selectAll(".cellLabel")
        .data(correlationMatrix.flat())
        .enter()
        .append("text")
        .attr("x", (d, i) => (i % variables.length) * cellSize + cellSize / 2)
        .attr("y", (d, i) => Math.floor(i / variables.length) * cellSize + cellSize / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .each(function(d, i) {
            const row = Math.floor(i / variables.length);
            const col = i % variables.length;

            if (row === col) {
                const lines = formattedVariables[row].split('\n');
                const textElem = d3.select(this);
                
                textElem.selectAll('tspan')
                    .data(lines)
                    .enter()
                    .append('tspan')
                    .attr('x', (i % variables.length) * cellSize + cellSize / 2)  
                    .attr('dy', (line, index) => index === 0 ? 0 : 15)  
                    .text(line => line);
            } else {
                d3.select(this).text(d.toFixed(2));
            }
        });
}

function updateMatrixBySex(sex, data) {
    const filteredData = data.filter(d => d.Sex === sex);
    const { matrix, variables } = computeCorrelationMatrix(filteredData);
    drawCorrelationMatrix(matrix, variables, sex);
}

d3.text("./abalone.data").then(function(text) {
    // Parse the text data
    const data = d3.csvParseRows(text, function(row) {
        return {
            Sex: row[0],
            Length: +row[1],
            Diameter: +row[2],
            Height: +row[3],
            WholeWeight: +row[4],
            ShuckedWeight: +row[5],
            VisceraWeight: +row[6],
            ShellWeight: +row[7],
            Rings: +row[8]
        };
    });

    d3.selectAll("input[name='sex']").on("change", function() {
        updateMatrixBySex(this.value.charAt(0).toUpperCase(), data);
    });

    updateMatrixBySex("M", data);
});
// http://f7c73ecde4d7eaa0.vis.lab.djosix.com:2024/
