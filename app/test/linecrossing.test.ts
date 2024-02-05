import { areDiagonalHMLinesCrossed, areOrthogonalHMLinesCrossed, findBestHorizontalOrderForEdges } from "../src/lib/hm";
import { expect, test } from "vitest";

test("various random lines", () => {
    expect(areDiagonalHMLinesCrossed([4,1,6,5],[6,1,2,3])).toBe(true)
    expect(areDiagonalHMLinesCrossed([6,1,2,3],[4,1,6,5])).toBe(true)
    expect(areDiagonalHMLinesCrossed([2,1,2,3],[6,1,6,3])).toBe(false)
    expect(areDiagonalHMLinesCrossed([6,1,6,3], [2,1,2,3])).toBe(false)

    expect(areDiagonalHMLinesCrossed([4,1,6,2], [3,1,5,2])).toBe(false)
    expect(areDiagonalHMLinesCrossed([1,1,3,3], [2,2,4,3])).toBe(false) //!that's why I need areOrthogonalHMLinesCrossed!
})

test("various random orthogonal lines", () => {
    expect(areOrthogonalHMLinesCrossed(4,6,2,6,2,1)).toBe(true)
    expect(areOrthogonalHMLinesCrossed(4,6,1,6,2,2)).toBe(true)
    expect(areOrthogonalHMLinesCrossed(1,3,1,2,4,2)).toBe(true) //!that's why I need areOrthogonalHMLinesCrossed!
})

test("same level orthogonal lines", () => {
    expect(areOrthogonalHMLinesCrossed(1,3,1,2,4,1)).toBe(true)
    expect(areOrthogonalHMLinesCrossed(3,1,1,2,4,1)).toBe(true)
    expect(areOrthogonalHMLinesCrossed(2,1,1,2,4,1)).toBe(false)
})

test("same level orthogonal lines with same start or end points", () => {
    expect(areOrthogonalHMLinesCrossed(1,3,1,2,4,1)).toBe(true) //!that's why I need areOrthogonalHMLinesCrossed!
    expect(areOrthogonalHMLinesCrossed(7,11,1,7,13,1)).toBe(true)
})




