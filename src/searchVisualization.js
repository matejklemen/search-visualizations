var pathCache = null;
var step = -1; // step before actual first step
var algo = null;
var SRC = "s";
var DST = new Set(["k", "g"]);

var transitionInProgress = false;

var algoToFn = {
    "dfs": (() => depthFirstSearch(dwg, SRC, DST)),
    "bfs": (() => breadthFirstSearch(dwg, SRC, DST)),
    "iddfs": (() => iterativeDeepening(dwg, SRC, DST)),
    "astar": (() => astar(dwg, SRC, DST))
}

function nextStepTransition() {
    if(transitionInProgress)
        return;

    transitionInProgress = true;
    var nextStep = (pathCache === null)? 0: d3.min([pathCache[0].length - 1, step + 1]);
    // last step of trace
    if(nextStep == step) {
        transitionInProgress = false;
        return;
    }

    if(step >= 0)
        resetCurrentStep();

    var nodeLabel = pathCache[0][nextStep];
    canvas.select("#" + nodeData[nodeLabel].idNode)
            .transition()
            .duration(500)
            .attr("stroke-width", "10px")
            // prevent fast button clicks from messing up the visualization
            .on("end", function() {step = nextStep; transitionInProgress = false;});
}

function prevStepTransition() {
    if(transitionInProgress)
        return;

    transitionInProgress = true;
    var prevStep = d3.max([0 - 1, step - 1]);
    // beginning of trace
    if(prevStep == step) {
        transitionInProgress = false;
        return;
    }

    if(step >= 0)
        resetCurrentStep();

    if(prevStep >= 0) {
        var nodeLabel = pathCache[0][prevStep];
        canvas.select("#" + nodeData[nodeLabel].idNode)
                .transition()
                .duration(500)
                .attr("stroke-width", "10px")
                // prevent fast button clicks from messing up the visualization
                .on("end", function() {step = prevStep; transitionInProgress = false;});
    }
    else {
        // state before first step of trace
        step = prevStep;
        transitionInProgress = false;
    }
}

/* Recalculates path when the selected algorithm value changes. */
function updateSelection() {
    algo = d3.select("#selectedAlgorithm").node().value;
    clearVisualization();
    console.log("Updating algorithm to '" + algo + "'");
    pathCache = algoToFn[algo]();
}

/* Removes the visual effects of previous trace. */
function clearVisualization() {
    // state before first step of trace
    step = -1;
    d3.selectAll("circle")
        .attr("stroke-width", "1px");
}

var dwg = new DirectedWeightedGraph();
dwg.addNodesFrom(Object.keys(nodeData));
dwg.addEdgesFrom(edgeList);
updateSelection();