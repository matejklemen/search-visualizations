class DirectedWeightedGraph {
    /*
        Instructions to use this class:
        (1.) Create a DirectedWeightedGraph
        >> let G = new DirectedWeightedGraph();
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
        for(let i = 0; i < nodes.length; i++) {
            const nodeLabel = nodes[i];
            this.nodes.add(nodeLabel);
            this.inEdges[nodeLabel] = {};
            this.outEdges[nodeLabel] = {};
        }
    }

    addEdgesFrom(edges) {
        // edges... dictionary of {edgeId: [srcNode, dstNode, weight]}
        for(let edgeId in edges) {
            const [srcNode, dstNode, weight] = edges[edgeId];
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
        const [src, dst, w] = edge;
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
    let newList = [];
    let idx = 0;
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
        console.error("*** Source node not in graph ***");
        return false;
    }

    target.forEach(function(n) {
        if(!graph.nodes.has(n))
            console.log(`***Target node '${n}' not in graph ***`);
    });

    return true;
}

// target... a set of node labels
function depthFirstSearch(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    let nodesTrace = [];
    let pathFound = [];
    let notes = [];

    function internalDfs(currNode) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        const isGoalNode = target.has(currNode);
        notes.push(`'${currNode}' is ${isGoalNode? "": "not"} a target node -> ${isGoalNode? "quitting": "not quitting"}`);
        if(isGoalNode)
            return true;

        const currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(let i = 0; i < currSuccessors.length; i++) {
            nodesTrace.push(currNode);
            notes.push(`Remaining successors: ${currSuccessors.slice(i).map(n => `'${n}'`).join(", ")} -> visiting '${currSuccessors[i]}'`);
            const foundGoal = internalDfs(currSuccessors[i]);
            if(foundGoal)
                return true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        notes.push(`No remaining successors for node '${currNode}' -> backtracking`);
        return false;
    }

    nodesTrace.push(source);
    notes.push(`Starting at node '${source}'`);
    internalDfs(source);

    if(pathFound.length > 0) {
        nodesTrace.push(nodesTrace[nodesTrace.length - 1]);
        notes.push(`Found path: ${pathFound.join("🡒")}`);
    }
    else {
        nodesTrace.push(source);
        notes.push(`No path found from '${source}' to {${Array.from(target).map(n => `'${n}'`).join(", ")}}`);
    }

    return [nodesTrace, pathFound, notes];
}

function breadthFirstSearch(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    let nodesTrace = [];
    let pathFound = [];
    let notes = [];

    nodesTrace.push(source);
    notes.push(`Starting at node '${source}'`);

    let currNode = new ReconstructionNode(null, null); // placeholder
    let frontier = [new ReconstructionNode(source, null)];
    while(frontier.length > 0) {
        currNode = frontier.shift();
        const isTarget = target.has(currNode.node);
        
        nodesTrace.push(currNode.node);
        notes.push(`'${currNode.node}'${currNode.parentNode !== null? ` (enqueued from '${currNode.parentNode.node}')`: ``} is \
            ${isTarget? "": "not"} a target node -> ${isTarget? ``: `not`} quitting`);
        
        if(isTarget)
            break;

        const currSuccessors = Object.keys(graph.outEdges[currNode.node]).sort();
        nodesTrace.push(currNode.node);
        if(currSuccessors.length > 0)
            notes.push(`Enqueuing successors ${currSuccessors.map(n => `'${n}'`).join(", ")}`);
        else
            notes.push(`No successors at node '${currNode.node}'`);
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
        notes.push(`Found path: ${pathFound.join("🡒")}`);
    }
    else {
        nodesTrace.push(currNode.node);
        notes.push(`No path found from '${source}' to {${Array.from(target).map(n => `'${n}'`).join(", ")}}`);
    }

    return [nodesTrace, pathFound, notes];
}

function iterativeDeepening(graph, source, target) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    let nodesTrace = [];
    let pathFound = [];
    let notes = [];

    /* Returns 2 flags: first one indicates whether goal was found, second one indicates 
        whether there are any nodes at depth bigger than current limit */
    function internalIterativeDeepening(currNode, remainingDepth) {
        nodesTrace.push(currNode);
        pathFound.push(currNode);
        if(remainingDepth == 0) {
            notes.push(`Hit depth limit -> checking whether '${currNode}' is a target node`);
            nodesTrace.push(currNode);

            const isGoal = target.has(currNode);
            notes.push(`'${currNode}' is ${isGoal? "": "not"} a target node`);
            if(isGoal)
                return [true, true];
            else {
                // dead end
                pathFound.pop();
                return [false, true];
            }
        }
        else
            notes.push(`Not at depth limit yet (node '${currNode}'), continuing search`);

        let existNodesDeeper = false;
        const currSuccessors = Object.keys(graph.outEdges[currNode]).sort();
        for(let i = 0; i < currSuccessors.length; i++) {
            nodesTrace.push(currNode);
            notes.push(`Successors: ${currSuccessors.slice(i).map(n => `'${n}'`).join(", ")} -> visiting '${currSuccessors[i]}'`);
            const [foundGoal, nodesDeeper] = internalIterativeDeepening(currSuccessors[i], remainingDepth - 1);

            if(foundGoal)
                return [true, nodesDeeper]; 
            if(nodesDeeper)
                existNodesDeeper = true;
        }

        pathFound.pop();
        nodesTrace.push(currNode);
        notes.push(`There are no remaining successors at depth <= depth limit for node '${currNode}' -> backtracking`);
        return [false, existNodesDeeper];
    }

    let [foundGoal, nodesDeeper] = [false, true];
    let depthLimit = -1;
    while(!foundGoal && nodesDeeper) {
        depthLimit++;
        nodesTrace.push(source);
        notes.push(`${depthLimit > 0? `Res`: `S`}tarting at node '${source}' with depth limit ${depthLimit}`);
        
        [foundGoal, nodesDeeper] = internalIterativeDeepening(source, depthLimit);
        if(!foundGoal)
            pathFound = [];
    }

    if(pathFound.length > 0) {
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push(`Found path: ${pathFound.join("🡒")}`);
    }
    else {
        nodesTrace.push(source);
        notes.push(`No path found from '${source}' to {${Array.from(target).map(n => `'${n}'`).join(", ")}}`);
    }

    return [nodesTrace, pathFound, notes];
}

function astar(graph, source, target, h) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    let pathFound = [];
    let nodesTrace = [];
    let notes = [];

    // TODO: extremely inefficient -> should be a heap
    // stores (<ReconstructionNode>, actual path length to node, f-score) pairs (lists), ordered by increasing f-score
    let frontier = [];
    let currNode = new ReconstructionNode(source, null);
    let distToCurrNode = 0;
    frontier.push([currNode, 0, 0 + h[source]]);
    nodesTrace.push(currNode.node);
    notes.push(`Initially enqueuing node '${currNode.node}' (f = ${0} + ${h[source]} = ${0 + h[source]})`);

    while(frontier.length > 0) {
        [currNode, distToCurrNode, fCurrNode] = frontier.shift();
        const isTarget = target.has(currNode.node);
        nodesTrace.push(currNode.node);
        notes.push(`Taking highest priority node: '${currNode.node}' (f = ${fCurrNode}) ${(currNode.parentNode !== null? " (enqueued from '" + currNode.parentNode.node + "')": "")} \
            ->${isTarget? "": " not a"} target node -> ${(isTarget? "": "not")} quitting`);
        if(isTarget)
            break;

        const currSuccessors = graph.outEdges[currNode.node];
        let msg = [];
        for(let successorNode of Object.keys(currSuccessors)) {
            const idEdge = currSuccessors[successorNode];
            const [,, weight] = graph.edges[idEdge];

            const distToCurrSuccessor = distToCurrNode + weight;
            const fScore = distToCurrSuccessor + h[successorNode];
            msg.push(`'${successorNode}' (f = ${distToCurrSuccessor} + ${h[successorNode]} = ${fScore})`);
            frontier = insertSorted(frontier, [new ReconstructionNode(successorNode, currNode), distToCurrSuccessor, fScore],
                                    (el1, el2) => (el1[2] > el2[2])) // sort by f-scores
        }

        nodesTrace.push(currNode.node);
        // mark dead end
        if(Object.keys(currSuccessors).length == 0)
            notes.push(`'${currNode.node}' has no successors -> not enqueuing anything`);
        else
            notes.push(`Inserting ${msg.join(", ")} into priority queue`);
    }

    // Reconstruct path by following parent nodes from goal to source
    if(target.has(currNode.node)) {
        while(currNode !== null) {
            pathFound.push(currNode.node);
            currNode = currNode.parentNode;
        }
        pathFound = pathFound.reverse();
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push(`Found path: ${pathFound.join("🡒")}`);
    }
    else {
        nodesTrace.push(currNode.node);
        notes.push(`No path found from '${source}' to {${Array.from(target).map(n => `'${n}'`).join(", ")}}`);
    }

    return [nodesTrace, pathFound, notes];
}

function rbfs(graph, source, target, h) {
    if(!checkSourceTargetInGraph(graph, source, target))
        return null;

    let pathFound = [];
    let nodesTrace = [];
    let notes = [];

    /*
        fScores... static f-values, i.e. f(n) = g(n) + h(n), where g(n) is actual path from start node to `n` and h(n) is the estimated cost of best
            path from `n` to some goal state
        fBounds... backed-up values, i.e. dynamically updated estimate of the lowest cost of path from `n` to some goal state
    */
    let fScores = {};
    let fBounds = {};

    // Initialization: f(source) = F(source)
    fScores[source] = 0 + h[source];
    fBounds[source] = fScores[source];

    let GLOBAL_STEP = 0;

    // should return two things: [0] a flag, determining whether to quit the procedure and [1] the new F-bound (which is only valid if [0] is false)
    function internalRbfs(currNode, currBound) {
        GLOBAL_STEP++;
        if(GLOBAL_STEP > 1000) {
            nodesTrace.push(currNode.node);
            notes.push("[SAFEGUARD] Reached 1000 steps of execution, which is very suspicious and likely means the procedure would never terminate\
                (a possible reason for this is that none of the targets are reachable)");
            return [true, -1, currNode];
        }

        let currNodeLabel = currNode.node;
        nodesTrace.push(currNodeLabel);
        notes.push(`Visiting node '${currNodeLabel}' with bound <= ${currBound}`);

        // current bound surpassed, need to increase it and backtrack
        if(fScores[currNodeLabel] > currBound) {
            nodesTrace.push(currNodeLabel);
            notes.push(`Current node's f-value (${fScores[currNodeLabel]}) is above the bound (${currBound}) -> backtracking`);
            return [false, fScores[currNodeLabel], currNode];
        }

        const isTarget = target.has(currNodeLabel);
        nodesTrace.push(currNodeLabel);
        notes.push(`'${currNodeLabel}' is ${isTarget? "": "not"} a target node`);
        if(isTarget)
            return [true, currBound, currNode];

        let children = Object.keys(graph.outEdges[currNodeLabel]);
        nodesTrace.push(currNode.node);
        
        // current node has no children - signal dead end by returning a very large new boundary
        if(children.length == 0) {
            notes.push(`'${currNode.node}' has no successors -> returning new F-bound of Infinity to signal dead end`);
            return [false, Infinity, currNode];
        }

        let currNodeVisited = fScores[currNodeLabel] < fBounds[currNodeLabel];
        // `msg1` contains note about update rule, `msg2` contains concrete values for updates
        let msg1 = (currNodeVisited?
            `f(${currNodeLabel}) = ${fScores[currNodeLabel]} < F(${currNodeLabel}) = ${fBounds[currNodeLabel]}, so we know that '${currNodeLabel}' was visited before\
             -> inheritance, i.e. F(child) = max(F(parent = '${currNodeLabel}'), f(child))`: 
            `f(${currNodeLabel}) = ${fScores[currNodeLabel]} >= F(${currNodeLabel}) = ${fBounds[currNodeLabel]}, so children's backed-up values are same as their \
            static values, i.e. F(child) = f(child)`);
        let msg2 = [];

        let localPriorityQueue = [];
        for(let i = 0; i < children.length; i++) {
            // weight of edge from current node to current children
            let [,, wEdge] = graph.edges[graph.outEdges[currNodeLabel][children[i]]];
            let fScoreChild = (fScores[currNodeLabel] - h[currNodeLabel]) + wEdge + h[children[i]];
            fScores[children[i]] = fScoreChild;

            // children inherit parent's backed-up value (F)
            if(currNodeVisited) {
                fBounds[children[i]] = Math.max(fBounds[currNodeLabel], fScores[children[i]]);
                msg2.push(`F(${children[i]}) = max(${fBounds[currNodeLabel]}, ${fScores[children[i]]})`);
            }
            else {
                fBounds[children[i]] = fScores[children[i]];
                msg2.push(`F(${children[i]}) = ${fScores[children[i]]}`);
            }
            localPriorityQueue.push([children[i], fBounds[children[i]]]);
        }

        notes.push(`${msg1}: ${msg2.join(", ")}`);

        // NOTE: "Priority queue" holds lists of length 2: [0] is the node label, [1] is the node's backed-up value (F)
        // Sort ascending by backed-up values (F)
        localPriorityQueue.sort((item1, item2) => item1[1] > item2[1]);

        while(localPriorityQueue[0][1] <= currBound) {
            // if current best node has no sibling, it will take parent's (current node's) bound
            let fBoundSibling = (localPriorityQueue.length == 1)? Infinity: localPriorityQueue[1][1];

            nodesTrace.push(currNodeLabel);
            notes.push(`Current local priority queue content: ${localPriorityQueue.map(nodeAndPriority => 
                `('${nodeAndPriority[0]}', f(${nodeAndPriority[0]}) = ${nodeAndPriority[1]})`).join(", ")}`);

            let [foundGoal, newBound, goalNode] = internalRbfs(new ReconstructionNode(localPriorityQueue[0][0], currNode), Math.min(currBound, fBoundSibling));
            if(foundGoal)
                return [true, currBound, goalNode];

            nodesTrace.push(localPriorityQueue[0][0]);
            notes.push(`Correcting backed-up value: F(${localPriorityQueue[0][0]}) = ${newBound}`);

            // set new bound and sort "priority queue"
            localPriorityQueue[0][1] = newBound;
            fBounds[localPriorityQueue[0][0]] = newBound;
            localPriorityQueue.sort((item1, item2) => item1[1] > item2[1]);
        }

        let [bestNode, bestBackedUpValue] = localPriorityQueue[0];
        nodesTrace.push(currNodeLabel);
        notes.push(`Current best option (F(${bestNode}) = ${bestBackedUpValue}) is above the bound (${currBound}) -> returning new F-bound of ${bestBackedUpValue}`);

        return [false, bestBackedUpValue, currNode];
    }

    let [foundGoal, , goalNode] = internalRbfs(new ReconstructionNode(source, null), Infinity);

    if(target.has(goalNode.node)) {
        let n = goalNode;
        while(n !== null) {
            pathFound.push(n.node);
            n = n.parentNode;
        }
        pathFound = pathFound.reverse();
        nodesTrace.push(pathFound[pathFound.length - 1]);
        notes.push(`Found path: ${pathFound.join("🡒")}`);
    }
    else {
        nodesTrace.push(source);
        notes.push(`No path found from '${source}' to {${Array.from(target).map(n => `'${n}'`).join(", ")}}`);
    }

    return [nodesTrace, pathFound, notes];
}
