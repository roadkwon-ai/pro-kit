import { describe, expect, it } from "vitest";
import { completionRate } from "./completion";

describe("completionRate", () => {
	it("반을 끝냈으면 50", () => {
		expect(completionRate([{ completed: true }, { completed: false }])).toBe(50);
	});
});
