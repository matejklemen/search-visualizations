const LEFT_KEYPRESS = 37;
const RIGHT_KEYPRESS = 39;
const ENTER_KEYPRESS = 13;

const NODE_RADIUS = 30;

const STATES = {
    VIEW: 1,
    ADD_NODE: 2,
    DELETE_NODE: 3,
    ADD_EDGE: 4,
    SELECT_START: 5,
    SELECT_GOAL: 6
};
let currState = STATES.VIEW;

/* op. is e.g. add/delete node, transition is search trace step */
let opInProgress = false;
let transitionInProgress = false;

let newEdgeBuffer = [];
let pathCache = null;
let idxNewNode = 0;
let idxNewEdge = 0;

let transitionStep = -1; // step before actual first step
let selectedStart = "s";
let selectedGoals = new Set(["k", "g"]);

const algoToFn = {
    "dfs": {
        "name": "DFS",
        "fn": (() => depthFirstSearch(dwg, selectedStart, selectedGoals))
    },
    "bfs": {
        "name": "BFS",
        "fn": (() => breadthFirstSearch(dwg, selectedStart, selectedGoals))
    },
    "iddfs": {
        "name": "IDDFS",
        "fn": (() => iterativeDeepening(dwg, selectedStart, selectedGoals))
    },
    "astar": {
        "name": "A*",
        "fn": (() => astar(dwg, selectedStart, selectedGoals))
    }
};

let dwg = new DirectedWeightedGraph();

function getNewNodeId() {
    return "node" + idxNewNode++;
}

function getNewEdgeId() {
    return "edge" + idxNewEdge++;
}

function changeStartNode(nodeLabel) {
    opInProgress = true;
    if(selectedStart == nodeLabel)
        selectedStart = null;
    else
        selectedStart = nodeLabel;
    resetVisualization();
    opInProgress = false;
}

function changeEndNodes(nodeLabel) {
    opInProgress = true;
    if(!selectedGoals.has(nodeLabel))
        selectedGoals.add(nodeLabel);
    else
        selectedGoals.delete(nodeLabel);
    resetVisualization();
    opInProgress = false;
}

class NodeGraphic {
    constructor(id, x, y, label, radius, heuristic) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.label = label;
        this.r = radius;
        this.h = heuristic;
        this.onClick = (() => {});
    }

    /* Getters for single components of a node */
    getCircleObj() { return this.selectElement(""); }
    getLabelObj() { return this.selectElement("label_"); }
    getHeuristicBoxObj() { return this.selectElement("hbox_"); }
    getHeuristicValObj() { return this.selectElement("h_"); }
    getOverlayObj() { return this.selectElement("delete_"); }

    /* Getters for common combinations */
    getHeuristicObj() { return [this.getHeuristicBoxObj(), this.getHeuristicValObj()]; }
    getAllComponents() { return [this.getCircleObj(), this.getLabelObj(), this.getHeuristicBoxObj(), this.getHeuristicValObj(), this.getOverlayObj()]; }

    /* Draw functions for single components */
    drawCircle(canvas) { drawNodeCircle(canvas, this.id, this.x, this.y, this.r); }
    drawLabel(canvas) { drawLabelText(canvas, this.id, this.label, this.x, this.y); }
    drawHeuristicBox(canvas) { drawHeuristicBox(canvas, this.id, this.x - 0.5 * this.r, this.y - 1.5 * this.r, this.r); }
    drawHeuristicVal(canvas) { drawHeuristicValueText(canvas, this.id, this.x, this.y - this.r, this.h); }
    drawOverlay(canvas, onClick) { 
        this.onClick = onClick;
        drawNodeOverlay(canvas, this.id, this.label, this.x, this.y, this.r, () => onClick(this.label));
    }

    /* Draw functions for common combinations */
    drawHeuristicObj(canvas) {
        drawHeuristicBox(canvas);
        drawHeuristicVal(canvas);
    }

    /* Draws the node with same properties. There is a separate draw function (drawNewNode(...)), which is useful when we do not want to draw the entire
        node until valid user input is given */
    redrawNode(canvas) {
        this.drawCircle(canvas);
        this.drawLabel(canvas);
        this.drawHeuristicBox(canvas);
        this.drawHeuristicVal(canvas);
        this.drawOverlay(canvas, this.onClick);
    }

    selectElement(element) {
        return d3.select("#" + element + this.id);
    }

    toggleFocus(toggleOn, transitionDurationMs = 0, onEnd = null) {
        // No-op function if `onEnd` not given
        var effectiveOnEnd = onEnd == null? (() => {}): onEnd;
        this.getCircleObj()
            .transition()
            .duration(transitionDurationMs)
            .attr("stroke-width", toggleOn? "6px": "1px")
            .on("end", onEnd);
    }
}

// (id, x, y, label, radius, heuristic)
var nodeData = {
    "s": new NodeGraphic(getNewNodeId(), 500, 50, "s", NODE_RADIUS, 7),
    "a": new NodeGraphic(getNewNodeId(), 300, 150, "a", NODE_RADIUS, 5),
    "b": new NodeGraphic(getNewNodeId(), 500, 150, "b", NODE_RADIUS, 5),
    "c": new NodeGraphic(getNewNodeId(), 700, 150, "c", NODE_RADIUS, 4),
    "d": new NodeGraphic(getNewNodeId(), 200, 300, "d", NODE_RADIUS, 8),
    "e": new NodeGraphic(getNewNodeId(), 400, 300, "e", NODE_RADIUS, 4),
    "f": new NodeGraphic(getNewNodeId(), 570, 300, "f", NODE_RADIUS, 1),
    "g": new NodeGraphic(getNewNodeId(), 950, 400, "g", NODE_RADIUS, 0),
    "h": new NodeGraphic(getNewNodeId(), 450, 400, "h", NODE_RADIUS, 2),
    "i": new NodeGraphic(getNewNodeId(), 630, 400, "i", NODE_RADIUS, 3),
    "j": new NodeGraphic(getNewNodeId(), 100, 500, "j", NODE_RADIUS, 7),
    "k": new NodeGraphic(getNewNodeId(), 300, 500, "k", NODE_RADIUS, 0)
};

var edgesWithoutId = [
    ["s", "a", 3],
    ["s", "b", 2],
    ["s", "c", 3],
    ["a", "d", 4],
    ["a", "e", 2],
    ["b", "h", 1],
    ["b", "f", 3],
    ["c", "b", 5],
    ["c", "f", 5],
    ["c", "g", 6],
    ["d", "i", 4],
    ["d", "j", 7],
    ["e", "k", 5],
    ["e", "h", 2],
    ["e", "f", 1],
    ["f", "h", 2],
    ["f", "i", 3],
    ["f", "g", 2]
];
let edgeList = {}
edgesWithoutId.forEach(edge => edgeList[getNewEdgeId()] = edge);

function nodesOverlappingArea(xLeftArea, xRightArea, yTopArea, yBottomArea) {
    let nodes = [];
    for(let nodeLabel in nodeData) {
        // take a rectangle drawn around node + its heuristic graphic as the node's effective area
        const currNode = nodeData[nodeLabel];
        const [xLeft, xRight, yTop, yBottom] = [currNode.x - currNode.r, currNode.x + currNode.r,
                                            currNode.y - 1.5 * currNode.r, currNode.y + currNode.r];

        const inArea = !(xLeft > xRightArea || xRight < xLeftArea || yTop > yBottomArea || yBottom < yTopArea);
        if(inArea)
            nodes.push(nodeLabel);
    }

    return nodes;
}

function angleBetweenPoints(x1, y1, x2, y2) {
    // https://stackoverflow.com/a/27481611
    const deltaY = (y1 - y2);
    const deltaX = (x2 - x1);
    const result = Math.atan2(deltaY, deltaX);
    return (result < 0) ? (2 * Math.PI + result): result;
}

/* Determines edge start and end in a way that the circles do not overlap with lines, 
    but rather that the lines touch the boundary of the circles. */
function fixEdgeStartEnd(edge) {
    const [srcLabel, dstLabel, _] = edge;
    const srcNode = nodeData[srcLabel];
    const dstNode = nodeData[dstLabel];

    // Subtracting angle from 2PI because of screen coordinates being different (0, 0 is top-left corner)
    const angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    const angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    // https://stackoverflow.com/questions/5300938/calculating-the-position-of-points-in-a-circle
    return [srcNode.x + NODE_RADIUS * Math.cos(angleSrcDst),
            srcNode.y + NODE_RADIUS * Math.sin(angleSrcDst),
            dstNode.x + NODE_RADIUS * Math.cos(angleDstSrc),
            dstNode.y + NODE_RADIUS * Math.sin(angleDstSrc)];
}

// TODO: refactor this (reuse common functionality from `fixEdgeStartEnd`) - maybe add an optional SCALE parameter
function distanceLabelAndLocation(edge) {
    const [srcLabel, dstLabel, dist] = edge;
    const srcNode = nodeData[srcLabel];
    const dstNode = nodeData[dstLabel];

    // should be between 0 and 1, 0 means label is closer to source node, 1 means closer to dst node
    const SCALE = 0.2

    // subtracting angle from 2PI because (0, 0) is in top-left corner in screen coordinates
    const angleSrcDst = 2 * Math.PI - angleBetweenPoints(srcNode.x, srcNode.y, dstNode.x, dstNode.y);
    const angleDstSrc = 2 * Math.PI - angleBetweenPoints(dstNode.x, dstNode.y, srcNode.x, srcNode.y);
    const [startX, startY, endX, endY] = fixEdgeStartEnd(edge);

    const OFFSET = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) * SCALE;
    return [srcNode.x + (NODE_RADIUS + OFFSET) * Math.cos(angleSrcDst),
            srcNode.y + (NODE_RADIUS + OFFSET) * Math.sin(angleSrcDst)];
}

/* Removes node with label `nodeLabel` from the screen and the underlying data structures. */
function deleteNodeAndEdges(graph, nodeLabel) {
    if(currState != STATES.DELETE_NODE || opInProgress)
        return;

    opInProgress = true;
    let foundItems = new Set();
    // handle node circle element, label, heuristic text and heuristic box
    foundItems.add(nodeData[nodeLabel].id);
    foundItems.add("label_" + nodeData[nodeLabel].id);
    foundItems.add("h_" + nodeData[nodeLabel].id);
    foundItems.add("hbox_" + nodeData[nodeLabel].id);

    // handle the transparent overlay element that serves as a convenient click area
    foundItems.add("delete_" + nodeData[nodeLabel].id);

    // handle lines of out-edges and text of weights
    const successors = Object.values(dwg.outEdges[nodeLabel]);
    for(let i = 0; i < successors.length; i++) {
        foundItems.add(successors[i]);
        foundItems.add("w_" + successors[i]);
        graph.removeEdge(edgeList[successors[i]]);
        delete edgeList[successors[i]];
    }

    // handle lines of in-edges and text of weights
    const predecessors = Object.values(dwg.inEdges[nodeLabel]);
    for(let i = 0; i < predecessors.length; i++) {
        foundItems.add(predecessors[i]);
        foundItems.add("w_" + predecessors[i]);
        graph.removeEdge(edgeList[predecessors[i]]);
        delete edgeList[predecessors[i]];
    }

    foundItems.forEach(idElement => d3.select("#" + idElement).remove());
    graph.removeNode(nodeLabel);
    delete nodeData[nodeLabel];

    opInProgress = false;
    // recalculate path to be displayed on screen
    resetVisualization();
}

function drawNewNode(canvas, nodeObj, drawInputBoxes = false) {
    /* Requires `label` parameter as this is reused between case where existing node is being drawn and 
        case where new node is being added and drawn */
    function clickFunction(label) {
        if(currState == STATES.DELETE_NODE)
            deleteNodeAndEdges(dwg, nodeObj.label);
        else if(currState == STATES.ADD_EDGE) {
            newEdgeBuffer.push(nodeObj.label);
            addNewEdge();
        }
        else if(currState == STATES.SELECT_START)
            changeStartNode(label);
        else if(currState == STATES.SELECT_GOAL)
            changeEndNodes(label);
    }

    nodeObj.drawCircle(canvas);
    nodeObj.drawHeuristicBox(canvas);

    if(drawInputBoxes) {
        // input for heuristic
        drawInput(canvas, "newNodeHeuristic", (nodeObj.x - nodeObj.r / 4), (nodeObj.y - 3 * nodeObj.r / 2), nodeObj.r, "18px", "black", "bold", function() {
            if(d3.event.keyCode != ENTER_KEYPRESS)
                return;

            const newHeuristicValue = canvas.select("#newNodeHeuristic").node().value;
            if(!isNumber(newHeuristicValue))
                return;

            nodeObj.h = parseInt(newHeuristicValue);
            nodeObj.drawHeuristicVal(canvas);
            canvas.select("#newNodeHeuristic").remove();
            canvas.select("foreignObject").remove();

            // input for node label after the user enters the heuristic
            drawInput(canvas, "newNodeLabel", (nodeObj.x - nodeObj.r / 4), (nodeObj.y - nodeObj.r / 2), nodeObj.r, "24px", "white", "normal", function() {
                if(d3.event.keyCode != ENTER_KEYPRESS)
                    return;

                const newNodeLabel = canvas.select("#newNodeLabel").node().value;
                if(!isCharSeq(newNodeLabel) || (newNodeLabel in nodeData))
                    return;
                
                nodeObj.label = newNodeLabel;
                nodeObj.drawLabel(canvas);
                canvas.select("#newNodeLabel").remove();
                canvas.select("foreignObject").remove();
                
                nodeObj.drawOverlay(canvas, clickFunction);
                nodeData[nodeObj.label] = nodeObj;
                updateGraph();
                opInProgress = false;
            });
        });
    }
    else {
        nodeObj.drawHeuristicVal(canvas);
        nodeObj.drawLabel(canvas);

        nodeObj.drawOverlay(canvas, clickFunction);
        nodeData[nodeObj.label] = nodeObj;
        updateGraph();
        opInProgress = false;
    }
}

function addNewNode(x, y) {
    if(currState != STATES.ADD_NODE || opInProgress)
        return;

    // check for overlap
    for(let nodeLabel in nodeData) {
        const currNodeData = nodeData[nodeLabel];

        const leftX = currNodeData.x - NODE_RADIUS;
        const rightX = currNodeData.x + NODE_RADIUS;
        const topY = currNodeData.y - NODE_RADIUS;
        const bottomY = currNodeData.y + NODE_RADIUS;

        if(leftX <= x && x <= rightX && topY <= y && y <= bottomY)
            return;
    }

    opInProgress = true;
    const idNodeElement = getNewNodeId();
    const newNodeObj = new NodeGraphic(idNodeElement, x, y, null, NODE_RADIUS, null);
    drawNewNode(canvas, newNodeObj, true);
}

function drawNewEdge(canvas, idEdge, srcNode, dstNode, weight, drawInputBox = false) {
    // coordinates for edge from boundary of first node's circle to boundary of second node's circle 
    const [xStart, yStart, xEnd, yEnd] = fixEdgeStartEnd([srcNode, dstNode, weight]);
    const [xWeight, yWeight] = distanceLabelAndLocation([srcNode, dstNode, weight]);

    drawDirectedEdgeLine(canvas, idEdge, xStart, yStart, xEnd, yEnd);

    if(drawInputBox) {
        // get user input
        drawInput(canvas, "newEdgeWeight", xWeight, yWeight, NODE_RADIUS, "14px", "red", "bold", function() {
            if(d3.event.keyCode != ENTER_KEYPRESS)
                return;

            let newEdgeWeight = canvas.select("#newEdgeWeight").node().value;
            if(!isNumber(newEdgeWeight))
                return;

            newEdgeWeight = parseInt(newEdgeWeight);
            drawEdgeWeight(canvas, idEdge, xWeight, yWeight, newEdgeWeight);
            canvas.select("#newEdgeWeight").remove();
            canvas.select("foreignObject").remove();

            // find & redraw nodes, which might overlap with new edge to make sure that edge is drawn in background
            const nodesToRedraw = nodesOverlappingArea(d3.min([xStart, xEnd]), d3.max([xStart, xEnd]),
                d3.min([yStart, yEnd]), d3.max([yStart, yEnd]));
            for(let i = 0; i < nodesToRedraw.length; i++) {
                nodeData[nodesToRedraw[i]].getAllComponents().forEach(comp => comp.remove());
                nodeData[nodesToRedraw[i]].redrawNode(canvas);
            }

            edgeList[idEdge] = [srcNode, dstNode, newEdgeWeight];
            updateGraph();
            opInProgress = false;
        });
    }
    else {
        // draw weight immediately
        drawEdgeWeight(canvas, idEdge, xWeight, yWeight, weight);
        edgeList[idEdge] = [srcNode, dstNode, weight];
        updateGraph();
        opInProgress = false;
    }
}

function addNewEdge() {
    if(currState != STATES.ADD_EDGE || opInProgress)
        return;

    // need 2 nodes (possibly same) to form an edge
    if(newEdgeBuffer.length < 2)
        return;

    const [srcNode, dstNode] = newEdgeBuffer;
    // check that the edge doesn't already exist
    if(dstNode in dwg.outEdges[srcNode]) {
        console.log("A directed edge between '" + srcNode + "' and '" + dstNode + "' already exists.");
        newEdgeBuffer = [];
        return;
    }

    // TODO
    if(srcNode == dstNode) {
        console.log("TODO (Not implemented): Figure out how to draw self-loops");
        newEdgeBuffer = [];
        return;
    }

    opInProgress = true;
    drawNewEdge(canvas, getNewEdgeId(), srcNode, dstNode, 0, true);
    newEdgeBuffer = [];
}

function toggleState(caller, newState) {
    // (2nd condition) toggling on multiple buttons
    if(opInProgress || currState != STATES.VIEW && currState != newState)
        return;

    opInProgress = true;
    const turnOff = (currState == newState);
    // visually show which state is selected
    const newButtonColor = turnOff? "white": "#DEDEDE";

    d3.select("#" + caller.id)
        .style("background-color", newButtonColor)
        // reinitialize previously set properties of button
        .on("mouseover", function() {
            if(turnOff)
                d3.select("#" + caller.id).style("background-color", "#F5F5F5");
        })
        .on("mouseout", function() {
            if(turnOff)
                d3.select("#" + caller.id).style("background-color", "white")
        })
        .transition()
        .on("end", function() {
            currState = (turnOff? STATES.VIEW: newState);
            opInProgress = false;
        });
}

/* Note: actually only matches non-negative numbers */
function isNumber(data) {
    return data.match(/^[0-9]+$/);
}

function isCharSeq(data) {
    return data.match(/^[a-zA-Z]+$/);
}

function resetCurrentStep() {
    const nodeLabel = pathCache[0][transitionStep];
    nodeData[nodeLabel].toggleFocus(false);
    clearLatestLoggerMessage();
}

function stepTransition(stepDirection) {
    /* Perform a transition in trace for `stepDirection` steps. If above 0, move forward; if above 0,
    move backward for specified amount of steps.

    Notes:
    - inputing 0 amounts to a no-op. 
    - allows for movement within bounds of trace (i.e. does not work in a circular manner) 
    */
    // no visualization available or transition in progress or invalid input
    if(pathCache == null || transitionInProgress || stepDirection == 0)
        return;

    transitionInProgress = true;

    const newStep = (stepDirection > 0)?
        // can move forwards to at most the last visible step of visualization
        d3.min([pathCache[0].length - 1, transitionStep + stepDirection]):
        // can move backwards to at most the step before the first visible one
        d3.max([0 - 1, transitionStep + stepDirection]);

    // at end of trace & trying to move forward or at beginning of trace & trying to move backward => no-op
    if(newStep == transitionStep) {
        transitionInProgress = false;
        return;
    }

    if(transitionStep >= 0)
        resetCurrentStep();

    if(newStep >= 0) {
        const currentMessage = pathCache[2][newStep];
        displayLoggerMessage(currentMessage);
        const nodeLabel = pathCache[0][newStep];
        nodeData[nodeLabel].toggleFocus(true, transitionDurationMs = 500, onEnd = function() {
            transitionStep = newStep;
            transitionInProgress = false;
        });
    }
    // at step before the first visible one
    else {
        transitionStep = newStep;
        transitionInProgress = false;
    }
}

/* Removes the visual effects of previous trace. */
function clearVisualization() {
    // state before first step of trace
    transitionStep = -1;
    Object.values(nodeData).forEach(n => n.toggleFocus(false, transitionDurationMs = 50));
}

function resetVisualization() {
    d3.select("#algorithmDetails").text("");
    clearLatestLoggerMessage();
    const selectedAlgorithm = d3.select("#selectedAlgorithm").node().value;
    clearVisualization();
    updateGraph();

    // rerun algorithm on new data
    pathCache = algoToFn[selectedAlgorithm].fn();
    const startNode = selectedStart == null? "<NO START>": `'${selectedStart}'`;
    const goalNodes = selectedGoals.size == 0? "<NO GOAL>": `{${Array.from(selectedGoals).map(n => `'${n}'`).join(", ")}}`;
    d3.select("#algorithmDetails").text(algoToFn[selectedAlgorithm].name + " from " + startNode + " to " + goalNodes);
}

function updateGraph() {
    dwg.addNodesFrom(Object.keys(nodeData));
    dwg.addEdgesFrom(edgeList);
}

// Draw directed edges - ID: "<id-edge>"
Object.keys(edgeList).forEach(function(idEdge) {
    const [srcNode, dstNode, weight] = edgeList[idEdge];
    drawNewEdge(canvas, idEdge, srcNode, dstNode, weight, drawInputBox = false);
});

// Draw nodes - ID: "<id-node>"
Object.keys(nodeData).forEach(function(nodeLabel) {
    const nodeProps = nodeData[nodeLabel];
    drawNewNode(canvas, nodeProps, false);
});

canvas.on("click", function() {
    const [x, y] = d3.mouse(this);
    console.log("You clicked on (" + x + ", " + y + ")");
    if(currState == STATES.ADD_NODE)
        addNewNode(x, y);
});

/* Allows handling animation transitions by pressing left/right arrow key.
    https://stackoverflow.com/questions/6542413/bind-enter-key-to-specific-button-on-page */
document.onkeydown = function (e) {
    e = e || window.event;
    switch (e.which || e.keyCode) {
        case LEFT_KEYPRESS: stepTransition(-1);
            break;
        case RIGHT_KEYPRESS: stepTransition(1);
            break;
    }
}

updateGraph(dwg, Object.keys(nodeData), edgeList);
resetVisualization();