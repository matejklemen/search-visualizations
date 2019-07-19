var canvasWidth = 1000;
var canvasHeight = 1000;
var NODE_RADIUS = 30;

// TODO: "label" property is now redundant
var nodesHardcoded = {
    "A": {"x": 100, "y": 150, "label": "A"},
    "B": {"x": 250, "y": 100, "label": "B"},
    "C": {"x": 400, "y": 150, "label": "C"},
    "D": {"x": 175, "y": 400, "label": "D"},
    "E": {"x": 325, "y": 400, "label": "E"},
    "F": {"x": 325, "y": 500, "label": "F"},
    "G": {"x": 400, "y": 400, "label": "G"}
};

var edgeList = [
  ["A", "B", 10],
  ["B", "C", 5],
  ["B", "D", 3],
  ["D", "E", 4],
  ["A", "E", 3],
  ["E", "F", 7],
  ["E", "G", 0]
];

var fixedEdgeList = edgeList.map(fixEdgeStartEnd)

var canvas = d3.select("body")
                .append("svg")
                .attr("width", canvasWidth)
                .attr("height", canvasHeight);

/* Determines edge start and end in a way that the circles do not overlap with lines, 
    but rather that the lines touch the boundary of the circles. */
function fixEdgeStartEnd(edge) {
    // TODO: better way of fixing coordinates: https://stackoverflow.com/questions/5300938/calculating-the-position-of-points-in-a-circle?
    // TODO: refactor this
    var [srcLabel, dstLabel, _] = edge;
    var srcNode = nodesHardcoded[srcLabel];
    var dstNode = nodesHardcoded[dstLabel];

    if(srcNode.x < dstNode.x) {
        if(srcNode.y < dstNode.y) {
            return [srcNode.x + NODE_RADIUS / 2,
                    srcNode.y + NODE_RADIUS / 2,
                    dstNode.x - NODE_RADIUS / 2,
                    dstNode.y - NODE_RADIUS / 2];
        }
        else if(srcNode.y == dstNode.y) {
            return [srcNode.x + NODE_RADIUS,
                    srcNode.y,
                    dstNode.x - NODE_RADIUS,
                    dstNode.y];
        }
        else {
            return [srcNode.x + NODE_RADIUS / 2,
                    srcNode.y - NODE_RADIUS / 2,
                    dstNode.x - NODE_RADIUS / 2,
                    dstNode.y + NODE_RADIUS / 2];
        }
    }
    else if(srcNode.x == dstNode.x) {
        if(srcNode.y < dstNode.y) {
            return [srcNode.x,
                    srcNode.y + NODE_RADIUS,
                    dstNode.x,
                    dstNode.y - NODE_RADIUS];
        }
        else if(srcNode.y == dstNode.y) {
            return null; // completely overlapping nodes = what do? Maybe just return OG coordinates?
        }
        else {
            return [srcNode.x,
                    srcNode.y - NODE_RADIUS,
                    dstNode.x,
                    dstNode.y + NODE_RADIUS];
        }
    }
    else {
        if(srcNode.y < dstNode.y) {
            return [srcNode.x - NODE_RADIUS / 2,
                    srcNode.y + NODE_RADIUS / 2,
                    dstNode.x + NODE_RADIUS / 2,
                    dstNode.y - NODE_RADIUS / 2]
        }
        else if(srcNode.y == dstNode.y) {
            return [srcNode.x - NODE_RADIUS,
                    srcNode.y,
                    dstNode.x + NODE_RADIUS,
                    dstNode.y];
        }
        else {
            return [srcNode.x - NODE_RADIUS / 2,
                    srcNode.y - NODE_RADIUS / 2,
                    dstNode.x + NODE_RADIUS / 2,
                    dstNode.y + NODE_RADIUS / 2];
        }
    }
}

canvas.selectAll("line")
        .data(fixedEdgeList)
        .enter()
        .append("line")
        .attr("x1", edgeInfo => edgeInfo[0])
        .attr("y1", edgeInfo => edgeInfo[1])
        .attr("x2", edgeInfo => edgeInfo[2])
        .attr("y2", edgeInfo => edgeInfo[3])
        .attr("stroke", "black")
        .attr("stroke-width", "2px");


canvas.selectAll("circle")
        .data(Object.values(nodesHardcoded))
        .enter()
        .append("circle")
        .attr("cx", node => node.x)
        .attr("cy", node => node.y)
        .attr("r", NODE_RADIUS)
        .attr("fill", "blue")
        .attr("stroke", "black")
        .attr("stroke-width", "1px");

var textElements = canvas.selectAll("text")
                            .data(Object.values(nodesHardcoded))
                            .enter()
                            .append("text");

textElements.attr("x", dataItem => dataItem["x"] - 16 / 2)
            .attr("y", dataItem => dataItem["y"] + 22 / 2)
            .text(dataItem => dataItem["label"])
            .attr("font-family", "sans-serif")
            .attr("font-size", "24px")
            .attr("fill", "white")
