/* hm.ts
 */

import { Edge, graphlib } from "dagre";
import Graph = graphlib.Graph;
import { nanoid } from "nanoid";
import { dumbHashCode } from "./applib";

export type Point = {
    x: number
    y: number
}

export type HMEdge = {
    id: number,
    sourceId: any,
    targetId: any,
    fromX: number,
    toX: number,
    fromY: number,
    toY: number,
    southX: number,
    lane: number
    outOrder: number,
    inOrder: number,
    dummyEdge: boolean,
    extendsEdge: HMEdge,
    originalEdge: HMEdge,
    nextEdge: HMEdge,
    debug: string,
    sourceNode: hmNode,
    targetNode: hmNode,
    colorIndex : number
}

export class hmNode {
    get id(): string {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    private _id: string;
    public shortId: string; //for debugging purposes only
    public contemporaries: Array<string>;
    public earlierNodes: Array<string>; // somewhat misleading term: earlier Nodes in a Harris Matrix appear deeper down in the DAG than the later notes!
    public pos: Point | undefined;
    public name: string | undefined;
    public data: object | undefined;
    public dummyNode: boolean = false
    public inEdges: Array<HMEdge> = [];
    public hasStraightIn: boolean = false;
    public hasStraightOut: boolean = false;
    public outEdges: Array<HMEdge> = [];
    public hasImmediateLeftRelation = false;
    public leftContemporary: hmNode
    public rightContemporary: hmNode

    constructor(id: string, contemporaries: Array<string> = [], earlierNodes: Array<string> = []) {
        this._id = id;
        this.shortId = dumbHashCode(id)
        this.contemporaries = contemporaries;
        this.earlierNodes = earlierNodes;
    }
}

export function printNodes(g: Graph, nodes: string[]) {
    const pNodes: Array<string> = [];
    for (const n of nodes) {
        pNodes.push("   " + g.node(n));
    }
    console.log(pNodes);
}

export function hmNodes2Graph(nodes: Array<hmNode>): Graph {
    let g = new Graph();
    for (const hmNode of nodes) {
        g.setNode(hmNode.id, hmNode.name ? hmNode.name : "");
    }
    for (const hmNode of nodes) {
        for (const rel of hmNode.earlierNodes) {
            g.setEdge(hmNode.id, rel);
        }
    }
    return g;
}

export function graphToDot(g: Graph) {
    let dotStr: String = "";
    for (const edge of (g.edges() || [])) {
        dotStr += `"${edge.v}"->"${edge.w}"\n`;
    }
    return dotStr;
}

export function removeTransitiveRelationsFromNodes(nodes: Array<hmNode>): Array<Edge> {
    let g = hmNodes2Graph(nodes);


    let removedEdges = transitiveReduction(g);
    _removeTransitiveRelations(g, nodes);
    return removedEdges;
}

export function getTopNodes(graph: Graph) {
    const topNodes: Array<string> = [];
    if (!graphlib.alg.isAcyclic(graph)) {
        throw "Graph has cycles. It cannot be used.";
    }
    for (const n of graph.nodes()) {
        if ((graph.inEdges(n) || 0) == 0) {
            topNodes.push(n);
        }
    }
    return topNodes;
}

export function transitiveReduction(transGraph: Graph, topNode: string = "", removed: Array<Edge> = []): Array<Edge> {
    let topNodes: Array<string> = [];
    if (topNode) {
        topNodes = [topNode];
    } else {
        topNodes = getTopNodes(transGraph);
    }

    for (const node of topNodes) {
        const outEdges = transGraph.outEdges(node) || [];
        for (const outEdge of outEdges) {
            if (outEdge.w) {
                const children = graphlib.alg.preorder(transGraph, outEdge.w);
                for (const child of children) {
                    if (child != outEdge.w && transGraph.hasEdge(node, child)) {
                        transGraph.removeEdge(node, child);
                        removed.push({ v: node, w: child });
                    }
                }
                removed = transitiveReduction(transGraph, outEdge.w, removed);
            }
        }
    }

    return removed;
}

function _removeTransitiveRelations(g: Graph, nodes: Array<hmNode>) {
    for (const hmNode of nodes) {
        const earlierNodes = [];
        for (const rel of hmNode.earlierNodes) {
            if (g.hasEdge({ v: hmNode.id, w: rel }) || g.hasEdge({ v: rel, w: hmNode.id })) {
                earlierNodes.push(rel);
            }
        }
        hmNode.earlierNodes = earlierNodes;
    }
}

type P = {
    x: number,
    y: number
}
type Line = { start: P, end: P }

export function areDiagonalHMLinesCrossed(l1: Array<number>, l2: Array<number>): boolean {
    let line1: Line = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    let line2: Line = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };

    // make sure that l1 and l2 run from top to bottom (ys < ye)
    [line1.start.x, line1.start.y, line1.end.x, line1.end.y] = l1[3] > l1[1] ? l1 : [l1[2], l1[3], l1[0], l1[1]];
    [line2.start.x, line2.start.y, line2.end.x, line2.end.y] = l2[3] > l2[1] ? l2 : [l2[2], l2[3], l2[0], l2[1]];

    return (
        ((line1.start.x > line2.start.x) && (line1.end.x < line2.end.x)) ||
        ((line2.start.x > line1.start.x) && (line2.end.x < line1.end.x))
    );
}

export function areOrthogonalHMLinesCrossed(x1_start: number, x1_end: number, y1: number,
                                            x2_start: number, x2_end: number, y2: number): boolean {
    let line1: Line = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    let line2: Line = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };

    // Make sure that line1 is the upper line and line2 the lower
    [line1.start.x, line1.start.y, line1.end.x, line1.end.y] = y1 < y2 ? [x1_start, y1, x1_end, y1] : [x2_start, y2, x2_end, y2];
    [line2.start.x, line2.start.y, line2.end.x, line2.end.y] = y1 < y2 ? [x2_start, y2, x2_end, y2] : [x1_start, y1, x1_end, y1];

    //lower line start point between start and end of upper line: crosses upper line?
    if (((line2.start.x > line1.start.x) && (line2.start.x <= line1.end.x)) ||
        ((line2.start.x < line1.start.x) && (line2.start.x >= line1.end.x))) {
        return !(line1.start.x == line1.end.x);

    }

    //upper line's end point between start and end of lower line: crosses lower line?
    if (((line1.end.x >= line2.start.x) && (line1.end.x < line2.end.x)) ||
        ((line1.end.x <= line2.start.x) && (line1.end.x > line2.end.x))) {
        return true;
    }
    let k = Math.abs(line1.end.x - line1.start.x) + Math.abs(line2.end.x - line2.start.x)
    let n = Math.abs((line2.end.x + line2.start.x) - (line1.end.x + line1.start.x))

    return ((line1.start.y === line2.start.y) &&
        (
            //difference of length smaller than length of combined vector?
            n < k
        )
    );
}

export function findBestHorizontalOrderForEdges(inEdges: Array<HMEdge>): Array<{
    id: any,
    order: number
}> {
    type SHMEdge = { id: any, fromX: number, toX: number, order: number }
    const edges: Array<SHMEdge> = [];
    const tisNoUse: Array<Array<any>> = [];
    let minOutOrder = 0, maxOutOrder= 1
    for (const inEdge of inEdges) {
        if (inEdge.outOrder < minOutOrder) minOutOrder = inEdge.outOrder
        if (inEdge.outOrder > maxOutOrder) maxOutOrder = inEdge.outOrder
    }
    let outOrderRange = maxOutOrder - minOutOrder

    for (const inEdge of inEdges) {
        // edges.push(inEdge.extendsEdge?<SHMEdge>{ id: inEdge.id, fromX: inEdge.originalEdge.fromX, toX: inEdge.originalEdge.toX, order: 1, debug: inEdge.debug }:<SHMEdge>{ id: inEdge.id, fromX: inEdge.fromX, toX: inEdge.toX, order: 1, debug: inEdge.debug });
        edges.push(<SHMEdge>{ id: inEdge.id, fromX: inEdge.fromX * outOrderRange + inEdge.outOrder, toX: inEdge.toX * outOrderRange + inEdge.outOrder, order: 1, debug: inEdge.debug });
    }
    const MAX_ITERATIONS = 5;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
        let crossing = false;
        for (let i = 0; i < edges.length - 1; i++) {
            let startOver = false;
            for (let n = i + 1; n < edges.length; n++) {
                if (!tisNoUse.find((t) => t[0] === edges[i].id && t[1] === edges[n].id)) {
                    let edges_i = edges[i]
                    let edges_n = edges[n]
                    if (areOrthogonalHMLinesCrossed(edges_i.fromX, edges_i.toX, edges_i.order, edges_n.fromX, edges_n.toX, edges_n.order)) {
                        if (edges_i.fromX != edges_i.toX && edges_n.fromX != edges_n.toX) {
                            crossing = true;
                            console.log(`Edges cross: ${edges_i.fromX} -> ${edges_i.toX} and ${edges_n.fromX} -> ${edges_n.toX}`);
                            let new_i_order = Math.max(edges_i.order + 1, edges_n.order + 1)
                            let change_i = !(areOrthogonalHMLinesCrossed(edges_i.fromX, edges_i.toX, new_i_order,
                                edges_n.fromX, edges_n.toX, edges_n.order))
                            let new_n_order = Math.max(edges_n.order + 1, edges_i.order + 1)
                            let change_n = !(areOrthogonalHMLinesCrossed(edges_i.fromX, edges_i.toX, edges_i.order,
                                edges_n.fromX, edges_n.toX, new_n_order))

                            if ((change_i && change_n) || (!change_i && !change_n && edges_i.order === edges_n.order)) {
                                let sign_i: number = Math.sign(edges_i.toX-edges_i.fromX) 
                                let sign_n: number = Math.sign(edges_n.toX-edges_n.fromX)
                                if (sign_i === sign_n) {
                                    let length_i: number = Math.abs(edges_i.toX - edges_i.fromX) 
                                    let length_n: number = Math.abs(edges_n.toX - edges_n.fromX)
                                    change_i = length_i > length_n
                                    // if (length_i == length_n) {
                                    // } else {
                                    //     edges_i.originalEdge?e.originalEdge.fromX - e.originalEdge.toX:e.fromX - e.toX
                                    // }
                                } else {
                                    change_i = edges_i.fromX < edges_n.fromX;
                                }
                                change_n = !change_i
                            }
                            if (change_i) {
                                edges_i.order =new_i_order;
                                break;
                            } else if (change_n) {
                                edges_n.order = new_n_order;
                            } else {
                                // switching those two edges does not help, so let's memorize that fact
                                // crossing = true
                                tisNoUse.push([edges_i.id, edges_n.id]);
                            }
                        }
                    }
                }
            }
            if (startOver) break;
        }
        if (!crossing) {
            iteration = MAX_ITERATIONS;
            break;
        }
        iteration++;
    }

    edges.sort((a, b) => a.order - b.order);
    return edges.map((e) => {
        return { id: e.id, order: e.order };
    });
}

/**
 * positionHMEnds gets a sorted array of numbers. They must be sorted from negative to positive numbers.
 * It returns an array with a position for each element in the incoming array.
 * The positions are centered around a "middle" element in the incoming array. Elements left of the incoming element
 * have decreasing negative positions and everything right has increasing positive positions. If there are zeroes
 * in the incoming array the middle element will be in the middle of those zeroes. If there are none it will be between
 * the negative and the positive elements. If there are no negative or positive elements in the incoming arrays
 * there will be no negative or positive positions.
 * @param sortedElements sorted array of increasing integers
 *
 * @returns array with a position for each of the corresponding incoming integers
 */

export function positionHMEnds(sortedElements: Array<number>): Array<number> {
    let midElement = 0;
    let startNegative = -1;
    let startEqual = -1;
    let startPositive = sortedElements.length;
    let positions: Array<number> = [];

    sortedElements.forEach((e, index) => {
        if (e < 0 && startNegative == -1)
            startNegative = index;
        else if (e == 0 && startEqual == -1)
            startEqual = index;
        else if (e > 0 && startPositive == sortedElements.length)
            startPositive = index;
        positions.push(0);
    });

    if (startEqual > -1) {
        let midElementRange = startPositive - startEqual;
        if (midElementRange % 2 == 0) {
            midElement = startEqual + midElementRange / 2;
            if (sortedElements.length - (midElement + 1) < midElement) {
                midElement--;
            }
        } else {
            midElement = startEqual + Math.trunc(midElementRange / 2);
        }
    } else {
        midElement = startPositive;
        if (startPositive < sortedElements.length)
            positions[midElement] = 1;
    }
    for (let x = midElement - 1; x >= startNegative && x > -1; x--) {
        positions[x] = x - midElement;
    }
    let midElementPosition = positions[midElement];
    for (let x = midElement + 1; x < sortedElements.length; x++) {
        positions[x] = ++midElementPosition;
    }

    return positions;
}

export function mergeNewPositions(fixedPositions: Array<number>, newPositions: Array<number>) {
    let currentNewPosition = 0
    if (fixedPositions.length > 0) {
        let firstPositive = newPositions.length
        for (let i=0; i<=newPositions.length;i++) {
            if (newPositions[i] > -1) {
                firstPositive = i;
                break;
            }
        }
        if (firstPositive > 0) {
            currentNewPosition = firstPositive-1
            while (currentNewPosition >= 0) {
                let newPosition = newPositions[currentNewPosition]
                if (fixedPositions.findIndex(p => p == newPosition) > -1) {
                    newPositions[currentNewPosition] = newPosition - 1
                } else {
                    let found = false
                    for (let leftOfCurrentNewPosition=firstPositive-1;leftOfCurrentNewPosition >=0;leftOfCurrentNewPosition-- )
                        if (newPositions[leftOfCurrentNewPosition] == newPositions[currentNewPosition] && leftOfCurrentNewPosition!=currentNewPosition) {
                            found = true
                            break;
                        }
                    if (found) {
                        newPositions[currentNewPosition] = newPosition - 1
                    } else {
                        currentNewPosition--;
                    }
                }
            }
        }

        currentNewPosition = firstPositive
        while (currentNewPosition < newPositions.length) {
            let newPosition = newPositions[currentNewPosition]
            if (fixedPositions.findIndex(p => p == newPosition) > -1) {
                newPositions[currentNewPosition] = newPosition + 1
            } else {
                let found = false
                for (let rightOfCurrentNewPosition=firstPositive;rightOfCurrentNewPosition < newPositions.length;rightOfCurrentNewPosition++ )
                    if (newPositions[rightOfCurrentNewPosition] == newPositions[currentNewPosition] && rightOfCurrentNewPosition != currentNewPosition) {
                        found = true
                        break;
                    }
                if (found) {
                    newPositions[currentNewPosition] = newPosition + 1
                } else {
                    currentNewPosition++;
                }
            }
        }

    }
    return newPositions
}