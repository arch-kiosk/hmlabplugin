import { areDiagonalHMLinesCrossed, positionHMEnds } from "../src/lib/hm";
import { expect, test } from "vitest";

test("various position sequences", () => {
    expect(positionHMEnds([-8,0,19])).toStrictEqual([-1,0,1])
    expect(positionHMEnds([-9,-8,0,2,19])).toStrictEqual([-2,-1,0,1,2])
    expect(positionHMEnds([-10,-9,-8,0,2,19,21])).toStrictEqual([-3,-2,-1,0,1,2,3])
    expect(positionHMEnds([0])).toStrictEqual([0])
    expect(positionHMEnds([-5])).toStrictEqual([-1])
    expect(positionHMEnds([5])).toStrictEqual([1])
    expect(positionHMEnds([1,2,5])).toStrictEqual([1,2,3])
    expect(positionHMEnds([-1,-2,-5])).toStrictEqual([-3,-2,-1])
})

test("asymmetrical position sequences", () => {
    expect(positionHMEnds([-10,-9,-8,2,19,21])).toStrictEqual([-3,-2,-1,1,2,3])
    expect(positionHMEnds([-10,-9,-8,19])).toStrictEqual([-3,-2,-1,1])
    expect(positionHMEnds([-8,19])).toStrictEqual([-1,1])
    expect(positionHMEnds([-8,0])).toStrictEqual([-1,0])
    expect(positionHMEnds([0,2])).toStrictEqual([0,1])
    expect(positionHMEnds([0,0])).toStrictEqual([0,1])
    expect(positionHMEnds([0,0,0])).toStrictEqual([-1,0,1])
    expect(positionHMEnds([-5,0,0,2,3])).toStrictEqual([-2,-1,0,1,2])
    expect(positionHMEnds([-5,-3,0,0,3])).toStrictEqual([-2,-1,0,1,2])
})

test("trouble position sequences", () => {
})
