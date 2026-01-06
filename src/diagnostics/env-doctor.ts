/**
 * Environment Doctor - Health check tool for godot-mcp-ultimate
 * Validates environment setup and provides actionable remediation steps
 */

import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { execSync, spawn } from "child_process";
import { Config } from "../utils/config.js";

interface HealthCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
  remediation?: string[];
}

interface HealthReport {
  overall_status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  platform: string;
  checks: HealthCheck[];
  summary: {
    passed: number;
    warnings: number;
    errors: number;
  };
  capabilities: {
    semantic_analysis: boolean;
    linting: boolean;
    formatting: boolean;
    testing: boolean;
    project_validation: boolean;
  };
}

export class EnvDoctor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Run comprehensive environment health check
   */
  async runDiagnostics(args: { verbose?: boolean }): Promise<any> {
    const { verbose = false } = args;
    const checks: HealthCheck[] = [];

    // Run all checks in parallel where possible
    const [
      godotCheck,
      projectCheck,
      lspCheck,
      gdtoolkitCheck,
      gdunitCheck,
      nodeCheck,
    ] = await Promise.all([
      this.checkGodotExecutable(),
      this.checkProjectPath(),
      this.checkLSPConnection(),
      this.checkGdToolkit(),
      this.checkGdUnit4(),
      this.checkNodeVersion(),
    ]);

    checks.push(godotCheck, projectCheck, lspCheck, gdtoolkitCheck, gdunitCheck, nodeCheck);

    // Calculate summary
    const passed = checks.filter(c => c.status === "ok").length;
    const warnings = checks.filter(c => c.status === "warning").length;
    const errors = checks.filter(c => c.status === "error").length;

    // Determine overall status
    let overall_status: "healthy" | "degraded" | "unhealthy";
    if (errors > 0) {
      overall_status = "unhealthy";
    } else if (warnings > 0) {
      overall_status = "degraded";
    } else {
      overall_status = "healthy";
    }

    // Determine capabilities based on check results
    const capabilities = {
      semantic_analysis: lspCheck.status !== "error",
      linting: gdtoolkitCheck.status === "ok",
      formatting: gdtoolkitCheck.status === "ok",
      testing: gdunitCheck.status === "ok" && godotCheck.status === "ok",
      project_validation: projectCheck.status === "ok",
    };

    const report: HealthReport = {
      overall_status,
      timestamp: new Date().toISOString(),
      platform: `${process.platform} (${process.arch})`,
      checks: verbose ? checks : checks.filter(c => c.status !== "ok"),
      summary: { passed, warnings, errors },
      capabilities,
    };

    // Generate human-readable summary
    const summaryText = this.generateSummaryText(report, verbose);

    return {
      content: [{
        type: "text",
        text: verbose
          ? JSON.stringify(report, null, 2)
          : summaryText,
      }],
    };
  }

  private async checkGodotExecutable(): Promise<HealthCheck> {
    const godotPath = this.config.godotPath;

    // Check if path exists
    if (!godotPath || godotPath === "godot") {
      // Try to find godot in PATH
      try {
        execSync("godot --version", { stdio: "pipe", timeout: 5000 });
        return {
          name: "Godot Executable",
          status: "ok",
          message: "Godot found in system PATH",
          details: "Using 'godot' from PATH",
        };
      } catch {
        return {
          name: "Godot Executable",
          status: "error",
          message: "Godot executable not found",
          details: `Checked: ${godotPath}`,
          remediation: [
            "Set GODOT_PATH environment variable to your Godot executable",
            "Or add 'godotPath' to .godot-mcp.json in your project root",
            "Download Godot from https://godotengine.org/download",
            "Example: export GODOT_PATH=/path/to/godot",
          ],
        };
      }
    }

    // Check if explicit path exists
    if (!fs.existsSync(godotPath)) {
      return {
        name: "Godot Executable",
        status: "error",
        message: "Godot executable path does not exist",
        details: `Path: ${godotPath}`,
        remediation: [
          "Verify the path in GODOT_PATH environment variable",
          "Check if Godot was moved or uninstalled",
          "Update .godot-mcp.json with correct path",
        ],
      };
    }

    // Try to get version
    try {
      const result = execSync(`"${godotPath}" --version`, {
        stdio: "pipe",
        timeout: 10000,
      }).toString().trim();

      // Check for Godot 4.x
      if (result.startsWith("3.")) {
        return {
          name: "Godot Executable",
          status: "warning",
          message: `Godot 3.x detected (${result}) - this MCP is optimized for Godot 4.x`,
          details: `Path: ${godotPath}`,
          remediation: [
            "Consider upgrading to Godot 4.x for full compatibility",
            "Some features may not work correctly with Godot 3.x",
          ],
        };
      }

      return {
        name: "Godot Executable",
        status: "ok",
        message: `Godot ${result} found`,
        details: `Path: ${godotPath}`,
      };
    } catch (error) {
      return {
        name: "Godot Executable",
        status: "warning",
        message: "Godot found but version check failed",
        details: `Path: ${godotPath}`,
        remediation: [
          "Verify the executable is not corrupted",
          "Try running 'godot --version' manually",
        ],
      };
    }
  }

  private async checkProjectPath(): Promise<HealthCheck> {
    const projectPath = this.config.projectPath;

    if (!projectPath) {
      return {
        name: "Project Path",
        status: "error",
        message: "No project path configured",
        remediation: [
          "Set GODOT_PROJECT_PATH environment variable",
          "Or run from within your Godot project directory",
        ],
      };
    }

    if (!fs.existsSync(projectPath)) {
      return {
        name: "Project Path",
        status: "error",
        message: "Project path does not exist",
        details: `Path: ${projectPath}`,
        remediation: [
          "Verify GODOT_PROJECT_PATH is correct",
          "Ensure the project directory exists",
        ],
      };
    }

    // Check for project.godot file
    const projectFile = path.join(projectPath, "project.godot");
    if (!fs.existsSync(projectFile)) {
      return {
        name: "Project Path",
        status: "warning",
        message: "No project.godot found - may not be a Godot project",
        details: `Path: ${projectPath}`,
        remediation: [
          "Ensure GODOT_PROJECT_PATH points to a valid Godot project root",
          "The directory should contain a project.godot file",
        ],
      };
    }

    // Count project files
    const gdFiles = this.countFiles(projectPath, ".gd");
    const tscnFiles = this.countFiles(projectPath, ".tscn");
    const tresFiles = this.countFiles(projectPath, ".tres");

    return {
      name: "Project Path",
      status: "ok",
      message: "Valid Godot project found",
      details: `Path: ${projectPath}\nFiles: ${gdFiles} scripts, ${tscnFiles} scenes, ${tresFiles} resources`,
    };
  }

  private async checkLSPConnection(): Promise<HealthCheck> {
    const port = this.config.lspPort;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.on("connect", () => {
        socket.destroy();
        resolve({
          name: "Godot LSP",
          status: "ok",
          message: `LSP server responding on port ${port}`,
          details: "Full semantic analysis available",
        });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({
          name: "Godot LSP",
          status: "warning",
          message: `LSP not responding on port ${port}`,
          details: "Semantic analysis will use fallback pattern matching",
          remediation: [
            "Open your project in Godot Editor to start the LSP server",
            "Go to Editor > Editor Settings > Network > Language Server",
            "Ensure 'Enable' is checked and port is 6005 (or matches GODOT_LSP_PORT)",
            "Restart the Godot Editor if needed",
          ],
        });
      });

      socket.on("error", () => {
        socket.destroy();
        resolve({
          name: "Godot LSP",
          status: "warning",
          message: `Cannot connect to LSP on port ${port}`,
          details: "Semantic analysis will use fallback pattern matching",
          remediation: [
            "Open your project in Godot Editor to start the LSP server",
            "Verify no firewall is blocking port " + port,
            "Check GODOT_LSP_PORT if using a custom port",
          ],
        });
      });

      socket.connect(port, "127.0.0.1");
    });
  }

  private async checkGdToolkit(): Promise<HealthCheck> {
    const tools = {
      gdlint: false,
      gdformat: false,
      gdparse: false,
    };

    // Check each tool
    for (const tool of ["gdlint", "gdformat", "gdparse"] as const) {
      try {
        execSync(`${tool} --version`, { stdio: "pipe", timeout: 5000 });
        tools[tool] = true;
      } catch {
        tools[tool] = false;
      }
    }

    const available = Object.entries(tools).filter(([, v]) => v).map(([k]) => k);
    const missing = Object.entries(tools).filter(([, v]) => !v).map(([k]) => k);

    if (missing.length === 0) {
      return {
        name: "GDToolkit",
        status: "ok",
        message: "All gdtoolkit tools available",
        details: `Available: ${available.join(", ")}`,
      };
    }

    if (available.length === 0) {
      return {
        name: "GDToolkit",
        status: "warning",
        message: "gdtoolkit not installed - linting/formatting unavailable",
        details: "Falling back to built-in pattern-based linting",
        remediation: [
          "Install gdtoolkit: pip install gdtoolkit",
          "Or: pip install gdtoolkit==4.2.2 (for Godot 4.x)",
          "Ensure pip bin directory is in your PATH",
          "On Windows: python -m pip install gdtoolkit",
        ],
      };
    }

    return {
      name: "GDToolkit",
      status: "warning",
      message: "Partial gdtoolkit installation",
      details: `Available: ${available.join(", ")}\nMissing: ${missing.join(", ")}`,
      remediation: [
        "Reinstall gdtoolkit: pip install --upgrade gdtoolkit",
        "Check if all tools are in your PATH",
      ],
    };
  }

  private async checkGdUnit4(): Promise<HealthCheck> {
    const projectPath = this.config.projectPath;

    const possiblePaths = [
      path.join(projectPath, "addons", "gdUnit4"),
      path.join(projectPath, "addons", "GdUnit4"),
      path.join(projectPath, "addons", "gdunit4"),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        // Check for the command tool
        const cmdTool = path.join(p, "bin", "GdUnitCmdTool.gd");
        if (fs.existsSync(cmdTool)) {
          return {
            name: "GdUnit4",
            status: "ok",
            message: "GdUnit4 testing framework found",
            details: `Path: ${p}`,
          };
        }

        return {
          name: "GdUnit4",
          status: "warning",
          message: "GdUnit4 found but may be incomplete",
          details: `Path: ${p}\nMissing: bin/GdUnitCmdTool.gd`,
          remediation: [
            "Reinstall GdUnit4 from AssetLib",
            "Or download from https://github.com/MikeSchulze/gdUnit4",
          ],
        };
      }
    }

    return {
      name: "GdUnit4",
      status: "warning",
      message: "GdUnit4 not found - testing features unavailable",
      details: "Checked addons/gdUnit4 and addons/GdUnit4",
      remediation: [
        "Install GdUnit4 from Godot AssetLib (search 'gdUnit4')",
        "Or clone from https://github.com/MikeSchulze/gdUnit4",
        "Copy the 'addons/gdUnit4' folder to your project",
      ],
    };
  }

  private async checkNodeVersion(): Promise<HealthCheck> {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0], 10);

    if (major < 18) {
      return {
        name: "Node.js",
        status: "error",
        message: `Node.js ${nodeVersion} is too old`,
        details: "This MCP requires Node.js 18 or higher",
        remediation: [
          "Upgrade Node.js to version 18 or higher",
          "Download from https://nodejs.org/",
          "Or use nvm: nvm install 18 && nvm use 18",
        ],
      };
    }

    return {
      name: "Node.js",
      status: "ok",
      message: `Node.js ${nodeVersion}`,
    };
  }

  private countFiles(dir: string, ext: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "addons") {
          count += this.countFiles(fullPath, ext);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          count++;
        }
      }
    } catch {
      // Ignore permission errors
    }
    return count;
  }

  private generateSummaryText(report: HealthReport, verbose: boolean): string {
    const statusEmoji = {
      healthy: "✅",
      degraded: "⚠️",
      unhealthy: "❌",
    };

    const checkEmoji = {
      ok: "✅",
      warning: "⚠️",
      error: "❌",
    };

    let text = `
╔══════════════════════════════════════════════════════════════╗
║           GODOT MCP ULTIMATE - ENVIRONMENT DOCTOR            ║
╚══════════════════════════════════════════════════════════════╝

Overall Status: ${statusEmoji[report.overall_status]} ${report.overall_status.toUpperCase()}
Platform: ${report.platform}
Timestamp: ${report.timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         CHECK RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    for (const check of report.checks) {
      text += `\n${checkEmoji[check.status]} ${check.name}: ${check.message}`;
      if (check.details) {
        text += `\n   ${check.details.split("\n").join("\n   ")}`;
      }
      if (check.remediation && check.status !== "ok") {
        text += `\n   💡 To fix:`;
        for (const step of check.remediation) {
          text += `\n      • ${step}`;
        }
      }
    }

    text += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.capabilities.semantic_analysis ? "✅" : "❌"} Semantic Analysis (find symbols, go to definition)
${report.capabilities.linting ? "✅" : "⚠️"} Linting (gdlint integration)
${report.capabilities.formatting ? "✅" : "⚠️"} Formatting (gdformat integration)
${report.capabilities.testing ? "✅" : "❌"} Testing (GdUnit4 integration)
${report.capabilities.project_validation ? "✅" : "❌"} Project Validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                           SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Passed: ${report.summary.passed}  |  Warnings: ${report.summary.warnings}  |  Errors: ${report.summary.errors}
`;

    if (report.overall_status === "unhealthy") {
      text += `
⚠️  ATTENTION: Your environment has critical issues.
    Please address the errors above before using the MCP.
`;
    } else if (report.overall_status === "degraded") {
      text += `
💡 TIP: Your environment is functional but some features are limited.
   Address the warnings above for the best experience.
`;
    } else {
      text += `
🎉 Your environment is fully configured and ready for VEILBREAKERS development!
`;
    }

    return text;
  }
}
