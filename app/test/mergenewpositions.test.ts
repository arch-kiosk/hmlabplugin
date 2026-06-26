import { mergeNewPositions } from "../src/lib/hm";
import { expect, test } from "vitest";

test("merge various position sequences", () => {
    expect(mergeNewPositions([-1,0,1],[-1,0])).toStrictEqual([-2,2])
    expect(mergeNewPositions([-1,0,1,2],[-1,0])).toStrictEqual([-2,3])
    expect(mergeNewPositions([-1,1,2],[-1,0])).toStrictEqual([-2,0])
    expect(mergeNewPositions([-2,-1,1,2],[-1,0,2])).toStrictEqual([-3,0,3])
    expect(mergeNewPositions([-2,-1,1,2],[-1,0,1])).toStrictEqual([-3,0,3])
})
test("merge various position sequences II", () => {
    expect(mergeNewPositions([-2, -1], [-2, -1])).toStrictEqual([-4, -3])
    expect(mergeNewPositions([1, 2], [1, 2])).toStrictEqual([3, 4])
})

