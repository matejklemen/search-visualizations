class DirectedWeightedGraph {
    /*
        Instructions to use this class:
        (1.) Create a DirectedWeightedGraph
        >> var G = new DirectedWeightedGraph();
        (2.) Add nodes to created graph.
        >> G.addNodesFrom(["a", "b", "c"]);
        (3.) Add edges to created graph. NOTE: Nodes that are connected with an edge must be manually 
        added before (see step 2.), otherwise adding an edge will throw an exception.
        >> G.addEdgesFrom({"edge0": ["a", "b", 10], "edge1": ["a", "c", 3]});
    */
    constructor() {
        this.nodes = new Set()
        this.edges = {}
        this.inEdges = {}
        this.outEdges = {}
    }

    addNodesFrom(nodes) {
        // nodes... iterable of node labels
        for(var nodeLabel in nodes) {
            this.nodes.add(nodeLabel);
            this.inEdges[nodeLabel] = {};
            this.outEdges[nodeLabel] = {};
        }
    }

    addEdgesFrom(edges) {
        // edges... dictionary of {edgeId: [srcNode, dstNode, weight]}
        for(var edgeId in edges) {
            var [srcNode, dstNode, weight] = edges[edgeId];
            this.edges[edgeId] = edges[edgeId];
            this.inEdges[dstNode][srcNode] = edgeId;
            this.outEdges[srcNode][dstNode] = edgeId;
        }
    }
}

class ReconstructionNode {
    constructor(node, parentNode) {
        this.node = node;
        this.parentNode = parentNode;
    }
}

// TODO: can you make an uglier sorting sorted insertion? (refactor this!)
function insertSorted(l, el, cmp=(el1, el2) => (el1 > el2)) {
    var newList = [];
    var idx = 0;
    // copy lower or equal elements
    while(idx < l.length && cmp(l[idx], el) <= 0) {
        newList.push(l[idx]);
        idx++;
    }
    newList.push(el);
    // copy greater elements
    while(idx < l.length) {
        newList.push(l[idx]);
        idx++;
    }
    return newList;
}

/* Checks if source node and target node(s) are in graph. 
    Returns false only if source node is not in graph, otherwise true. 
    Logs a warning if any of the target nodes are not in graph. */
function checkSourceTargetInGraph(graph, source, target) {
    if(!(graph.nodes.has(source))) {
        console.error("***Source node not in graph ***");
        return false;
    }

    for(var n of target.keys())
        // Allow searching for targets that are not in graph, but warn the user
        if(!graph.nodes.has(n))
            console.warn("***Target node '" + n + "' not in graph ***");

    return true;
}

// target... a set of node labels
function depthFirstSearch(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return;

    var nodesTrace = [];
    var pathFound = [];

    function internalDfs(currNode) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        if(target.has(currNode))
            return true;

        var currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(var i = 0; i < currSuccessors.length; i++) {
            var foundGoal = internalDfs(currSuccessors[i]);
            if(foundGoal)
                return true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        return false;
    }

    internalDfs(source);

    return [nodesTrace, pathFound];
}

function breadthFirstSearch(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return;

    var nodesTrace = [];
    var pathFound = [];

    var currNode = new ReconstructionNode(null, null); // placeholder
    var frontier = [new ReconstructionNode(source, null)];
    while(!target.has(currNode.node)) {
        currNode = frontier.shift();
        nodesTrace.push(currNode.node);

        var currSuccessors = Object.keys(graph.outEdges[currNode.node]).sort();
        currSuccessors.forEach(node => frontier.push(new ReconstructionNode(node, currNode)));
    }

    // Reconstruct path by following parent nodes from goal to source
    while(currNode !== null) {
        pathFound.push(currNode.node);
        currNode = currNode.parentNode;
    }

    pathFound = pathFound.reverse();
    return [nodesTrace, pathFound];
}

// TODO: refactor (reuse stuff from depth-first search)
function iterativeDeepening(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return;

    var nodesTrace = [];
    var pathFound = [];

    /* Returns 2 flags: first one indicates whether goal was found, second one indicates 
        whether there are any nodes at depth bigger than current limit */
    function internalIterativeDeepening(currNode, remainingDepth) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        if(remainingDepth == 0) {
            if(target.has(currNode))
                return [true, true];
            else {
                // dead end
                pathFound.pop();
                nodesTrace.push(currNode);
                return [false, true];
            }
        }

        var existNodesDeeper = false;
        var currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(var i = 0; i < currSuccessors.length; i++) {
            var [foundGoal, nodesDeeper] = internalIterativeDeepening(currSuccessors[i], remainingDepth - 1);

            if(foundGoal)
                return [true, nodesDeeper]; 
            if(nodesDeeper)
                existNodesDeeper = true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        return [false, existNodesDeeper];
    }

    var [foundGoal, nodesDeeper] = [false, true];
    var depthLimit = -1;
    while(!foundGoal && nodesDeeper) {
        depthLimit++;
        [foundGoal, nodesDeeper] = internalIterativeDeepening(source, depthLimit);
        if(!foundGoal)
            pathFound = [];
    }

    return [nodesTrace, pathFound];
}

function astar(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return;

    var pathFound = [];
    var nodesTrace = [];

    // TODO: extremely inefficient -> should be a heap
    // stores (<ReconstructionNode>, actual path length to node, f-score) pairs (lists), ordered by increasing f-score
    var frontier = [];
    var currNode = new ReconstructionNode(source, null);
    var distToCurrNode = 0;
    frontier.push([currNode, 0, 0 + nodesHardcoded[source]["h"]]);

    while(frontier.length > 0) {
        [currNode, distToCurrNode, _] = frontier.shift();
        console.log("Current node: " + currNode.node + " " + distToCurrNode);
        nodesTrace.push(currNode.node);
        if(target.has(currNode.node))
            break;

        var currSuccessors = graph.outEdges[currNode.node];
        for(var successorNode of Object.keys(currSuccessors)) {
            var idEdge = currSuccessors[successorNode];
            var [_, _, weight] = graph.edges[idEdge];

            var distToCurrSuccessor = distToCurrNode + weight;
            // TODO: remove this nasty reference to values from a completely different file (add another arg to astar(...) instead)
            var fScore = distToCurrSuccessor + nodesHardcoded[successorNode]["h"];
            // console.log("Assessing successor node " + successorNode + "(dist=" + distToCurrSuccessor + ", f=" + fScore + ")");
            frontier = insertSorted(frontier, [new ReconstructionNode(successorNode, currNode), distToCurrSuccessor, fScore],
                                    (el1, el2) => (el1[2] > el2[2])) // sort by f-scores
        }

        // mark dead end
        if(Object.keys(currSuccessors).length == 0)
            nodesTrace.push(currNode.node);
    }

    // Reconstruct path by following parent nodes from goal to source
    while(currNode !== null) {
        pathFound.push(currNode.node);
        currNode = currNode.parentNode;
    }

    return [nodesTrace, pathFound];
}