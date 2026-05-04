import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

let client: Client;

beforeAll(async () => {
  const server = createServer();
  client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(ct), server.connect(st)]);
});

describe("lookup_ploy", () => {
  it("is registered", async () => {
    const { tools } = await client.listTools();
    expect(tools.find((t) => t.name === "lookup_ploy")).toBeDefined();
  });

  it("finds a universal ploy by name", async () => {
    const result = await client.callTool({
      name: "lookup_ploy",
      arguments: { name: "Bolster" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Bolster");
    expect(text).toContain("Kill Team");
    expect(text).toContain("strategic ploy");
  });

  it("always includes Kill Team game mode label", async () => {
    const result = await client.callTool({
      name: "lookup_ploy",
      arguments: { name: "Command Re-roll" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Kill Team");
  });

  it("filters by faction", async () => {
    const result = await client.callTool({
      name: "lookup_ploy",
      arguments: { name: "Hateful", faction: "Legionaries" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Legionaries");
  });

  it("filters by type", async () => {
    const result = await client.callTool({
      name: "lookup_ploy",
      arguments: { name: "Command Re-roll", type: "tactical" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("tactical ploy");
  });

  it("suggests lookup_stratagem for not found", async () => {
    const result = await client.callTool({
      name: "lookup_ploy",
      arguments: { name: "xyznonexistent" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("lookup_stratagem");
  });
});
