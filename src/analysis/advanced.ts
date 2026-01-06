/**
 * ADVANCED ANALYSIS MODULE
 *
 * Contains powerful analysis tools that make this MCP unmatched:
 * - Scene Tree Visualizer
 * - Dead Code Detector
 * - Signal Flow Analyzer
 * - Project Health Dashboard
 * - Autoload Dependency Graph
 * - Cyclomatic Complexity Heatmap
 * - Code Duplication Finder
 */

import * as fs from "fs";
import * as path from "path";
import fg from "fast-glob";
import { Config } from "../utils/config.js";

export class AdvancedAnalyzer {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // ===========================================================================
  // SCENE TREE VISUALIZER
  // ===========================================================================

  /**
   * Generate a visual ASCII tree of a scene's node hierarchy
   */
  async visualizeSceneTree(args: { scene: string; depth?: number }): Promise<any> {
    const { scene, depth = 10 } = args;
    const scenePath = this.config.resolvePath(scene);

    if (!fs.existsSync(scenePath)) {
      return {
        content: [{ type: "text", text: `Scene not found: ${scene}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(scenePath, "utf-8");
    const nodes = this.parseSceneNodes(content);
    const tree = this.buildNodeTree(nodes, depth);
    const visualization = this.renderTree(tree);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          scene,
          total_nodes: nodes.length,
          tree: visualization,
          node_types: this.countNodeTypes(nodes),
          scripts: nodes.filter(n => n.script).map(n => ({ node: n.name, script: n.script })),
        }, null, 2),
      }],
    };
  }

  private parseSceneNodes(content: string): any[] {
    const nodes: any[] = [];
    const nodeRegex = /\[node name="([^"]+)" type="([^"]+)"(?: parent="([^"]+)")?\]/g;
    const scriptRegex = /script = ExtResource\("([^"]+)"\)/;

    let match;
    let currentNode: any = null;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const nodeMatch = line.match(/\[node name="([^"]+)" type="([^"]+)"(?: parent="([^"]+)")?\]/);
      if (nodeMatch) {
        currentNode = {
          name: nodeMatch[1],
          type: nodeMatch[2],
          parent: nodeMatch[3] || null,
          script: null,
        };
        nodes.push(currentNode);
      }

      if (currentNode && line.includes("script = ")) {
        const scriptMatch = line.match(/script = ExtResource\("([^"]+)"\)/);
        if (scriptMatch) {
          currentNode.script = scriptMatch[1];
        }
      }
    }

    return nodes;
  }

  private buildNodeTree(nodes: any[], maxDepth: number): any {
    const root = nodes.find(n => !n.parent);
    if (!root) return { name: "Empty Scene", children: [] };

    const buildChildren = (parentPath: string, depth: number): any[] => {
      if (depth >= maxDepth) return [];

      return nodes
        .filter(n => {
          if (parentPath === ".") return n.parent === ".";
          return n.parent === parentPath;
        })
        .map(n => ({
          name: n.name,
          type: n.type,
          script: n.script,
          children: buildChildren(parentPath === "." ? n.name : `${parentPath}/${n.name}`, depth + 1),
        }));
    };

    return {
      name: root.name,
      type: root.type,
      script: root.script,
      children: buildChildren(".", 1),
    };
  }

  private renderTree(node: any, prefix: string = "", isLast: boolean = true): string {
    const icon = this.getNodeIcon(node.type);
    const scriptIndicator = node.script ? " [S]" : "";
    let result = prefix + (isLast ? "└── " : "├── ") + `${icon} ${node.name} (${node.type})${scriptIndicator}\n`;

    if (node.children) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      node.children.forEach((child: any, index: number) => {
        result += this.renderTree(child, childPrefix, index === node.children.length - 1);
      });
    }

    return result;
  }

  private getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      Node2D: "🎮",
      Node3D: "🎲",
      Control: "🖼️",
      Sprite2D: "🖼️",
      AnimatedSprite2D: "🎬",
      CharacterBody2D: "🏃",
      RigidBody2D: "⚽",
      Area2D: "📦",
      CollisionShape2D: "⬡",
      Camera2D: "📷",
      CanvasLayer: "📐",
      Label: "🏷️",
      Button: "🔘",
      Panel: "📋",
      AudioStreamPlayer: "🔊",
      Timer: "⏱️",
      AnimationPlayer: "🎭",
      StateMachine: "🔄",
    };
    return icons[type] || "📄";
  }

  private countNodeTypes(nodes: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }
    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => b[1] - a[1])
    );
  }

  // ===========================================================================
  // DEAD CODE DETECTOR
  // ===========================================================================

  /**
   * Find potentially unused code in the project
   */
  async detectDeadCode(args: { path?: string }): Promise<any> {
    const searchPath = args.path || this.config.projectPath;
    const files = await fg("**/*.gd", { cwd: searchPath, absolute: true });

    const allFunctions: Map<string, { file: string; line: number; isPrivate: boolean }> = new Map();
    const allVariables: Map<string, { file: string; line: number; isPrivate: boolean }> = new Map();
    const allSignals: Map<string, { file: string; line: number }> = new Map();
    const usages: Set<string> = new Set();

    // Phase 1: Collect all definitions
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const relativePath = path.relative(searchPath, file);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Functions
        const funcMatch = line.match(/^func\s+(\w+)\s*\(/);
        if (funcMatch) {
          const name = funcMatch[1];
          // Skip virtual methods
          if (!name.startsWith("_ready") && !name.startsWith("_process") &&
              !name.startsWith("_physics") && !name.startsWith("_input") &&
              !name.startsWith("_enter") && !name.startsWith("_exit") &&
              !name.startsWith("_notification") && !name.startsWith("_init") &&
              !name.startsWith("_draw") && !name.startsWith("_gui") &&
              !name.startsWith("_get") && !name.startsWith("_set") &&
              !name.startsWith("_to_string")) {
            allFunctions.set(`${relativePath}::${name}`, {
              file: relativePath,
              line: i + 1,
              isPrivate: name.startsWith("_"),
            });
          }
        }

        // Variables (class-level only)
        const varMatch = line.match(/^(?:@export\s+)?var\s+(\w+)/);
        if (varMatch) {
          const varName = varMatch[1];
          allVariables.set(`${relativePath}::${varName}`, {
            file: relativePath,
            line: i + 1,
            isPrivate: varName.startsWith("_"),
          });
        }

        // Signals
        const signalMatch = line.match(/^signal\s+(\w+)/);
        if (signalMatch) {
          allSignals.set(`${relativePath}::${signalMatch[1]}`, {
            file: relativePath,
            line: i + 1,
          });
        }
      }
    }

    // Phase 2: Find all usages
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(searchPath, file);

      // Find function calls
      const funcCalls = content.matchAll(/(?<!func\s)(\w+)\s*\(/g);
      for (const match of funcCalls) {
        usages.add(match[1]);
      }

      // Find variable references
      const varRefs = content.matchAll(/(?<!var\s)(?<!func\s)(?<!\.)(\w+)(?=\s*[=\.\[\]]|\s+[^(])/g);
      for (const match of varRefs) {
        usages.add(match[1]);
      }

      // Find signal emissions and connections
      const signalUsages = content.matchAll(/(\w+)\.(?:emit|connect)/g);
      for (const match of signalUsages) {
        usages.add(match[1]);
      }
    }

    // Phase 3: Find potentially dead code
    const deadFunctions: any[] = [];
    const deadVariables: any[] = [];
    const deadSignals: any[] = [];

    for (const [key, value] of allFunctions) {
      const name = key.split("::")[1];
      if (!usages.has(name) && !name.startsWith("_on_")) {
        deadFunctions.push({ ...value, name });
      }
    }

    for (const [key, value] of allVariables) {
      const name = key.split("::")[1];
      if (!usages.has(name)) {
        deadVariables.push({ ...value, name });
      }
    }

    for (const [key, value] of allSignals) {
      const name = key.split("::")[1];
      if (!usages.has(name)) {
        deadSignals.push({ ...value, name });
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: {
            total_functions: allFunctions.size,
            potentially_dead_functions: deadFunctions.length,
            total_variables: allVariables.size,
            potentially_dead_variables: deadVariables.length,
            total_signals: allSignals.size,
            potentially_dead_signals: deadSignals.length,
          },
          dead_functions: deadFunctions.slice(0, 50),
          dead_variables: deadVariables.slice(0, 50),
          dead_signals: deadSignals.slice(0, 50),
          note: "These are POTENTIALLY dead - verify before removing. Signal handlers (_on_*) and virtual methods are excluded.",
        }, null, 2),
      }],
    };
  }

  // ===========================================================================
  // SIGNAL FLOW ANALYZER
  // ===========================================================================

  /**
   * Analyze signal connections and flow throughout the project
   */
  async analyzeSignalFlow(args: { file?: string }): Promise<any> {
    const searchPath = this.config.projectPath;
    const files = args.file
      ? [this.config.resolvePath(args.file)]
      : await fg("**/*.gd", { cwd: searchPath, absolute: true });

    const signals: any[] = [];
    const connections: any[] = [];
    const emissions: any[] = [];

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(searchPath, file);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Signal definitions
        const signalMatch = line.match(/^signal\s+(\w+)(?:\(([^)]*)\))?/);
        if (signalMatch) {
          signals.push({
            file: relativePath,
            line: i + 1,
            name: signalMatch[1],
            params: signalMatch[2] || "",
          });
        }

        // Signal connections (new style)
        const connectMatch = line.match(/(\w+)\.(\w+)\.connect\(([^)]+)\)/);
        if (connectMatch) {
          connections.push({
            file: relativePath,
            line: i + 1,
            source: connectMatch[1],
            signal: connectMatch[2],
            handler: connectMatch[3],
          });
        }

        // Signal connections (shorthand)
        const shortConnectMatch = line.match(/(\w+)\.connect\(([^)]+)\)/);
        if (shortConnectMatch && !connectMatch) {
          connections.push({
            file: relativePath,
            line: i + 1,
            signal: shortConnectMatch[1],
            handler: shortConnectMatch[2],
          });
        }

        // Signal emissions
        const emitMatch = line.match(/(\w+)\.emit\(([^)]*)\)/);
        if (emitMatch) {
          emissions.push({
            file: relativePath,
            line: i + 1,
            signal: emitMatch[1],
            args: emitMatch[2] || "",
          });
        }
      }
    }

    // Build signal flow graph
    const flowGraph: Record<string, { defined_in: string; connected_to: any[]; emitted_from: any[] }> = {};

    for (const signal of signals) {
      if (!flowGraph[signal.name]) {
        flowGraph[signal.name] = { defined_in: signal.file, connected_to: [], emitted_from: [] };
      }
    }

    for (const conn of connections) {
      const signalName = conn.signal;
      if (flowGraph[signalName]) {
        flowGraph[signalName].connected_to.push({
          file: conn.file,
          handler: conn.handler,
        });
      }
    }

    for (const emit of emissions) {
      if (flowGraph[emit.signal]) {
        flowGraph[emit.signal].emitted_from.push({
          file: emit.file,
          line: emit.line,
        });
      }
    }

    // Find orphan signals (defined but never connected or emitted)
    const orphanSignals = signals.filter(s => {
      const flow = flowGraph[s.name];
      return flow && flow.connected_to.length === 0 && flow.emitted_from.length === 0;
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: {
            total_signals_defined: signals.length,
            total_connections: connections.length,
            total_emissions: emissions.length,
            orphan_signals: orphanSignals.length,
          },
          signal_flow: flowGraph,
          orphan_signals: orphanSignals,
          all_connections: connections,
          all_emissions: emissions,
        }, null, 2),
      }],
    };
  }

  // ===========================================================================
  // PROJECT HEALTH DASHBOARD
  // ===========================================================================

  /**
   * Generate comprehensive project health metrics
   */
  async getProjectHealth(args: {}): Promise<any> {
    const projectPath = this.config.projectPath;

    // Gather metrics
    const gdFiles = await fg("**/*.gd", { cwd: projectPath, absolute: true });
    const tscnFiles = await fg("**/*.tscn", { cwd: projectPath, absolute: true });
    const tresFiles = await fg("**/*.tres", { cwd: projectPath, absolute: true });
    const testFiles = await fg("**/test_*.gd", { cwd: projectPath, absolute: true });

    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let typedFunctions = 0;
    let exportedVars = 0;
    let signalCount = 0;
    let todoCount = 0;
    let printStatements = 0;
    let utilityUsage = { UIStyleFactory: 0, AnimationEffects: 0, Constants: 0, NodeHelpers: 0 };
    let antiPatterns = { StyleBoxFlat: 0, print: 0, magic_numbers: 0 };

    for (const file of gdFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      totalLines += lines.length;

      // Count patterns
      totalFunctions += (content.match(/^func\s+/gm) || []).length;
      totalClasses += (content.match(/^class_name\s+/gm) || []).length;
      typedFunctions += (content.match(/^func\s+\w+\([^)]*\)\s*->/gm) || []).length;
      exportedVars += (content.match(/@export/g) || []).length;
      signalCount += (content.match(/^signal\s+/gm) || []).length;
      todoCount += (content.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
      printStatements += (content.match(/\bprint\(/g) || []).length;

      // Utility usage
      utilityUsage.UIStyleFactory += (content.match(/UIStyleFactory\./g) || []).length;
      utilityUsage.AnimationEffects += (content.match(/AnimationEffects\./g) || []).length;
      utilityUsage.Constants += (content.match(/Constants\./g) || []).length;
      utilityUsage.NodeHelpers += (content.match(/NodeHelpers\./g) || []).length;

      // Anti-patterns
      antiPatterns.StyleBoxFlat += (content.match(/StyleBoxFlat\.new\(/g) || []).length;
      antiPatterns.print += printStatements;
    }

    // Calculate scores
    const typeAnnotationScore = totalFunctions > 0 ? Math.round((typedFunctions / totalFunctions) * 100) : 100;
    const testCoverage = gdFiles.length > 0 ? Math.round((testFiles.length / gdFiles.length) * 100) : 0;
    const utilityScore = Math.min(100, (utilityUsage.UIStyleFactory + utilityUsage.AnimationEffects + utilityUsage.Constants) * 5);
    const antiPatternScore = Math.max(0, 100 - (antiPatterns.StyleBoxFlat * 10 + antiPatterns.print * 2));

    const overallHealth = Math.round(
      (typeAnnotationScore * 0.3) +
      (testCoverage * 0.2) +
      (utilityScore * 0.25) +
      (antiPatternScore * 0.25)
    );

    const healthGrade =
      overallHealth >= 90 ? "A" :
      overallHealth >= 80 ? "B" :
      overallHealth >= 70 ? "C" :
      overallHealth >= 60 ? "D" : "F";

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          overall_health: {
            score: overallHealth,
            grade: healthGrade,
            status: overallHealth >= 70 ? "HEALTHY" : "NEEDS ATTENTION",
          },
          metrics: {
            files: {
              scripts: gdFiles.length,
              scenes: tscnFiles.length,
              resources: tresFiles.length,
              tests: testFiles.length,
            },
            code: {
              total_lines: totalLines,
              total_functions: totalFunctions,
              total_classes: totalClasses,
              signals: signalCount,
              exports: exportedVars,
            },
            quality: {
              type_annotation_rate: `${typeAnnotationScore}%`,
              test_coverage_estimate: `${testCoverage}%`,
              utility_adoption: `${utilityScore}%`,
              anti_pattern_score: `${antiPatternScore}%`,
            },
          },
          utility_usage: utilityUsage,
          anti_patterns_found: antiPatterns,
          todos_found: todoCount,
          recommendations: this.generateHealthRecommendations(
            typeAnnotationScore, testCoverage, utilityScore, antiPatterns, todoCount
          ),
        }, null, 2),
      }],
    };
  }

  private generateHealthRecommendations(
    typeScore: number,
    testCoverage: number,
    utilityScore: number,
    antiPatterns: any,
    todoCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (typeScore < 80) {
      recommendations.push(`Add return type annotations - currently ${typeScore}% of functions are typed`);
    }
    if (testCoverage < 30) {
      recommendations.push(`Increase test coverage - only ${testCoverage}% of files have tests`);
    }
    if (utilityScore < 50) {
      recommendations.push("Use UIStyleFactory, AnimationEffects, and Constants utilities more");
    }
    if (antiPatterns.StyleBoxFlat > 0) {
      recommendations.push(`Replace ${antiPatterns.StyleBoxFlat} StyleBoxFlat.new() calls with UIStyleFactory`);
    }
    if (antiPatterns.print > 20) {
      recommendations.push(`Replace ${antiPatterns.print} print() statements with ErrorLogger`);
    }
    if (todoCount > 10) {
      recommendations.push(`Address ${todoCount} TODO/FIXME comments in the codebase`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Project is in excellent health.");
    }

    return recommendations;
  }

  // ===========================================================================
  // AUTOLOAD DEPENDENCY GRAPH
  // ===========================================================================

  /**
   * Analyze autoload dependencies and generate a dependency graph
   */
  async analyzeAutoloads(args: {}): Promise<any> {
    const projectPath = this.config.projectPath;
    const projectFile = path.join(projectPath, "project.godot");

    if (!fs.existsSync(projectFile)) {
      return {
        content: [{ type: "text", text: "project.godot not found" }],
        isError: true,
      };
    }

    const projectContent = fs.readFileSync(projectFile, "utf-8");
    const autoloads: any[] = [];

    // Parse autoloads from project.godot
    const autoloadSection = projectContent.match(/\[autoload\]([\s\S]*?)(?=\[|$)/);
    if (autoloadSection) {
      const lines = autoloadSection[1].split("\n");
      for (const line of lines) {
        const match = line.match(/(\w+)="?\*?res:\/\/([^"]+)\.gd"?/);
        if (match) {
          autoloads.push({
            name: match[1],
            path: `res://${match[2]}.gd`,
            file: path.join(projectPath, match[2] + ".gd"),
          });
        }
      }
    }

    // Analyze dependencies for each autoload
    const dependencies: Record<string, string[]> = {};
    const dependents: Record<string, string[]> = {};

    for (const autoload of autoloads) {
      dependencies[autoload.name] = [];
      dependents[autoload.name] = [];

      if (fs.existsSync(autoload.file)) {
        const content = fs.readFileSync(autoload.file, "utf-8");

        // Check for references to other autoloads
        for (const other of autoloads) {
          if (other.name !== autoload.name) {
            const regex = new RegExp(`\\b${other.name}\\b`, "g");
            if (regex.test(content)) {
              dependencies[autoload.name].push(other.name);
              dependents[other.name].push(autoload.name);
            }
          }
        }
      }
    }

    // Detect circular dependencies
    const circularDeps: string[][] = [];
    for (const autoload of autoloads) {
      for (const dep of dependencies[autoload.name]) {
        if (dependencies[dep]?.includes(autoload.name)) {
          const pair = [autoload.name, dep].sort();
          if (!circularDeps.some(c => c[0] === pair[0] && c[1] === pair[1])) {
            circularDeps.push(pair);
          }
        }
      }
    }

    // Generate ASCII graph
    let graph = "AUTOLOAD DEPENDENCY GRAPH\n";
    graph += "=".repeat(40) + "\n\n";
    for (const autoload of autoloads) {
      graph += `📦 ${autoload.name}\n`;
      if (dependencies[autoload.name].length > 0) {
        graph += `   └── depends on: ${dependencies[autoload.name].join(", ")}\n`;
      }
      if (dependents[autoload.name].length > 0) {
        graph += `   └── used by: ${dependents[autoload.name].join(", ")}\n`;
      }
      graph += "\n";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          autoloads: autoloads.map(a => ({ name: a.name, path: a.path })),
          dependencies,
          dependents,
          circular_dependencies: circularDeps,
          warning: circularDeps.length > 0 ? "CIRCULAR DEPENDENCIES DETECTED!" : null,
          graph,
          load_order_suggestion: this.suggestLoadOrder(autoloads, dependencies),
        }, null, 2),
      }],
    };
  }

  private suggestLoadOrder(autoloads: any[], deps: Record<string, string[]>): string[] {
    // Topological sort
    const order: string[] = [];
    const visited: Set<string> = new Set();
    const temp: Set<string> = new Set();

    const visit = (name: string) => {
      if (temp.has(name)) return; // circular
      if (visited.has(name)) return;

      temp.add(name);
      for (const dep of deps[name] || []) {
        visit(dep);
      }
      temp.delete(name);
      visited.add(name);
      order.unshift(name);
    };

    for (const autoload of autoloads) {
      visit(autoload.name);
    }

    return order;
  }

  // ===========================================================================
  // CODE DUPLICATION FINDER
  // ===========================================================================

  /**
   * Find potential code duplication across the project
   */
  async findDuplication(args: { min_lines?: number }): Promise<any> {
    const minLines = args.min_lines || 5;
    const projectPath = this.config.projectPath;
    const files = await fg("**/*.gd", { cwd: projectPath, absolute: true });

    const codeBlocks: Map<string, { file: string; line: number; code: string }[]> = new Map();

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const relativePath = path.relative(projectPath, file);

      // Extract function bodies
      let inFunction = false;
      let functionStart = 0;
      let functionLines: string[] = [];
      let indentLevel = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith("func ")) {
          inFunction = true;
          functionStart = i;
          functionLines = [trimmed];
          indentLevel = line.search(/\S/);
        } else if (inFunction) {
          const currentIndent = line.search(/\S/);
          if (trimmed && currentIndent <= indentLevel && !trimmed.startsWith("#")) {
            // End of function
            if (functionLines.length >= minLines) {
              const normalized = this.normalizeCode(functionLines);
              const hash = this.hashCode(normalized);

              if (!codeBlocks.has(hash)) {
                codeBlocks.set(hash, []);
              }
              codeBlocks.get(hash)!.push({
                file: relativePath,
                line: functionStart + 1,
                code: functionLines.join("\n"),
              });
            }
            inFunction = false;
            functionLines = [];
          } else {
            functionLines.push(trimmed);
          }
        }
      }
    }

    // Find duplicates
    const duplicates: any[] = [];
    for (const [hash, locations] of codeBlocks) {
      if (locations.length > 1) {
        duplicates.push({
          occurrences: locations.length,
          locations: locations.map(l => ({ file: l.file, line: l.line })),
          sample: locations[0].code.slice(0, 200) + (locations[0].code.length > 200 ? "..." : ""),
        });
      }
    }

    // Sort by occurrence count
    duplicates.sort((a, b) => b.occurrences - a.occurrences);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: {
            total_duplicates_found: duplicates.length,
            files_analyzed: files.length,
            min_lines_threshold: minLines,
          },
          duplicates: duplicates.slice(0, 20),
          recommendation: duplicates.length > 0
            ? "Consider extracting duplicated code into utility functions"
            : "No significant duplication found",
        }, null, 2),
      }],
    };
  }

  private normalizeCode(lines: string[]): string {
    return lines
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => l.replace(/\s+/g, " "))
      .map(l => l.replace(/"[^"]*"/g, '""'))  // Normalize strings
      .map(l => l.replace(/\d+/g, "N"))       // Normalize numbers
      .join("\n");
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // ===========================================================================
  // COMPLEXITY HEATMAP
  // ===========================================================================

  /**
   * Generate a complexity heatmap of the codebase
   */
  async getComplexityHeatmap(args: {}): Promise<any> {
    const projectPath = this.config.projectPath;
    const files = await fg("**/*.gd", { cwd: projectPath, absolute: true });

    const fileComplexities: any[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(projectPath, file);
      const functions = this.analyzeFunctionComplexity(content);

      const avgComplexity = functions.length > 0
        ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length
        : 0;

      const maxComplexity = functions.length > 0
        ? Math.max(...functions.map(f => f.complexity))
        : 0;

      fileComplexities.push({
        file: relativePath,
        functions: functions.length,
        avg_complexity: Math.round(avgComplexity * 10) / 10,
        max_complexity: maxComplexity,
        hotspots: functions.filter(f => f.complexity > 10),
      });
    }

    // Sort by max complexity
    fileComplexities.sort((a, b) => b.max_complexity - a.max_complexity);

    // Generate heatmap visualization
    let heatmap = "COMPLEXITY HEATMAP\n";
    heatmap += "=".repeat(60) + "\n\n";

    for (const file of fileComplexities.slice(0, 20)) {
      const bar = "█".repeat(Math.min(file.max_complexity, 30));
      const color = file.max_complexity > 15 ? "🔴" : file.max_complexity > 10 ? "🟡" : "🟢";
      heatmap += `${color} ${bar} ${file.max_complexity} - ${file.file}\n`;
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: {
            total_files: fileComplexities.length,
            high_complexity_files: fileComplexities.filter(f => f.max_complexity > 15).length,
            medium_complexity_files: fileComplexities.filter(f => f.max_complexity > 10 && f.max_complexity <= 15).length,
          },
          heatmap,
          top_complex_files: fileComplexities.slice(0, 10),
          all_hotspots: fileComplexities
            .flatMap(f => f.hotspots.map((h: any) => ({ ...h, file: f.file })))
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 20),
        }, null, 2),
      }],
    };
  }

  private analyzeFunctionComplexity(content: string): any[] {
    const functions: any[] = [];
    const lines = content.split("\n");

    let currentFunc: { name: string; startLine: number; complexity: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const funcMatch = trimmed.match(/^func\s+(\w+)/);
      if (funcMatch) {
        if (currentFunc) {
          functions.push(currentFunc);
        }
        currentFunc = { name: funcMatch[1], startLine: i + 1, complexity: 1 };
      }

      if (currentFunc) {
        // Count complexity contributors
        if (/\bif\b/.test(trimmed)) currentFunc.complexity++;
        if (/\belif\b/.test(trimmed)) currentFunc.complexity++;
        if (/\belse\b/.test(trimmed)) currentFunc.complexity++;
        if (/\bfor\b/.test(trimmed)) currentFunc.complexity++;
        if (/\bwhile\b/.test(trimmed)) currentFunc.complexity++;
        if (/\bmatch\b/.test(trimmed)) currentFunc.complexity++;
        if (/\band\b/.test(trimmed)) currentFunc.complexity++;
        if (/\bor\b/.test(trimmed)) currentFunc.complexity++;
        if (/\?\s*[^:]+\s*:/.test(trimmed)) currentFunc.complexity++; // ternary
      }
    }

    if (currentFunc) {
      functions.push(currentFunc);
    }

    return functions;
  }
}
