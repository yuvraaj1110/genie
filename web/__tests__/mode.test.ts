import { describe, it, expect } from "vitest";
import { resolveMode } from "@/lib/mode";

describe("resolveMode", () => {
  it("returns 'real' when ?real=1", () => expect(resolveMode("?real=1")).toBe("real"));
  it("defaults to 'mock' for empty search", () => expect(resolveMode("")).toBe("mock"));
  it("stays 'mock' for unrelated params", () => expect(resolveMode("?foo=bar")).toBe("mock"));
  it("stays 'mock' when real has another value", () => expect(resolveMode("?real=0")).toBe("mock"));
});
