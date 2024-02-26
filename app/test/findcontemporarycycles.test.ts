import { findContemporaryCycles, hmNode } from "../src/lib/hm";
import { expect, test } from "vitest";

test("test if simple acyclic graph can be processed", () => {
    const hmNodes = [
        new hmNode("1", [], ["2", "3"]),
        new hmNode("2", [], ["3", "4"]),
        new hmNode("3", ["4"], []),
        new hmNode("4", ["3"], []),
    ];

    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});

test("test if simple cycle gets detected and solved", () => {
    const hmNodes = [
        new hmNode("1", ["4"], ["2", "3"]),
        new hmNode("2", [], ["3", "4"]),
        new hmNode("3", ["4"], []),
        new hmNode("4", ["3", "1"], []),
    ];

    expect(findContemporaryCycles(hmNodes)).toStrictEqual({
        cycles: [{
            "originalCycle": [
                "1",
                "2",
                "3",
                "4",
            ],
            "solved": true,
        }],
        droppedRelations: [["4", "1"], ["1", "4"]],
    });
    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});

test("test if 2 cycles get detected", () => {
    const hmNodes = [
        new hmNode("1", ["4"], ["2", "3"]),
        new hmNode("2", [], ["3", "4"]),
        new hmNode("3", ["4", "1"], []),
        new hmNode("4", ["3", "1"], []),
    ];

    expect(findContemporaryCycles(hmNodes)).toStrictEqual({
        cycles: [{
            "originalCycle": [
                "1",
                "2",
                "3",
                "4",
            ],
            "solved": true,
        },
            {
                "originalCycle": [
                    "1",
                    "2",
                    "3",
                ],
                "solved": true,
            }],
        droppedRelations: [["4", "1"], ["1", "4"], ["3", "1"], ["1", "3"]],
    });
    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});

test("test if more complex cycle get detected", () => {
    const hmNodes = [
        new hmNode("1", [], ["2", "3"]),
        new hmNode("2", [], ["13"]),
        new hmNode("3", ["10"], ["4"]),
        new hmNode("4", ["5"], ["6"]),
        new hmNode("5", ["4"], ["6", "7"]),
        new hmNode("6", ["7", "8"], ["11"]),
        new hmNode("7", ["6"], []),
        new hmNode("8", ["6", "9"], []),
        new hmNode("9", ["8"], ["10"]),
        new hmNode("10", ["3"], []),
        new hmNode("11", [], []),
        new hmNode("13", [], []),
    ];

    expect(findContemporaryCycles(hmNodes)).toStrictEqual({
        cycles: [{
            "originalCycle": [
                "3",
                "4",
                "6",
                "8",
                "9",
                "10",
            ],
            "solved": true,
        }],
        droppedRelations: [["10", "3"], ["3", "10"]],
    });
    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});
test("test if another complex cycle gets detected", () => {
    const hmNodes = [
        new hmNode("1", [], ["2", "3"]),
        new hmNode("2", ["3"], ["13"]),
        new hmNode("3", ["2", "10"]),
        new hmNode("9", ["13"], ["10"]),
        new hmNode("10", ["3"], []),
        new hmNode("13", ["9"], []),
    ];

    expect(findContemporaryCycles(hmNodes)).toStrictEqual({
        cycles: [{
            "originalCycle": [
                "2",
                "13",
                "9",
                "10",
                "3",
            ],
            "solved": true,
        },
        ],
        droppedRelations: [["3", "2"], ["2", "3"]],
    });
    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});

test("test LA", () => {
    const hmNodes = [
        new hmNode("8", [], ["9"]),
        new hmNode("10", [], ["9", "1"]),
        new hmNode("9", ["1", "2", "3", "f"], []),
        new hmNode("3", ["9"], ["2"]),
        new hmNode("1", ["9"], ["2"]),
        new hmNode("2", ["9"], []),
        new hmNode("f", ["9"], ["3"]),
    ];

    expect(findContemporaryCycles(hmNodes)).toStrictEqual({
        cycles: [{
            "originalCycle": [
                "9",
                "1",
                "2",
            ],
            "solved": true,
        },
            {
                "originalCycle": [
                    "9",
                    "f",
                    "3",
                ],
                "solved": true,
            },
        ],
        "droppedRelations": [
            [
                "2",
                "9",
            ],
            [
                "9",
                "2",
            ],
            [
                "3",
                "9",
            ],
            [
                "9",
                "3",
            ],
        ],
    });
    expect(findContemporaryCycles(hmNodes).droppedRelations).toStrictEqual([]);
});
