/* hm.ts
 */

import {graphlib} from "dagre";
import Graph = graphlib.Graph;

type Point = {
    x: number
    y: number
}

export class hmNode {
    get id(): string {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    private _id: string
    public contemporaries: Array <string>
    public earlierNodes: Array<string> // somewhat misleading term: earlier Nodes in a Harris Matrix appear deeper down in the DAG than the later notes!
    public pos: Point | undefined
    public name: string | undefined
    public data: object | undefined

    constructor(id: string, contemporaries: Array<string>=[], earlierNodes: Array<string>=[]) {
        this._id = id
        this.contemporaries = contemporaries
        this.earlierNodes = earlierNodes
    }
}

export function printNodes(g: Graph, nodes: string[]) {
    const pNodes: Array<string> = []
    for (const n of nodes) {
        pNodes.push("   " + g.node(n))
    }
    console.log(pNodes)
}

export function hmNodes2Graph(nodes: Array<hmNode>): Graph {
    let g = new Graph()
    for (const hmNode of nodes) {
        g.setNode(hmNode.id, hmNode.name?hmNode.name:"")
    }
    for (const hmNode of nodes) {
        for (const rel of hmNode.earlierNodes) {
            g.setEdge(hmNode.id, rel)
        }
    }
    return g
}

export function graphToDot(g: Graph) {
    let dotStr: String = ""
    for (const edge of (g.edges() ||[])) {
        dotStr += `"${edge.v}"->"${edge.w}"\n`
    }
    return dotStr
}

export function removeTransitiveRelationsFromNodes(nodes: Array <hmNode>) {
    let g = hmNodes2Graph(nodes)


    // const components = graphlib.alg.components(g)
    // // for (const c of components) printNodes(g,c)
    //
    // for (const component of components) {
    //     const componentGraph = new Graph()
    //     for (const componentNode of component ) {
    //         componentGraph.setNode(componentNode, g.node(componentNode))
    //     }
    //     for (const componentNode of component ) {
    //         const edges = g.outEdges(componentNode)
    //         if (edges){
    //             for (const edge of edges)
    //                 componentGraph.setEdge(edge.v, edge.w)
    //         }
    //     }
    //     transitiveReduction(componentGraph)
    //     _removeTransitiveRelations(componentGraph, nodes)
    // }
    transitiveReduction(g)
    _removeTransitiveRelations(g, nodes)
    return true
}

export function transitiveReduction(transGraph: Graph, topNode: string="") {
    let topNodes: Array<string> = []
    if (topNode) {
        topNodes = [topNode]
    }  else {
        if (!graphlib.alg.isAcyclic(transGraph)) {
            throw "Graph has cycles. It cannot be used."
        }
        for (const n of transGraph.nodes()) {
            if ((transGraph.inEdges(n) || 0) == 0) {
                topNodes.push(n)
            }
        }
    }

    for (const node of topNodes) {
        const outEdges = transGraph.outEdges(node) || []
        for (const outEdge of outEdges) {
            if (outEdge.w) {
                const children = graphlib.alg.preorder(transGraph, outEdge.w)
                for (const child of children) {
                    if (child != outEdge.w && transGraph.hasEdge(node, child)) transGraph.removeEdge(node, child)
                }
                transitiveReduction(transGraph, outEdge.w)
            }
        }
    }
}

function _removeTransitiveRelations(g: Graph, nodes: Array<hmNode>) {
    for (const hmNode of nodes) {
        const earlierNodes = []
        for (const rel of hmNode.earlierNodes) {
            if (g.hasEdge({v: hmNode.id, w: rel}) || g.hasEdge({v:rel, w: hmNode.id})) {
                earlierNodes.push(rel)
            }
        }
        hmNode.earlierNodes = earlierNodes
    }

    // for (const minNode of g.nodes()) {
    //     const hmNode = nodes.find(x => x.id === minNode)
    //     if (hmNode) {
    //         const earlierNodes = []
    //         for (const outEdge of (g.outEdges(minNode) || [])) {
    //             earlierNodes.push(outEdge.w)
    //         }
    //         hmNode.earlierNodes = earlierNodes
    //     } else {
    //         throw "Unknown node " + minNode
    //     }
    // }
}