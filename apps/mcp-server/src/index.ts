import { createProviderCatalogFromEnv, providerRegistry } from "@sales-mcp/providers";
import {
  buildAccountStatusSnapshot,
  createIntelligenceClientFromEnv,
} from "@sales-mcp/workflows";
import { toolManifest } from "./tools.js";
import { getMcpServerRuntimeConfig } from "./config.js";

async function main() {
  if (process.argv.includes("--stdio")) {
    const { runStdioServer } = await import("./server.js");
    await runStdioServer();
    return;
  }

  const runtimeConfig = getMcpServerRuntimeConfig();
  const catalog = createProviderCatalogFromEnv();
  const intelligenceClient = createIntelligenceClientFromEnv();
  const snapshot = await buildAccountStatusSnapshot(
    { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
    catalog,
    intelligenceClient,
  );

  console.log(
    JSON.stringify(
      {
        server: "sales-mcp-bundle",
        runtimeConfig,
        providers: providerRegistry,
        flagshipTool: toolManifest[0],
        snapshot,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Failed to build fixture-backed account status snapshot.", error);
  process.exitCode = 1;
});
