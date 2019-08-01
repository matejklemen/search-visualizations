var CANVAS_WIDTH = 1000;
var CANVAS_HEIGHT = 600;
var canvas = d3.select("body")
                .append("svg")
                .attr("width", CANVAS_WIDTH)
                .attr("height", CANVAS_HEIGHT);
var loggerMessageStack = [];
var logger = d3.select("#logger");

/* Arrow shape for directed edges -
    http://jsfiddle.net/igbatov/v0ekdzw1/ */
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

/* Glow effect - https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization.html */
var defs = canvas.append("defs");
var filter = defs.append("filter")
    .attr("id","glow");
filter.append("feGaussianBlur")
    .attr("stdDeviation","1.5")
    .attr("result","coloredBlur");
var feMerge = filter.append("feMerge");
feMerge.append("feMergeNode")
    .attr("in","coloredBlur");
feMerge.append("feMergeNode")
    .attr("in","SourceGraphic");

function drawNodeCircle(canvas, idNode, x, y, radius) {
    canvas.append("circle")
        .attr("id", idNode)
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", radius)
        .attr("fill", "blue")
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .style("filter", "url(#glow)");
}

function drawLabelText(canvas, idNode, nodeLabel, x, y) {
    canvas.append("text")
            .attr("id", "label_" + idNode)
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ".35em") // what the fuck? https://stackoverflow.com/a/24482064
            .attr("text-anchor", "middle")
            .text(nodeLabel)
            .attr("font-family", "sans-serif")
            .attr("font-size", "24px")
            .attr("fill", "white");
}

function drawHeuristicBox(canvas, idNode, x, y, size) {
    canvas.append("rect")
        .attr("id", "hbox_" + idNode)
        .attr("x", x)
        .attr("y", y)
        .attr("height", size)
        .attr("width", size)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("opacity", 0.8);
}

function drawHeuristicValueText(canvas, idNode, x, y, h) {
    canvas.append("text")
            .attr("id", "h_" + idNode)
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(h)
            .attr("font-family", "sans-serif")
            .attr("font-size", "18px")
            .attr("font-weight", "bold");
}

function drawDirectedEdgeLine(canvas, idEdge, xStart, yStart, xEnd, yEnd) {
    canvas.append("line")
            .attr("id", idEdge)
            .attr("x1", xStart)
            .attr("y1", yStart)
            .attr("x2", xEnd)
            .attr("y2", yEnd)
            .attr("stroke", "black")
            .attr("stroke-width", "2px")
            .attr("marker-end", "url(#triangle)");
}

/* IDs of edge weight elements: "w_" + <idEdge> */
function drawEdgeWeight(canvas, idEdge, x, y, w) {
    canvas.append("text")
            .attr("id", "w_" + idEdge)
            .attr("x", x)
            .attr("y", y)
            .text(w)
            .attr("font-family", "sans-serif")
            .attr("font-size", "14px")
            .attr("fill", "red")
            .attr("font-weight", "bold");
}

function drawInput(canvas, idInput, xInput, yInput, inputSize, fontSize, fontColor, fontWeight, onKeyPress) {
    canvas.append("foreignObject")
        .attr("x", xInput)
        .attr("y", yInput)
        .attr("width", inputSize)
        .attr("height", inputSize)
        .html(d => '<input type="text" id="' + idInput + '" style="background: none; \
            color: ' + fontColor + '; border: none; font-family: sans-serif; \
            font-size: ' + fontSize + '; font-weight: \"' + fontWeight +'\" />')
        .on("keypress", onKeyPress);
    
    canvas.select("#" + idInput).node().focus();
}

/* Draw transparent circles over nodes for convenient removal logic.
    IDs of deleter elements: "delete_" + <idNode> */
function drawNodeOverlay(canvas, idNode, nodeLabel, centerX, centerY, radius, onClick) {
    canvas.append("circle")
            .attr("id", "delete_" + idNode)
            .attr("cx", centerX)
            .attr("cy", centerY)
            .attr("r", radius)
            .attr("fill", "blue")
            .attr("opacity", 0.0)
            .on("click", onClick)
            .on("mouseover", () => canvas.select("#" + idNode).attr("fill", "darkblue"))
            .on("mouseout", () => canvas.select("#" + idNode).attr("fill", "blue"));
}

function _displayLoggerText() {
    var num_messages = loggerMessageStack.length;
    var msg = num_messages > 0? loggerMessageStack[num_messages - 1]: "";
    logger.text(msg);
}

function displayLoggerMessage(msg) {
    loggerMessageStack.push(msg);
    _displayLoggerText()
}

function clearLatestLoggerMessage() {
    loggerMessageStack.pop();
    _displayLoggerText();
}

function clearLogger() {
    loggerMessageStack = [];
    _displayLoggerText();
}