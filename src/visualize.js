// TODO: group together the ways to determine bounds for e.g. heuristic boxes
// (so that if it changes, it only changes in, ideally, 1 place)

var LEFT_KEYPRESS = 37;
var RIGHT_KEYPRESS = 39;
var ENTER_KEYPRESS = 13;

var canvasWidth = 1000;
var canvasHeight = 600;
var NODE_RADIUS = 30;

var nodeDeleteMode = false;
var nodeAddMode = false;

var nodeBeingAdded = false;

var nodeData = {
    "s": {"x": 500, "y": 50, "h": 7},
    "a": {"x": 300, "y": 150, "h": 5},
    "b": {"x": 500, "y": 150, "h": 5},
    "c": {"x": 700, "y": 150, "h": 4},
    "d": {"x": 200, "y": 300, "h": 8},
    "e": {"x": 400, "y": 300, "h": 4},
    "f": {"x": 570, "y": 300, "h": 1},
    "g": {"x": 950, "y": 400, "h": 0},
    "h": {"x": 450, "y": 400, "h": 2},
    "i": {"x": 630, "y": 400, "h": 3},
    "j": {"x": 100, "y": 500, "h": 7},
    "k": {"x": 300, "y": 500, "h": 0}
};

// Assign unique ids to nodes
Object.keys(nodeData).forEach((label, i) => nodeData[label].idNode = "node" + i);

var edgeList = {
    "edge0": ["s", "a", 3],
    "edge1": ["s", "b", 2],
    "edge2": ["s", "c", 3],
    "edge3": ["a", "d", 4],
    "edge4": ["a", "e", 2],
    "edge5": ["b", "h", 1],
    "edge6": ["b", "f", 3],
    "edge7": ["c", "b", 5],
    "edge8": ["c", "f", 5],
    "edge9": ["c", "g", 6],
    "edge10": ["d", "i", 4],
    "edge11": ["d", "j", 7],
    "edge12": ["e", "k", 5],
    "edge13": ["e", "h", 2],
    "edge14": ["e", "f", 1],
    "edge15": ["f", "h", 2],
    "edge16": ["f", "i", 3],
    "edge17": ["f", "g", 2]
}

/* Holds coordinates where drawn edges start and end in order appear
    as connections from center of one node to center of other node */
var fixedEdgeList = {}
for(var idEdge in edgeList)
    fixedEdgeList[idEdge] = fixEdgeStartEnd(edgeList[idEdge]);

/*
var infoPanel = d3.select("body")
                .append("svg")
                .attr("width", 200)
                .attr("height", canvasHeight)
                .append("rect")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", "1px");
*/

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
    var srcNode = nodeData[srcLabel];
    var dstNode = nodeData[dstLabel];

    // Subtracting angle from 2PI because of screen coordinates being different (0, 0 is top-left corner)
    var angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    var angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    // https://stackoverflow.com/questions/5300938/calculating-the-position-of-points-in-a-circle
    return [srcNode.x + NODE_RADIUS * Math.cos(angleSrcDst),
            srcNode.y + NODE_RADIUS * Math.sin(angleSrcDst),
            dstNode.x + NODE_RADIUS * Math.cos(angleDstSrc),
            dstNode.y + NODE_RADIUS * Math.sin(angleDstSrc)];
}

// TODO: refactor this (reuse common functionality from `fixEdgeStartEnd`) - maybe add an optional SCALE parameter
function distanceLabelAndLocation(idEdge) {
    var edge = edgeList[idEdge];
    // returns {"label": weight of edge, "x": x position of label, "y": y position of label}
    var [srcLabel, dstLabel, dist] = edge;
    var srcNode = nodeData[srcLabel];
    var dstNode = nodeData[dstLabel];

    // should be between 0 and 1, 0 means label is closer to source node, 1 means closer to dst node
    SCALE = 0.2

    /* Subtracting angle from 2PI because (0, 0) is in top-left corner in screen coordinates. */
    var angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    var angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    var [startX, startY, endX, endY] = fixEdgeStartEnd(edge);

    OFFSET = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) * SCALE;
    return {"label": dist, "x": srcNode.x + (NODE_RADIUS + OFFSET) * Math.cos(angleSrcDst),
            "y": srcNode.y + (NODE_RADIUS + OFFSET) * Math.sin(angleSrcDst), "idEdge": idEdge};
}

/* Removes node with label `nodeLabel` from the screen and the underlying data structures. */
function deleteNodeAndEdges(graph, nodeLabel) {
    if(!nodeDeleteMode)
        return;

    var foundItems = new Set();
    // handle node circle element, label, heuristic text and heuristic box
    foundItems.add(nodeData[nodeLabel].idNode);
    foundItems.add("label_" + nodeData[nodeLabel].idNode);
    foundItems.add("h_" + nodeData[nodeLabel].idNode);
    foundItems.add("hbox_" + nodeData[nodeLabel].idNode);

    // handle the transparent overlay element that serves as a convenient click area
    foundItems.add("delete_" + nodeData[nodeLabel].idNode);

    // handle lines of out-edges and text of weights
    var successors = Object.values(dwg.outEdges[nodeLabel]);
    for(var i = 0; i < successors.length; i++) {
        foundItems.add(successors[i]);
        foundItems.add("w_" + successors[i]);
        graph.removeEdge(edgeList[successors[i]]);
        delete edgeList[successors[i]];
    }

    // handle lines of in-edges and text of weights
    var predecessors = Object.values(dwg.inEdges[nodeLabel]);
    for(var i = 0; i < predecessors.length; i++) {
        foundItems.add(predecessors[i]);
        foundItems.add("w_" + predecessors[i]);
        graph.removeEdge(edgeList[predecessors[i]]);
        delete edgeList[predecessors[i]];
    }

    foundItems.forEach(idElement => d3.select("#" + idElement).remove());
    graph.removeNode(nodeLabel);
    delete nodeData[nodeLabel];

    // recalculate path to be displayed on screen
    updateSelection();
}

function drawNewNode(x, y) {
    // TODO: ensure no other node is being added
    if(nodeBeingAdded)
        return;

    // TODO: check for overlap
    var overlap = false;
    for(var nodeLabel in nodeData) {
        var currNodeData = nodeData[nodeLabel];

        var leftX = currNodeData["x"] - NODE_RADIUS;
        var rightX = currNodeData["x"] + NODE_RADIUS;
        var topY = currNodeData["y"] - NODE_RADIUS;
        var bottomY = currNodeData["y"] + NODE_RADIUS;

        overlap = overlap || (leftX <= x && x <= rightX && topY <= y && y <= bottomY);
    }

    if(overlap)
        return;

    nodeBeingAdded = true;
    var newNodeId = "node" + Object.keys(nodeData).length;
    drawNode(canvas, newNodeId, null, x, y, NODE_RADIUS, null, true);
    return;

     // TODO: add input field for label (on enter -> done adding)
    canvas.append("foreignObject")
            .attr("x", x - NODE_RADIUS / 4)
            .attr("y", y - NODE_RADIUS / 2)
            .attr("width", NODE_RADIUS)
            .attr("height", NODE_RADIUS)
            .html(function(d) {
                return '<input type="text" id="newNodeLabel" style="background: none; color: white; \
                        border: none; font-family: sans-serif; font-size: 24px;" />'
            })
            .on("keypress", function() {
                if(d3.event.keyCode == ENTER_KEYPRESS) {
                    console.log("Pressed ENTER!");
                    d3.select(this).remove();
                    nodeBeingAdded = false; // TODO: move this to some common place
                }
            });

    // add input field for heuristic value (on enter -> done adding)
    canvas.append("foreignObject")
            .attr("x", nodeInfo => x - NODE_RADIUS / 4)
            .attr("y", nodeInfo => y - 3 * NODE_RADIUS / 2)
            .attr("width", NODE_RADIUS)
            .attr("height", NODE_RADIUS)
            .html(function(d) {
                return '<input type="text" id="newNodeHeuristic" style="background: none; color: black; \
                        border: none; font-family: sans-serif; font-size: 18px; font-weight: bold;" />'
            })
            .on("keypress", function() {
                if(d3.event.keyCode == ENTER_KEYPRESS) {
                    console.log("Pressed ENTER!");
                    d3.select(this).remove();
                    nodeBeingAdded = false; // TODO: move this to some common place
                }
            });

    canvas.select("#newNodeLabel").node().focus();

    // TODO: unfinished
    // ...
}

function toggleNodeDeleteMode() {
    var deleteBtnMessage = nodeDeleteMode? "yeet": "done deleting";
    d3.select("#removeNode").text(deleteBtnMessage);
    nodeDeleteMode = !nodeDeleteMode;
}

function toggleNodeAddMode() {
    var addBtnMessage = nodeAddMode? "node+": "done adding nodes";
    d3.select("#addNode").text(addBtnMessage);
    nodeAddMode = !nodeAddMode;
}

var canvas = d3.select("body")
                .append("svg")
                .attr("width", canvasWidth)
                .attr("height", canvasHeight);

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

// Draw directed edges - ID: "<id-edge>"
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

/* Draw node (and the label, heuristic box, heuristic value). */
function drawNode(canvas, idNode, nodeLabel, centerX, centerY, radius, heuristic, drawInputBoxes = false) {
    function drawLabel(newNodeLabel) {
        canvas.append("text")
                .attr("id", nodeLabel => "label_" + idNode) /* format: "label_node<number> */
                .attr("x", nodeLabel => centerX - 16 / 2)
                .attr("y", nodeLabel => centerY + 22 / 2)
                .text(nodeLabel => newNodeLabel)
                .attr("font-family", "sans-serif")
                .attr("font-size", "24px")
                .attr("fill", "white");
    }

    function drawHeuristicValue(newhValue) {
        canvas.append("text")
                .attr("id", nodeInfo => "h_" + idNode) /* format: "h_node<number>" */
                .attr("x", nodeInfo => centerX - 6)
                .attr("y", nodeInfo => (centerY - 3 * radius / 2 + 22))
                .text(nodeInfo => newhValue)
                .attr("font-family", "sans-serif")
                .attr("font-size", "18px")
                .attr("font-weight", "bold");
    }

    function addInput(idInput, xInput, yInput, fontSize, fontColor, fontWeight, onEnter) {
        console.log("Adding input #" + idInput);
        canvas.append("foreignObject")
            .attr("x", xInput)
            .attr("y", yInput)
            .attr("width", radius)
            .attr("height", radius)
            .html(function(d) {
                return '<input type="text" id="' + idInput + '" style="background: none; \
                color: ' + fontColor + '; border: none; font-family: sans-serif; \
                font-size: ' + fontSize + '; font-weight: \"' + fontWeight +'\" />';
            })
        .on("keypress", function() {
            if(d3.event.keyCode == ENTER_KEYPRESS)
                onEnter();
        });
        
        canvas.select("#" + idInput).node().focus();
    }

    // visible node
    canvas.append("circle")
        .attr("id", idNode) /* format: "node<number>" */
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", radius)
        .attr("fill", "blue")
        .attr("stroke", "black")
        .attr("stroke-width", "1px");

    // box to hold heuristic value of a node
    canvas.append("rect")
        .attr("id", "hbox_" + idNode) /* format: "hbox_node<number>" */
        .attr("x", nodeInfo => centerX - NODE_RADIUS / 2)
        .attr("y", nodeInfo => centerY - 3 * NODE_RADIUS / 2)
        .attr("width", radius)
        .attr("height", radius)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("opacity", 0.8);

    // TODO: validate inputs! (that they are numbers)
    // TODO: add new nodes
    if(drawInputBoxes) {
        // input for heuristic
        addInput("newNodeHeuristic", (centerX - radius / 4), (centerY - 3 * radius / 2), "18", "black", "bold", function() {
            var newHeuristicValue = canvas.select("#newNodeHeuristic").node().value;
            drawHeuristicValue(newHeuristicValue)
            canvas.select("#newNodeHeuristic").remove();
            // Only show the second input field after user completes first
            addInput("newNodeLabel", (centerX - radius / 4), (centerY - radius / 2), "24px", "white", "normal", function() {
                var newNodeLabel = canvas.select("#newNodeLabel").node().value;
                drawLabel(newNodeLabel);
                canvas.select("#newNodeLabel").remove();
                nodeBeingAdded = false;
            });
        });
    }
    else {
        drawLabel(nodeLabel);
        drawHeuristicValue(heuristic);
    }

}

// Draw nodes - ID: "<id-node>"
Object.keys(nodeData).forEach(function(nodeLabel) {
    var nodeProps = nodeData[nodeLabel];
    drawNode(canvas, nodeProps["idNode"], nodeLabel, nodeProps["x"], nodeProps["y"], NODE_RADIUS, nodeProps["h"]);
});

// Draw weights for directed edges - ID: "w_<edge-id>"
canvas.selectAll("edgeWeight")
        .data(Object.keys(edgeList).map(distanceLabelAndLocation))
        .enter()
        .append("text")
        .attr("id", item => "w_" + item["idEdge"])
        .attr("x", item => item["x"])
        .attr("y", item => item["y"])
        .text(item => String(item["label"]))
        .attr("font-family", "sans-serif")
        .attr("font-size", "14px")
        .attr("fill", "red")
        .attr("font-weight", "bold");

/* Draw transparent circles over nodes for convenient removal logic -
    outside of drawNode(...) as it requires the graph object */
canvas.selectAll("nodeDeleter")
        .data(Object.keys(nodeData))
        .enter()
        .append("circle")
        .attr("id", nodeLabel => "delete_" + nodeData[nodeLabel]["idNode"])
        .attr("cx", nodeLabel => nodeData[nodeLabel]["x"])
        .attr("cy", nodeLabel => nodeData[nodeLabel]["y"])
        .attr("r", NODE_RADIUS)
        .attr("fill", "blue")
        .attr("opacity", 0.0)
        .on("click", nodeLabel => deleteNodeAndEdges(dwg, nodeLabel))
        .on("mouseover", nodeLabel =>
            canvas.select("#" + nodeData[nodeLabel]["idNode"]).attr("fill", "darkblue"))
        .on("mouseout", nodeLabel =>
            canvas.select("#" + nodeData[nodeLabel]["idNode"]).attr("fill", "blue"));

// TODO: create logic for creating nodes and connecting nodes via edges
canvas.on("click", function() {
    var [x, y] = d3.mouse(this);
    console.log("You clicked on (" + x + ", " + y + ")");
    // TODO: ensure node adding mode is selected (and call function)
    if(nodeAddMode) {
        // console.log("Node adding logic is commented out as it's not fully implemented");
        drawNewNode(x, y);
    }

});

/* Allows handling animation transitions by pressing left/right arrow key.
    https://stackoverflow.com/questions/6542413/bind-enter-key-to-specific-button-on-page */
document.onkeydown = function (e) {
    e = e || window.event;
    switch (e.which || e.keyCode) {
        case LEFT_KEYPRESS: prevStepTransition();
            break;
        case RIGHT_KEYPRESS: nextStepTransition();
            break;
    }
}
