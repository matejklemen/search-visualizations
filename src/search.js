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

// dst... a set of node labels
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

    class ReconstructionNode {
        constructor(node, parentNode) {
            this.node = node;
            this.parentNode = parentNode;
        }
    }

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