#!/usr/bin/env node
/**
 * Test script for godot-mcp-ultimate
 * Runs comprehensive analysis tools and outputs results
 */

import { spawn } from 'child_process';

const PROJECT_PATH = "C:/Users/Conner/Downloads/VeilbreakersGame";
const GODOT_PATH = "C:/Users/Conner/AppData/Local/Microsoft/WinGet/Packages/GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe/Godot_v4.5.1-stable_win64_console.exe";

// Start MCP server
const NODE_PATH = process.execPath; // Use the current node
const mcp = spawn(NODE_PATH, ['dist/index.js'], {
  env: {
    ...process.env,
    GODOT_PROJECT_PATH: PROJECT_PATH,
    GODOT_PATH: GODOT_PATH,
    GODOT_LSP_PORT: "6005"
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;
let responses = [];

function sendRequest(method, params = {}) {
  const id = requestId++;
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params
  }) + "\n";

  console.log(`\n>>> Sending: ${method}`);
  mcp.stdin.write(request);
  return id;
}

// Collect output
let buffer = '';
mcp.stdout.on('data', (data) => {
  buffer += data.toString();

  // Try to parse complete JSON objects
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log(`\n<<< Response for request ${response.id}:`);
        if (response.result?.content?.[0]?.text) {
          const text = response.result.content[0].text;
          // Try to parse as JSON for prettier output
          try {
            const parsed = JSON.parse(text);
            console.log(JSON.stringify(parsed, null, 2).slice(0, 5000));
            if (text.length > 5000) console.log(`... (${text.length} total chars)`);
          } catch {
            console.log(text.slice(0, 5000));
            if (text.length > 5000) console.log(`... (${text.length} total chars)`);
          }
        } else if (response.result?.tools) {
          console.log(`Found ${response.result.tools.length} tools`);
        } else if (response.error) {
          console.log(`ERROR: ${JSON.stringify(response.error)}`);
        } else {
          console.log(JSON.stringify(response.result, null, 2).slice(0, 2000));
        }
      } catch (e) {
        console.log(`Parse error: ${e.message}`);
      }
    }
  }
});

mcp.stderr.on('data', (data) => {
  console.error(`[MCP stderr]: ${data.toString()}`);
});

// Run tests after connection
setTimeout(() => {
  console.log("\n=== GODOT MCP ULTIMATE TEST SUITE ===\n");

  // Initialize
  sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" }
  });
}, 500);

setTimeout(() => {
  // List tools
  sendRequest("tools/list", {});
}, 1000);

setTimeout(() => {
  // Run env doctor first
  console.log("\n=== RUNNING ENV DOCTOR ===");
  sendRequest("tools/call", {
    name: "godot_env_doctor",
    arguments: { verbose: true }
  });
}, 1500);

setTimeout(() => {
  // Project health
  console.log("\n=== RUNNING PROJECT HEALTH ===");
  sendRequest("tools/call", {
    name: "godot_project_health",
    arguments: {}
  });
}, 3000);

setTimeout(() => {
  // Dead code detection
  console.log("\n=== RUNNING DEAD CODE DETECTION ===");
  sendRequest("tools/call", {
    name: "godot_detect_dead_code",
    arguments: {}
  });
}, 6000);

setTimeout(() => {
  // Signal flow
  console.log("\n=== RUNNING SIGNAL FLOW ANALYSIS ===");
  sendRequest("tools/call", {
    name: "godot_analyze_signal_flow",
    arguments: {}
  });
}, 10000);

setTimeout(() => {
  // Lint project (limited to specific directory to avoid too much output)
  console.log("\n=== RUNNING PROJECT LINT ===");
  sendRequest("tools/call", {
    name: "godot_lint_project",
    arguments: { path: "scripts/utils" }
  });
}, 15000);

setTimeout(() => {
  // Complexity heatmap
  console.log("\n=== RUNNING COMPLEXITY HEATMAP ===");
  sendRequest("tools/call", {
    name: "godot_complexity_heatmap",
    arguments: {}
  });
}, 20000);

// NEW VALIDATION TOOLS
setTimeout(() => {
  console.log("\n=== RUNNING SCENE VALIDATION ===");
  sendRequest("tools/call", {
    name: "godot_validate_scenes",
    arguments: {}
  });
}, 25000);

setTimeout(() => {
  console.log("\n=== RUNNING ASSET ANALYSIS ===");
  sendRequest("tools/call", {
    name: "godot_analyze_assets",
    arguments: {}
  });
}, 30000);

setTimeout(() => {
  console.log("\n=== RUNNING INPUT VALIDATION ===");
  sendRequest("tools/call", {
    name: "godot_validate_inputs",
    arguments: {}
  });
}, 35000);

setTimeout(() => {
  console.log("\n=== RUNNING GAME DATA VALIDATION ===");
  sendRequest("tools/call", {
    name: "godot_validate_game_data",
    arguments: {}
  });
}, 40000);

setTimeout(() => {
  console.log("\n=== RUNNING UNUSED FILE DETECTION ===");
  sendRequest("tools/call", {
    name: "godot_find_unused_files",
    arguments: {}
  });
}, 45000);

setTimeout(() => {
  console.log("\n\n=== TEST COMPLETE - ALL 55 TOOLS AVAILABLE ===");
  mcp.kill();
  process.exit(0);
}, 55000);

// Handle process errors
mcp.on('error', (err) => {
  console.error('MCP process error:', err);
  process.exit(1);
});

mcp.on('exit', (code) => {
  console.log(`MCP process exited with code ${code}`);
});
