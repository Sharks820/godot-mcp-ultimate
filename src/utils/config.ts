/**
 * Configuration management for godot-mcp-ultimate
 */

import * as fs from "fs";
import * as path from "path";

export interface GodotConfig {
  projectPath: string;
  godotPath: string;
  lspPort: number;
  gdtoolkitPath: string | null;
  gdunitPath: string | null;
}

export class Config {
  private config: GodotConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Attempt to detect Godot executable path based on platform
   */
  private detectGodotPath(): string {
    const platform = process.platform;

    // Common paths to check based on platform
    const possiblePaths: string[] = [];

    if (platform === "win32") {
      possiblePaths.push(
        "C:/Program Files/Godot/Godot_v4.3-stable_win64.exe",
        "C:/Program Files (x86)/Godot/Godot.exe",
        `${process.env.LOCALAPPDATA}/Godot/Godot.exe`,
        "godot.exe" // System PATH
      );
    } else if (platform === "darwin") {
      possiblePaths.push(
        "/Applications/Godot.app/Contents/MacOS/Godot",
        "/usr/local/bin/godot",
        "godot" // System PATH
      );
    } else {
      // Linux and others
      possiblePaths.push(
        "/usr/bin/godot",
        "/usr/local/bin/godot",
        `${process.env.HOME}/.local/bin/godot`,
        "godot" // System PATH
      );
    }

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          return p;
        }
      } catch {
        // Path doesn't exist or isn't accessible
      }
    }

    // Fallback to 'godot' and hope it's in PATH
    console.error(
      "WARNING: Godot executable not found. Set GODOT_PATH environment variable or add to .godot-mcp.json"
    );
    return "godot";
  }

  private loadConfig(): GodotConfig {
    // Default configuration
    // IMPORTANT: GODOT_PATH must be set via environment variable or .godot-mcp.json
    const defaults: GodotConfig = {
      projectPath: process.env.GODOT_PROJECT_PATH || process.cwd(),
      godotPath: process.env.GODOT_PATH || this.detectGodotPath(),
      lspPort: parseInt(process.env.GODOT_LSP_PORT || "6005", 10),
      gdtoolkitPath: process.env.GDTOOLKIT_PATH || null,
      gdunitPath: process.env.GDUNIT_PATH || null,
    };

    // Try to load project-specific config
    const configPath = path.join(defaults.projectPath, ".godot-mcp.json");
    if (fs.existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return { ...defaults, ...fileConfig };
      } catch (e) {
        console.error("Failed to load .godot-mcp.json:", e);
      }
    }

    return defaults;
  }

  get projectPath(): string {
    return this.config.projectPath;
  }

  get godotPath(): string {
    return this.config.godotPath;
  }

  get lspPort(): number {
    return this.config.lspPort;
  }

  get gdtoolkitPath(): string | null {
    return this.config.gdtoolkitPath;
  }

  get gdunitPath(): string | null {
    return this.config.gdunitPath;
  }

  /**
   * Resolve a path relative to the project root
   */
  resolvePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.projectPath, relativePath);
  }

  /**
   * Convert absolute path to res:// format
   */
  toResPath(absolutePath: string): string {
    const normalized = path.normalize(absolutePath).replace(/\\/g, "/");
    const projectNormalized = path.normalize(this.projectPath).replace(/\\/g, "/");
    if (normalized.startsWith(projectNormalized)) {
      return "res://" + normalized.slice(projectNormalized.length + 1);
    }
    return absolutePath;
  }

  /**
   * Convert res:// path to absolute path
   */
  fromResPath(resPath: string): string {
    if (resPath.startsWith("res://")) {
      return path.join(this.projectPath, resPath.slice(6));
    }
    return resPath;
  }

  /**
   * Check if a tool is available
   */
  async checkTool(tool: "gdlint" | "gdformat" | "gdparse" | "gdradon"): Promise<boolean> {
    const { spawn } = await import("child_process");
    return new Promise((resolve) => {
      const proc = spawn(tool, ["--version"], { shell: true });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
    });
  }

  /**
   * Check if Godot LSP is running
   */
  async checkLSP(): Promise<boolean> {
    const net = await import("net");
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        resolve(false);
      });
      socket.connect(this.lspPort, "127.0.0.1");
    });
  }
}
