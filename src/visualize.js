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

var currId = 0
for(nodeLabel in nodesHardcoded) {
    nodesHardcoded[nodeLabel].idNode = "node" + currId;
    currId++;
}

var edgeList = {
    "edge0": ["A", "B", 10],
    "edge1": ["B", "C", 5],
    "edge2": ["B", "D", 3],
    "edge3": ["D", "E", 4],
    "edge4": ["A", "E", 3],
    "edge5": ["E", "F", 7],
    "edge6": ["E", "G", 0]
};

var fixedEdgeList = {}
for(idEdge in edgeList)
    fixedEdgeList[idEdge] = fixEdgeStartEnd(edgeList[idEdge]);

var canvas = d3.select("body")
                .append("svg")
                .attr("width", canvasWidth)
                .attr("height", canvasHeight);

function angleBetweenPoints(x1, y1, x2, y2) {
    // https://stackoverflow.com/a/27481611
    var deltaY = (y1 - y2);
    var deltaX = (x2 - x1);
    var result = Math.atan2(deltaY, deltaX);
    return (result < 0) ? (2 * Math.PI + result): result;
}

/* Determines edge start and end in a way that the circles do not overlap with lines, 
    but rather that the lines touch the boundary of the circles. */
function fixEdgeStartEnd(edge) {
    var [srcLabel, dstLabel, _] = edge;
    var srcNode = nodesHardcoded[srcLabel];
    var dstNode = nodesHardcoded[dstLabel];

    // Subtracting angle from 2PI because of screen coordinates being different (0, 0 is top-left corner)
    var angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    var angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    // https://stackoverflow.com/questions/5300938/calculating-the-position-of-points-in-a-circle
    return [srcNode.x + NODE_RADIUS * Math.cos(angleSrcDst),
            srcNode.y + NODE_RADIUS * Math.sin(angleSrcDst),
            dstNode.x + NODE_RADIUS * Math.cos(angleDstSrc),
            dstNode.y + NODE_RADIUS * Math.sin(angleDstSrc)];
}

// TODO: refactor this (reuse common functionality from `fixEdgeStartEnd`)
function distanceLabelAndLocation(edge) {
    // returns {"label": weight of edge, "x": x position of label, "y": y position of label}
    var [srcLabel, dstLabel, dist] = edge;
    var srcNode = nodesHardcoded[srcLabel];
    var dstNode = nodesHardcoded[dstLabel];

    // should be between 0 and 1, 0 means label is closer to source node, 1 means closer to dst node
    SCALE = 0.2

    /* Subtracting angle from 2PI because (0, 0) is in top-left corner in screen coordinates. */
    var angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    var angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    var [startX, startY, endX, endY] = fixEdgeStartEnd(edge);

    OFFSET = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) * SCALE;
    return {"label": dist, "x": srcNode.x + (NODE_RADIUS + OFFSET) * Math.cos(angleSrcDst),
            "y": srcNode.y + (NODE_RADIUS + OFFSET) * Math.sin(angleSrcDst)};
}

function toggleFocusNode(nodeLabel, focus) {
    canvas.select("#" + nodesHardcoded[nodeLabel].idNode)
            .transition()
            .duration(500)
            .attr("opacity", focus? 0.5: 1.0);
}

// http://jsfiddle.net/igbatov/v0ekdzw1/
canvas.append("svg:defs").append("svg:marker")
    .attr("id", "triangle")
    .attr("refX", 10)
    .attr("refY", 6)
    .attr("markerWidth", 10)
    .attr("markerHeight", 30)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6")
    .style("fill", "black");

canvas.selectAll("line")
        .data(d3.keys(fixedEdgeList))
        .enter()
        .append("line")
        .attr("id", idEdge => idEdge)
        .attr("x1", idEdge => fixedEdgeList[idEdge][0])
        .attr("y1", idEdge => fixedEdgeList[idEdge][1])
        .attr("x2", idEdge => fixedEdgeList[idEdge][2])
        .attr("y2", idEdge => fixedEdgeList[idEdge][3])
        .attr("stroke", "black")
        .attr("stroke-width", "2px")
        .attr("marker-end", "url(#triangle)");

canvas.selectAll("circle")
        .data(Object.values(nodesHardcoded))
        .enter()
        .append("circle")
        .attr("id", nodeInfo => nodeInfo.idNode)
        .attr("cx", nodeInfo => nodeInfo.x)
        .attr("cy", nodeInfo => nodeInfo.y)
        .attr("r", NODE_RADIUS)
        .attr("fill", "blue")
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("opacity", 1.0);

canvas.selectAll("text")
        .data(Object.values(nodesHardcoded))
        .enter()
        .append("text")
        .attr("x", dataItem => dataItem["x"] - 16 / 2)
        .attr("y", dataItem => dataItem["y"] + 22 / 2)
        .text(dataItem => dataItem["label"])
        .attr("font-family", "sans-serif")
        .attr("font-size", "24px")
        .attr("fill", "white")

canvas.selectAll("edgeWeight")
        .data(Object.values(edgeList).map(distanceLabelAndLocation))
        .enter()
        .append("text")
        .attr("x", item => item["x"])
        .attr("y", item => item["y"])
        .text(item => String(item["label"]))
        .attr("font-family", "sans-serif")
        .attr("font-size", "14px")
        .attr("fill", "red")
        .attr("font-weight", "bold")
