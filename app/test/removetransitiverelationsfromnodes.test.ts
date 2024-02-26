import {graphToDot, hmNode, hmNodes2Graph, removeTransitiveRelationsFromNodes, transitiveReduction} from "../src/lib/hm"
// import {getFACase} from "./data/testdata"
import {graphlib} from "dagre"
import Graph = graphlib.Graph
import { expect, test } from "vitest";

// test("test if FA Case can be processed", () => {
//     const hmNodes = [...getFACase()]
//     console.log(graphToDot(hmNodes2Graph(hmNodes)))
//     expect(removeTransitiveRelationsFromNodes(hmNodes)).toBe(true)
//     console.log(graphToDot(hmNodes2Graph(hmNodes)))
// });

test("test if cyclic graphs are refused", () => {
    let hmNodes: Array<hmNode> = []
    hmNodes.push(new hmNode("1", [], ["2", "3", "4"]))
    hmNodes.push(new hmNode("2", [], ["3"]))
    hmNodes.push(new hmNode("3", [], ["4"]))
    hmNodes.push(new hmNode("4", [], ["1"]))
    expect(() => removeTransitiveRelationsFromNodes(hmNodes)).toThrow()

    hmNodes = []
    hmNodes.push(new hmNode("1", [], ["2", "3", "4"]))
    hmNodes.push(new hmNode("2", [], ["3"]))
    hmNodes.push(new hmNode("3", [], ["4"]))
    hmNodes.push(new hmNode("4", [], []))
    expect(() => removeTransitiveRelationsFromNodes(hmNodes)).not.toThrow()
});


test("test reduction", () => {
    let hmNodes: Array<hmNode> = []
    hmNodes.push(new hmNode("1", [], ["2", "3", "4"]))
    hmNodes.push(new hmNode("2", [], ["3"]))
    hmNodes.push(new hmNode("3", [], ["4"]))
    hmNodes.push(new hmNode("4", [], []))
    expect(removeTransitiveRelationsFromNodes(hmNodes)).toBe(true)
    console.log(graphToDot(hmNodes2Graph(hmNodes)))
});

test("transitiveReduction with transitive relation from top node", () => {
    let g: Graph
    g = new Graph();
    ["T", "1", "2", "3"].map(x => g.setNode(x, x));
    [   ["T", "1"],
        ["T", "3"],
        ["1", "2"],
        ["2", "3"]
    ].map(x => g.setEdge(x[0], x[1]))
    console.log(graphToDot(g))
    transitiveReduction(g)
    expect(graphToDot(g)).toBe('"T"->"1"\n"1"->"2"\n"2"->"3"\n')
});

test("transitiveReduction with transitive relation from second layer", () => {
    let g: Graph
    g = new Graph();
    ["T", "1", "2", "3"].map(x => g.setNode(x, x));
    [   ["T", "1"],
        ["T", "3"],
        ["1", "2"],
        ["1", "3"],
        ["2", "3"]
    ].map(x => g.setEdge(x[0], x[1]))
    console.log(graphToDot(g))
    transitiveReduction(g)
    console.log(graphToDot(g))
    expect(graphToDot(g)).toBe('"T"->"1"\n"1"->"2"\n"2"->"3"\n')
});

test("transitiveReduction with special cases", () => {
    let g: Graph
    g = new Graph();
    transitiveReduction(g);

    ["T", "1", "2", "3"].map(x => g.setNode(x, x));
    transitiveReduction(g);

    [   ["T", "1"],
    ].map(x => g.setEdge(x[0], x[1]))
    transitiveReduction(g)
    expect(graphToDot(g)).toBe('"T"->"1"\n');
    [   ["T", "1"], ["2", "3"]
    ].map(x => g.setEdge(x[0], x[1]))
    transitiveReduction(g)
    expect(graphToDot(g)).toBe('"T"->"1"\n"2"->"3"\n')
});

test("transitiveReduction that returns the removed edges", () => {
    let g: Graph
    g = new Graph();
    ["T", "1", "2", "3"].map(x => g.setNode(x, x));
    [   ["T", "1"],
        ["T", "3"],
        ["1", "2"],
        ["1", "3"],
        ["2", "3"]
    ].map(x => g.setEdge(x[0], x[1]))
    expect(transitiveReduction(g)).toStrictEqual([{v:"T",w:"3"}, {v:"1", w:"3"}])
    expect(graphToDot(g)).toBe('"T"->"1"\n"1"->"2"\n"2"->"3"\n')
});
