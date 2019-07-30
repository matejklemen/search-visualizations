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
        for(var i = 0; i < nodes.length; i++) {
            var nodeLabel = nodes[i];
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

    removeNode(node) {
        this.nodes.delete(node);
        delete this.inEdges[node];
        delete this.outEdges[node];
    }

    removeEdge(edge) {
        var [src, dst, w] = edge;
        delete this.outEdges[src][dst];
        delete this.inEdges[dst][src];
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
        return null;

    var nodesTrace = [];
    var pathFound = [];
    var notes = [];

    function internalDfs(currNode) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        var isGoalNode = target.has(currNode);
        notes.push("'" + currNode + "' is " + (isGoalNode? "": "not") + " a target node -> " + (isGoalNode? "quitting": "not quitting"));
        if(isGoalNode)
            return true;

        var currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(var i = 0; i < currSuccessors.length; i++) {
            nodesTrace.push(currNode);
            notes.push("Successors: " + currSuccessors.slice(i).join(", ") + "-> visiting '" + currSuccessors[i] + "'...");
            var foundGoal = internalDfs(currSuccessors[i]);
            if(foundGoal)
                return true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        notes.push("No remaining successors for node '" + currNode + "' -> backtracking");
        return false;
    }

    nodesTrace.push(source);
    notes.push("Starting at node '" + source + "'");
    internalDfs(source);

    if(pathFound.length > 0) {
        nodesTrace.push(nodesTrace[nodesTrace.length - 1]);
        notes.push("Found path: " + pathFound.join("->"));
    }
    else {
        nodesTrace.push(source);
        notes.push("No path found from '" + source + "' to {" + Array.from(target).join(", ") + "}");
    }

    return [nodesTrace, pathFound, notes];
}

function breadthFirstSearch(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    var nodesTrace = [];
    var pathFound = [];
    var notes = [];

    nodesTrace.push(source);
    notes.push("Starting at node '" + source + "'");

    var currNode = new ReconstructionNode(null, null); // placeholder
    var frontier = [new ReconstructionNode(source, null)];
    while(frontier.length > 0) {
        currNode = frontier.shift();
        var isTarget = target.has(currNode.node);
        
        nodesTrace.push(currNode.node);
        notes.push("'" + currNode.node + "'" + (currNode.parentNode !== null? " (enqueued from '" + currNode.parentNode.node + "')": "") +
            " is" + (isTarget? "": " not") + " a target node -> " + (isTarget? "": " not") + " quitting");
        
        if(isTarget)
            break;

        var currSuccessors = Object.keys(graph.outEdges[currNode.node]).sort();
        nodesTrace.push(currNode.node);
        if(currSuccessors.length > 0)
            notes.push("Putting " + currSuccessors.join(", ") + " at the end of the queue");
        else
            notes.push("No successors at node '" + currNode.node + "'");
        currSuccessors.forEach(node => frontier.push(new ReconstructionNode(node, currNode)));
    }


    // Reconstruct path by following parent nodes from goal to source
    if(target.has(currNode.node)) {
        while(currNode !== null) {
            pathFound.push(currNode.node);
            currNode = currNode.parentNode;
        }
        pathFound = pathFound.reverse();
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push("Found path: " + pathFound.join("->"));
    }
    else {
        nodesTrace.push(currNode.node);
        notes.push("No path found from '" + source + "' to {" + Array.from(target).join(", ") + "}");
    }

    console.log(pathFound);
    return [nodesTrace, pathFound, notes];
}

// TODO: refactor (reuse stuff from depth-first search)
function iterativeDeepening(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    var nodesTrace = [];
    var pathFound = [];
    var notes = [];

    /* Returns 2 flags: first one indicates whether goal was found, second one indicates 
        whether there are any nodes at depth bigger than current limit */
    function internalIterativeDeepening(currNode, remainingDepth) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        if(remainingDepth == 0) {
            var isGoal = target.has(currNode)
            notes.push("Hit depth limit -> checking whether '" + currNode + "' is a target node");
            nodesTrace.push(currNode);
            notes.push("'" + currNode + "' is" + (isGoal? " ": " not ") + "a target node");
            if(isGoal)
                return [true, true];
            else {
                // dead end
                pathFound.pop();
                return [false, true];
            }
        }
        else
            notes.push("Not at depth limit yet (node '" + currNode+ "'), continuing search");

        var existNodesDeeper = false;
        var currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(var i = 0; i < currSuccessors.length; i++) {
            nodesTrace.push(currNode);
            notes.push("Successors: " + currSuccessors.slice(i).join(", ") + "-> visiting '" + currSuccessors[i] + "'...");
            var [foundGoal, nodesDeeper] = internalIterativeDeepening(currSuccessors[i], remainingDepth - 1);

            if(foundGoal)
                return [true, nodesDeeper]; 
            if(nodesDeeper)
                existNodesDeeper = true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        notes.push("There are no remaining successors at depth <= depth limit for node '" + currNode + "' -> backtracking")
        return [false, existNodesDeeper];
    }

    var [foundGoal, nodesDeeper] = [false, true];
    var depthLimit = -1;
    while(!foundGoal && nodesDeeper) {
        depthLimit++;
        nodesTrace.push(source);
        notes.push((depthLimit > 0? "Res": "S") + "tarting at node '" + source + "' with depth limit " + depthLimit);
        [foundGoal, nodesDeeper] = internalIterativeDeepening(source, depthLimit);
        if(!foundGoal)
            pathFound = [];
    }

    if(pathFound.length > 0) {
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push("Found path: " + pathFound.join("->"));
    }
    else {
        nodesTrace.push(source);
        notes.push("No path found from '" + source + "' to {" + Array.from(target).join(", ") + "}");
    }

    return [nodesTrace, pathFound, notes];
}

function astar(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    var pathFound = [];
    var nodesTrace = [];
    var notes = [];

    // TODO: extremely inefficient -> should be a heap
    // stores (<ReconstructionNode>, actual path length to node, f-score) pairs (lists), ordered by increasing f-score
    var frontier = [];
    var currNode = new ReconstructionNode(source, null);
    var distToCurrNode = 0;
    frontier.push([currNode, 0, 0 + nodeData[source]["h"]]);
    nodesTrace.push(currNode.node);
    notes.push("Starting at node '" + currNode.node + "' (f = " + 0 + " + " + nodeData[source]["h"] + " = " + (0 + nodeData[source]["h"]) + ")");

    while(frontier.length > 0) {
        [currNode, distToCurrNode, fCurrNode] = frontier.shift();
        var isTarget = target.has(currNode.node);
        nodesTrace.push(currNode.node);
        notes.push("Taking highest priority node: '" + currNode.node + "' (f = " + fCurrNode + ")" + (currNode.parentNode !== null? " (enqueued from '" + currNode.parentNode.node + "')": "") +
            " -> " + (isTarget? "": " not") + " a target node -> " + (isTarget? "": " not") + " quitting");
        if(isTarget)
            break;

        var currSuccessors = graph.outEdges[currNode.node];
        var msg = [];
        for(var successorNode of Object.keys(currSuccessors)) {
            var idEdge = currSuccessors[successorNode];
            var [_, _, weight] = graph.edges[idEdge];

            var distToCurrSuccessor = distToCurrNode + weight;
            // TODO: remove this nasty reference to values from a completely different file (add another arg to astar(...) instead)
            var fScore = distToCurrSuccessor + nodeData[successorNode]["h"];
            msg.push("'" + successorNode + "' (f = " + distToCurrSuccessor + " + " + nodeData[successorNode]["h"] + " = " + fScore + ")");
            frontier = insertSorted(frontier, [new ReconstructionNode(successorNode, currNode), distToCurrSuccessor, fScore],
                                    (el1, el2) => (el1[2] > el2[2])) // sort by f-scores
        }

        nodesTrace.push(currNode.node);
        // mark dead end
        if(Object.keys(currSuccessors).length == 0)
            notes.push("'" + currNode.node + "' has no successors -> not enqueuing anything");
        else
            notes.push("Inserting " + msg.join(", ") + " into priority queue");
    }

    // Reconstruct path by following parent nodes from goal to source
    if(target.has(currNode.node)) {
        while(currNode !== null) {
            pathFound.push(currNode.node);
            currNode = currNode.parentNode;
        }
        pathFound = pathFound.reverse();
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push("Found path: " + pathFound.join("->"));
    }
    else {
        nodesTrace.push(currNode.node);
        notes.push("No path found from '" + source + "' to {" + Array.from(target).join(", ") + "}");
    }

    return [nodesTrace, pathFound, notes];
}