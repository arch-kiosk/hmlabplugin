import {unsafeCSS, LitElement, PropertyValues} from "lit";
import {html} from 'lit/static-html.js'
import {customElement, property, state} from "lit/decorators.js";
import {fabric} from "fabric"
import { instance } from "@viz-js/viz";

// @ts-ignore
import local_css from "./styles/hm-component.sass?inline";
import {hmNode, removeTransitiveRelationsFromNodes} from "./lib/hm";

type Point = {
    x: number,
    y: number
}

@customElement("hm-component")
export class HMComponent extends LitElement {
    static styles = unsafeCSS(local_css);
    _messages: { [key: string]: object } = {};

    @state()
    dotNotation: string | null = null

    @property()
    hmNodes: Array<hmNode> | null = null
    private maxX?: number;
    private maxY?: number;

    @property()
    scale: number = 1

    constructor() {
        super();
        this._messages = {}
    }

    protected willUpdate(_changedProperties: PropertyValues) {
        // super.willUpdate(_changedProperties);
        // if (_changedProperties.has("uiSchema")) {
        //     this.processSchemaDefinition()
        // }
    }

    firstUpdated(_changedProperties: any) {
        super.firstUpdated(_changedProperties);
    }

    _printHMNodes() {
        if (this.hmNodes) {
            for (const node of this.hmNodes) {
                for (const earlierId of node.earlierNodes) {
                    const earlierNode = this.hmNodes.find(x => x.id === earlierId)
                    if (earlierNode)
                        console.log(`"${node.name}"->"${earlierNode.name}"`)
                    else
                        console.log(`${node.name}: can't find earlier node ${earlierId}`)
                }
                for (const nodeId of node.contemporaries) {
                    const contemporaryNode = this.hmNodes.find(x => x.id === nodeId)
                    if (contemporaryNode)
                        console.log(`"${node.name}"<->"${contemporaryNode.name}"`)
                    else
                        console.log(`${node.name}: can't find contemporary node ${nodeId}`)
                }
            }
        }
    }

    _HMNodes2Dot() {
        const subGraphs: Array<string> = [];
        const dotNodes: Map<string, string> = new Map()

        const dotHeader = `
        digraph {
            splines=line\n
            concentrate=false\n
            layout=dot\n
            // TBbalance="min"\n
            node [shape="rect"]
            edge [headport=n tailport=s]
            // nodesep=".5"\n
        `
        let dotLines = ""

        if (this.hmNodes) {
            removeTransitiveRelationsFromNodes(this.hmNodes)
            this._printHMNodes()
            for (const node of this.hmNodes) {
                if (node.name)
                    dotNodes.set(node.id, node.name)

                for (const earlierNode of node.earlierNodes) {
                    dotLines += `\n"${node.id}"->"${earlierNode}"`
                }
                if (node.contemporaries.length > 0) {
                    const subGraph = [node.id, ...node.contemporaries].sort()
                    const sameRank = subGraph.reduce((accumulator, v) => accumulator!==""?accumulator + `;"${v}"`:`"${v}"`,"")
                    if (subGraphs.findIndex(x => x === sameRank) == -1) {
                        subGraphs.push(sameRank)

                    }
                }
            }
            for (const sg of subGraphs) {
                const sameRankNodes = sg.split(";")
                let lastNode: string = ""
                for (const n of sameRankNodes) {
                    if (lastNode) {
                        dotLines += `\n${lastNode}->${n} [weight=2;minlen=2;tailport=_, headport=_;dir=both;color=lightgrey]`
                    }
                    lastNode = n
                }
                dotLines += `\nsubgraph {
                    rank = same;${sg}
                }`
            }
            const dotFooter = `\n}`

            let dotNodeLines = ""
            for (const dn of dotNodes)

                dotNodeLines += `"${dn[0]}" [label="${dn[1]}"]\n`

            this.dotNotation = dotHeader + dotNodeLines + dotLines + dotFooter
            console.log(this.dotNotation)
        }
    }

    _renderJSON(json: any) {
        this.maxX = 0
        this.maxY = 0

        if (!this.hmNodes)
            return
        const bb: string = json.bb
        const bgDim = bb.split(",").map(x => parseFloat(x) * 1.333)
        const svgWidth = bgDim[2]
        const svgHeight = bgDim[3]

        for (const node of json.objects) {
            const hmNode= this.hmNodes.find(x => x.id === node.name)
            if (hmNode) {
                const pos : Array<string> = node.pos.split(",")
                if (pos.length != 2) {
                    console.warn(`${node.name} with wrong pos attribute`)
                } else {
                    hmNode.pos = {
                        x: parseFloat(pos[0]) * 1.333,
                        y: svgHeight - parseFloat(pos[1]) * 1.333
                    }
                    if (hmNode.pos.x > this.maxX) this.maxX = hmNode.pos.x
                    if (hmNode.pos.y > this.maxY) this.maxY = hmNode.pos.y
                }
            }
        }
    }

    updated(_changedProperties: any) {
        console.log("hm-component update", _changedProperties);
        super.updated(_changedProperties);
        if (_changedProperties.has("hmNodes")) {
            this._HMNodes2Dot()
        }
        if (_changedProperties.has("dotNotation") && (this.dotNotation)) {
            instance().then(viz => {
                const svg = viz.renderSVGElement(this.dotNotation)
                const json = viz.renderJSON(this.dotNotation)
                console.log(json)
                this._paintSVG(svg.outerHTML)
                // this._renderJSON(json)
                // this._paintJSON()
            });
        }
    }

    getPointX(x: number) {
        return x * this.scale
    }

    getPointY(y: number) {
        return y * this.scale
    }

    _paintSVG(graphSVG) {
        const svg: HTMLDivElement = <HTMLOrSVGElement>this.shadowRoot?.getElementById('svg')
        svg.innerHTML = graphSVG
    }
    _paintJSON() {
        const el: HTMLCanvasElement = <HTMLCanvasElement>this.shadowRoot?.getElementById('c')
        const nodeWidth = 100
        const nodeHeight = 40
        let canvas = new fabric.Canvas(el, {
            backgroundColor: 'rgba(240,240,240,.5)',
            width: (this.maxX + nodeWidth/2) * this.scale + 4,
            height: (this.maxY + nodeHeight/2) * this.scale + 4,
            selection: false
        })

        this.hmNodes?.forEach(node => {
            const origin = [this.getPointX(node.pos!.x), this.getPointY(node.pos!.y)]
            let halfHeight = nodeHeight * this.scale / 2

            canvas.add(new fabric.Rect({
                left: origin[0] - nodeWidth * this.scale / 2,
                top: origin[1] - halfHeight,
                fill: '',
                stroke: 'blue',
                strokeWidth: 2,
                width: nodeWidth * this.scale,
                height: nodeHeight * this.scale,
                selectable: false,
                hoverCursor: 'default'
                // backgroundColor: 'white'
            }))
            canvas.add(new fabric.Textbox(node.name,{
                left: origin[0] - nodeWidth * this.scale / 2,
                top: origin[1] - halfHeight / 2,
                // fill: '',
                stroke: 'black',
                fontSize: "16",
                // strokeWidth: 2,
                textAlign: "center",

                width: nodeWidth * this.scale,
                height: nodeHeight * this.scale,
                selectable: false,
                hoverCursor: 'default'
                // backgroundColor: 'white'
            }))

            let earlierNodes = node.earlierNodes.map(nodeId => this.hmNodes?.find(n => n.id === nodeId))
            earlierNodes = earlierNodes.filter(x => x!!)

            let minX = origin[0]
            let maxX = origin[0]

            earlierNodes.forEach((earlierNode) => {
                const target = [this.getPointX(earlierNode.pos!.x), this.getPointY(earlierNode.pos!.y) - halfHeight]
                if (target[0] < minX || minX == -1) minX = target[0]
                if (target[0] > maxX) maxX = target[0]

                if (earlierNodes.length >= 1) {
                    canvas.add(new fabric.Line([target[0], origin[1] + 2 * halfHeight, target[0], target[1]], {
                        stroke: 'blue',
                        strokeWidth: 2,
                        width: 60 * this.scale,
                        height: 40 * this.scale,
                        selectable: false,
                        hoverCursor: 'default'
                    }))
                    canvas.add(new fabric.Triangle({
                        left: target[0]+6,
                        top: target[1],
                        width: 10,
                        height: 10,
                        angle: 180,
                        stroke: 'blue',
                        strokeWidth: 2,
                        selectable: false,
                        hoverCursor: 'default'
                    }))
                } else {
                    canvas.add(new fabric.Line([origin[0], origin[1] + halfHeight, target[0], target[1]], {
                        stroke: 'blue',
                        strokeWidth: 2,
                        width: 60 * this.scale,
                        height: 40 * this.scale,
                        selectable: false,
                        hoverCursor: 'default'
                    }))
                }
            })
            if (earlierNodes.length >= 1) {
                canvas.add(new fabric.Line([minX, origin[1] + 2 * halfHeight, maxX, origin[1] + 2*halfHeight], {
                    stroke: 'blue',
                    strokeWidth: 2,
                    width: 60* this.scale,
                    height: 40* this.scale,
                    selectable: false,
                    hoverCursor: 'default'
                }))
                canvas.add(new fabric.Line([origin[0], origin[1] + halfHeight, origin[0], origin[1] + 2 * halfHeight], {
                    stroke: 'blue',
                    strokeWidth: 2,
                    width: 60* this.scale,
                    height: 40* this.scale,
                    selectable: false,
                    hoverCursor: 'default'
                }))
            }
        })
    }

    _canvasPaint() {
        console.log("canvas painting")
        // super.updated(_changedProperties);
        let xOrigin: number, yOrigin: number
        const el: HTMLCanvasElement = <HTMLCanvasElement>this.shadowRoot?.getElementById('c')
        if (el) {
            let canvas= new fabric.Canvas(el, {
                backgroundColor: 'rgb(240,240,240)',
                height: 500,
                width: 500,
            })

            this.dagreGraph.nodes().forEach((nodeId) => {
                const node = this.dagreGraph!.node(nodeId)

                if (node) {
                    canvas.add(new fabric.Rect({
                        left: this.getPointX(node.x),
                        top: this.getPointY(node.y),
                        fill: 'blue',
                        width: 20,
                        height: 20,
                        backgroundColor: 'white'
                    }))
                    canvas.add(new fabric.Textbox(nodeId, {
                        left: this.getPointX(node.x),
                        top: this.getPointY(node.y),
                        fill: 'blue',
                        width: 20,
                        height: 20,
                        fontSize: 12,
                        textAlign: 'center',
                        backgroundColor: 'white'
                    }))
                }
            })
        }
    }

    render() {
        return html`
            <div class="adjacent">
                <div class="svg-div">
                    <div id="svg">
                                            
                    </div>
                </div>
                <canvas id="c">
                </canvas>
            </div>
        `
    }
}
