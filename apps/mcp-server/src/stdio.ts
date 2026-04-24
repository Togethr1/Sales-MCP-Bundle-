import { runStdioServer } from "./server.js";

runStdioServer().catch((error) => {
  console.error("Failed to start sales-mcp-bundle stdio server.", error);
  process.exitCode = 1;
});

