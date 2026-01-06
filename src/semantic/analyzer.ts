/**
 * Semantic GDScript Analyzer
 * Combines Godot LSP for runtime analysis + gdparse for AST
 */

import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { Config } from "../utils/config.js";
import fg from "fast-glob";

interface LSPMessage {
  jsonrpc: string;
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface Position {
  line: number;
  character: number;
}

interface Location {
  uri: string;
  range: {
    start: Position;
    end: Position;
  };
}

interface SymbolInfo {
  name: string;
  kind: string;
  location: Location;
  containerName?: string;
}

export class SemanticAnalyzer {
  private config: Config;
  private socket: net.Socket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >();
  private buffer = "";
  private initialized = false;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Connect to Godot LSP server
   */
  private async connect(): Promise<void> {
    if (this.socket && this.initialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on("connect", async () => {
        try {
          await this.initialize();
          this.initialized = true;
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      this.socket.on("data", (data) => {
        this.handleData(data.toString());
      });

      this.socket.on("error", (err) => {
        this.initialized = false;
        reject(new Error(`LSP connection failed: ${err.message}. Make sure Godot editor is running with LSP enabled.`));
      });

      this.socket.on("close", () => {
        this.initialized = false;
        this.socket = null;
      });

      this.socket.connect(this.config.lspPort, "127.0.0.1");
    });
  }

  /**
   * Parse LSP messages from buffer
   */
  private handleData(data: string): void {
    this.buffer += data;

    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = this.buffer.slice(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const contentStart = headerEnd + 4;

      if (this.buffer.length < contentStart + contentLength) {
        break;
      }

      const content = this.buffer.slice(contentStart, contentStart + contentLength);
      this.buffer = this.buffer.slice(contentStart + contentLength);

      try {
        const message: LSPMessage = JSON.parse(content);
        this.handleMessage(message);
      } catch (e) {
        console.error("Failed to parse LSP message:", e);
      }
    }
  }

  /**
   * Handle incoming LSP message
   */
  private handleMessage(message: LSPMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    }
  }

  /**
   * Send LSP request and wait for response
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    await this.connect();

    const id = ++this.requestId;
    const message: LSPMessage = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`LSP request timeout: ${method}`));
        }
      }, 10000);

      this.socket!.write(header + content);
    });
  }

  /**
   * Initialize LSP connection
   */
  private async initialize(): Promise<void> {
    await this.sendRequest("initialize", {
      processId: process.pid,
      rootUri: `file:///${this.config.projectPath.replace(/\\/g, "/")}`,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ["markdown", "plaintext"] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          publishDiagnostics: {},
        },
        workspace: {
          workspaceFolders: true,
          symbol: {},
        },
      },
    });

    await this.sendRequest("initialized", {});
  }

  /**
   * Convert file path to LSP URI
   */
  private toUri(filePath: string): string {
    const resolved = this.config.resolvePath(filePath);
    return `file:///${resolved.replace(/\\/g, "/")}`;
  }

  /**
   * Convert LSP URI to file path
   */
  private fromUri(uri: string): string {
    return uri.replace("file:///", "").replace(/\//g, path.sep);
  }

  // ==========================================================================
  // PUBLIC TOOL IMPLEMENTATIONS
  // ==========================================================================

  /**
   * Find symbol by name
   */
  async findSymbol(args: { name: string; scope?: string; file?: string }): Promise<any> {
    const { name, scope = "project", file } = args;

    try {
      if (scope === "file" && file) {
        // Search within a specific file
        const symbols = await this.getDocumentSymbols({ file });
        const matches = this.filterSymbols(symbols.content[0].text, name);
        return {
          content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
        };
      }

      // Search workspace
      const result = await this.sendRequest("workspace/symbol", { query: name });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              result?.map((s: any) => ({
                name: s.name,
                kind: this.symbolKindToString(s.kind),
                location: {
                  file: this.fromUri(s.location.uri),
                  line: s.location.range.start.line + 1,
                },
                container: s.containerName,
              })) || [],
              null,
              2
            ),
          },
        ],
      };
    } catch (e) {
      return this.fallbackSearch(name);
    }
  }

  /**
   * Find all references to symbol at location
   */
  async findReferences(args: { file: string; line: number; column: number }): Promise<any> {
    const { file, line, column } = args;

    try {
      const result = await this.sendRequest("textDocument/references", {
        textDocument: { uri: this.toUri(file) },
        position: { line: line - 1, character: column - 1 },
        context: { includeDeclaration: true },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              result?.map((r: any) => ({
                file: this.fromUri(r.uri),
                line: r.range.start.line + 1,
                column: r.range.start.character + 1,
              })) || [],
              null,
              2
            ),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `LSP unavailable. Error: ${e}` }],
        isError: true,
      };
    }
  }

  /**
   * Go to definition
   */
  async goToDefinition(args: { file: string; line: number; column: number }): Promise<any> {
    const { file, line, column } = args;

    try {
      const result = await this.sendRequest("textDocument/definition", {
        textDocument: { uri: this.toUri(file) },
        position: { line: line - 1, character: column - 1 },
      });

      if (!result || (Array.isArray(result) && result.length === 0)) {
        return {
          content: [{ type: "text", text: "No definition found" }],
        };
      }

      const definitions = Array.isArray(result) ? result : [result];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              definitions.map((d: any) => ({
                file: this.fromUri(d.uri || d.targetUri),
                line: (d.range || d.targetRange).start.line + 1,
                column: (d.range || d.targetRange).start.character + 1,
              })),
              null,
              2
            ),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `LSP unavailable. Error: ${e}` }],
        isError: true,
      };
    }
  }

  /**
   * Get document symbols
   */
  async getDocumentSymbols(args: { file: string }): Promise<any> {
    const { file } = args;
    const resolvedPath = this.config.resolvePath(file);

    try {
      const result = await this.sendRequest("textDocument/documentSymbol", {
        textDocument: { uri: this.toUri(file) },
      });

      const symbols = this.flattenSymbols(result || []);
      return {
        content: [{ type: "text", text: JSON.stringify(symbols, null, 2) }],
      };
    } catch (e) {
      // Fallback: parse file manually
      return this.parseFileSymbols(resolvedPath);
    }
  }

  /**
   * Get workspace symbols
   */
  async getWorkspaceSymbols(args: { query: string; limit?: number }): Promise<any> {
    const { query, limit = 50 } = args;

    try {
      const result = await this.sendRequest("workspace/symbol", { query });
      const symbols = (result || []).slice(0, limit).map((s: any) => ({
        name: s.name,
        kind: this.symbolKindToString(s.kind),
        file: this.fromUri(s.location.uri),
        line: s.location.range.start.line + 1,
        container: s.containerName,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(symbols, null, 2) }],
      };
    } catch (e) {
      return this.fallbackSearch(query);
    }
  }

  /**
   * Get diagnostics for file
   */
  async getDiagnostics(args: { file: string }): Promise<any> {
    const { file } = args;

    try {
      // Trigger diagnostics by opening document
      const content = fs.readFileSync(this.config.resolvePath(file), "utf-8");
      await this.sendRequest("textDocument/didOpen", {
        textDocument: {
          uri: this.toUri(file),
          languageId: "gdscript",
          version: 1,
          text: content,
        },
      });

      // Wait a moment for diagnostics to be computed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Note: Diagnostics are pushed via notifications, not request/response
      // For now, return empty and suggest using Godot editor
      return {
        content: [
          {
            type: "text",
            text: "Diagnostics require LSP notification handling. Use godot_lint_file for static analysis.",
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e}` }],
        isError: true,
      };
    }
  }

  /**
   * Analyze scene file
   */
  async analyzeScene(args: { scene: string }): Promise<any> {
    const { scene } = args;
    const scenePath = this.config.resolvePath(scene);

    if (!fs.existsSync(scenePath)) {
      return {
        content: [{ type: "text", text: `Scene not found: ${scene}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(scenePath, "utf-8");
    const analysis = this.parseSceneFile(content);

    return {
      content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
    };
  }

  /**
   * Analyze script dependencies
   */
  async analyzeDependencies(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const dependencies = this.extractDependencies(content);

    return {
      content: [{ type: "text", text: JSON.stringify(dependencies, null, 2) }],
    };
  }

  /**
   * Analyze resources
   */
  async analyzeResources(args: { type?: string }): Promise<any> {
    const { type } = args;

    const resourceFiles = await fg(["**/*.tres", "**/*.res"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    const resources: any[] = [];
    for (const file of resourceFiles) {
      const filePath = path.join(this.config.projectPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const resourceType = this.getResourceType(content);

      if (!type || resourceType.toLowerCase().includes(type.toLowerCase())) {
        resources.push({
          file,
          type: resourceType,
          path: this.config.toResPath(filePath),
        });
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(resources, null, 2) }],
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private symbolKindToString(kind: number): string {
    const kinds: Record<number, string> = {
      1: "File",
      2: "Module",
      3: "Namespace",
      4: "Package",
      5: "Class",
      6: "Method",
      7: "Property",
      8: "Field",
      9: "Constructor",
      10: "Enum",
      11: "Interface",
      12: "Function",
      13: "Variable",
      14: "Constant",
      15: "String",
      16: "Number",
      17: "Boolean",
      18: "Array",
      19: "Object",
      20: "Key",
      21: "Null",
      22: "EnumMember",
      23: "Struct",
      24: "Event",
      25: "Operator",
      26: "TypeParameter",
    };
    return kinds[kind] || "Unknown";
  }

  private flattenSymbols(symbols: any[], parent?: string): any[] {
    const result: any[] = [];
    for (const sym of symbols) {
      result.push({
        name: sym.name,
        kind: this.symbolKindToString(sym.kind),
        line: sym.range?.start.line + 1 || sym.selectionRange?.start.line + 1,
        parent,
      });
      if (sym.children) {
        result.push(...this.flattenSymbols(sym.children, sym.name));
      }
    }
    return result;
  }

  private filterSymbols(symbolsJson: string, name: string): any[] {
    try {
      const symbols = JSON.parse(symbolsJson);
      return symbols.filter((s: any) =>
        s.name.toLowerCase().includes(name.toLowerCase())
      );
    } catch {
      return [];
    }
  }

  private async fallbackSearch(query: string): Promise<any> {
    // Fallback: grep through GDScript files
    const files = await fg(["**/*.gd"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    const results: any[] = [];
    const pattern = new RegExp(
      `(func|var|const|signal|class)\\s+${query}`,
      "gi"
    );

    for (const file of files) {
      const content = fs.readFileSync(
        path.join(this.config.projectPath, file),
        "utf-8"
      );
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          const match = line.match(/(func|var|const|signal|class)\s+(\w+)/i);
          results.push({
            name: match?.[2] || query,
            kind: match?.[1] || "unknown",
            file,
            line: index + 1,
          });
        }
      });
    }

    return {
      content: [
        {
          type: "text",
          text: results.length > 0
            ? JSON.stringify(results, null, 2)
            : `No symbols found matching "${query}"`,
        },
      ],
    };
  }

  private async parseFileSymbols(filePath: string): Promise<any> {
    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${filePath}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const symbols: any[] = [];
    const lines = content.split("\n");

    const patterns = [
      { regex: /^class_name\s+(\w+)/, kind: "Class" },
      { regex: /^extends\s+(\w+)/, kind: "Extends" },
      { regex: /^func\s+(\w+)/, kind: "Function" },
      { regex: /^var\s+(\w+)/, kind: "Variable" },
      { regex: /^const\s+(\w+)/, kind: "Constant" },
      { regex: /^signal\s+(\w+)/, kind: "Signal" },
      { regex: /^enum\s+(\w+)/, kind: "Enum" },
      { regex: /^@onready\s+var\s+(\w+)/, kind: "OnReady" },
      { regex: /^@export\s+var\s+(\w+)/, kind: "Export" },
    ];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      for (const { regex, kind } of patterns) {
        const match = trimmed.match(regex);
        if (match) {
          symbols.push({
            name: match[1],
            kind,
            line: index + 1,
          });
          break;
        }
      }
    });

    return {
      content: [{ type: "text", text: JSON.stringify(symbols, null, 2) }],
    };
  }

  private parseSceneFile(content: string): any {
    const analysis: any = {
      format: "",
      nodes: [],
      scripts: [],
      resources: [],
      signals: [],
    };

    // Parse GD_SCENE header
    const headerMatch = content.match(/\[gd_scene[^\]]*\]/);
    if (headerMatch) {
      analysis.format = headerMatch[0];
    }

    // Parse external resources
    const extResourceRegex = /\[ext_resource[^\]]*path="([^"]+)"[^\]]*type="([^"]+)"[^\]]*id="([^"]+)"/g;
    let match;
    while ((match = extResourceRegex.exec(content)) !== null) {
      analysis.resources.push({
        path: match[1],
        type: match[2],
        id: match[3],
      });
    }

    // Parse nodes
    const nodeRegex = /\[node name="([^"]+)" type="([^"]+)"[^\]]*\]/g;
    while ((match = nodeRegex.exec(content)) !== null) {
      analysis.nodes.push({
        name: match[1],
        type: match[2],
      });
    }

    // Parse script attachments
    const scriptRegex = /script\s*=\s*ExtResource\("([^"]+)"\)/g;
    while ((match = scriptRegex.exec(content)) !== null) {
      const resourceId = match[1];
      const resource = analysis.resources.find((r: any) => r.id === resourceId);
      if (resource) {
        analysis.scripts.push(resource.path);
      }
    }

    // Parse signal connections
    const connectionRegex = /\[connection signal="([^"]+)" from="([^"]+)" to="([^"]+)" method="([^"]+)"/g;
    while ((match = connectionRegex.exec(content)) !== null) {
      analysis.signals.push({
        signal: match[1],
        from: match[2],
        to: match[3],
        method: match[4],
      });
    }

    return analysis;
  }

  private extractDependencies(content: string): any {
    const dependencies: any = {
      preloads: [],
      loads: [],
      extends: null,
      class_name: null,
      signals_emitted: [],
      signals_connected: [],
      autoloads_used: [],
    };

    // Extract preloads
    const preloadRegex = /preload\("([^"]+)"\)/g;
    let match;
    while ((match = preloadRegex.exec(content)) !== null) {
      dependencies.preloads.push(match[1]);
    }

    // Extract loads
    const loadRegex = /load\("([^"]+)"\)/g;
    while ((match = loadRegex.exec(content)) !== null) {
      dependencies.loads.push(match[1]);
    }

    // Extract extends
    const extendsMatch = content.match(/^extends\s+(\w+)/m);
    if (extendsMatch) {
      dependencies.extends = extendsMatch[1];
    }

    // Extract class_name
    const classNameMatch = content.match(/^class_name\s+(\w+)/m);
    if (classNameMatch) {
      dependencies.class_name = classNameMatch[1];
    }

    // Extract signal emissions
    const emitRegex = /emit_signal\("(\w+)"/g;
    while ((match = emitRegex.exec(content)) !== null) {
      if (!dependencies.signals_emitted.includes(match[1])) {
        dependencies.signals_emitted.push(match[1]);
      }
    }
    // New emit syntax
    const emitRegex2 = /(\w+)\.emit\(/g;
    while ((match = emitRegex2.exec(content)) !== null) {
      if (!dependencies.signals_emitted.includes(match[1])) {
        dependencies.signals_emitted.push(match[1]);
      }
    }

    // Extract signal connections
    const connectRegex = /\.connect\("?(\w+)"?,/g;
    while ((match = connectRegex.exec(content)) !== null) {
      if (!dependencies.signals_connected.includes(match[1])) {
        dependencies.signals_connected.push(match[1]);
      }
    }

    // Extract autoload usage (common VEILBREAKERS autoloads)
    const autoloads = [
      "ErrorLogger",
      "EventBus",
      "DataManager",
      "GameManager",
      "SaveManager",
      "AudioManager",
      "SceneManager",
      "SettingsManager",
      "VERASystem",
      "InventorySystem",
      "PathSystem",
      "CrashHandler",
      "UIStyleCache",
    ];
    for (const autoload of autoloads) {
      if (content.includes(autoload + ".")) {
        dependencies.autoloads_used.push(autoload);
      }
    }

    return dependencies;
  }

  private getResourceType(content: string): string {
    const typeMatch = content.match(/\[resource\][^\[]*script\s*=\s*ExtResource/);
    if (typeMatch) {
      const scriptMatch = content.match(/type="Script"[^]]*path="([^"]+)"/);
      if (scriptMatch) {
        const scriptPath = scriptMatch[1];
        const scriptName = path.basename(scriptPath, ".gd");
        return scriptName;
      }
    }

    const gdResourceMatch = content.match(/\[gd_resource type="([^"]+)"/);
    if (gdResourceMatch) {
      return gdResourceMatch[1];
    }

    return "Resource";
  }
}
