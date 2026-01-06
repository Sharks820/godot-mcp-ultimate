/**
 * Code Quality Checker
 * Integrates gdlint, gdformat, gdradon, and custom pattern checking
 */

import * as fs from "fs";
import * as path from "path";
import { spawn, execSync } from "child_process";
import { Config } from "../utils/config.js";
import fg from "fast-glob";

interface LintIssue {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

interface ComplexityResult {
  function: string;
  complexity: number;
  line: number;
  grade: string;
}

export class QualityChecker {
  private config: Config;
  private toolsAvailable: { gdlint: boolean; gdformat: boolean; gdparse: boolean } = {
    gdlint: false,
    gdformat: false,
    gdparse: false,
  };

  constructor(config: Config) {
    this.config = config;
    this.checkTools();
  }

  private async checkTools(): Promise<void> {
    try {
      execSync("gdlint --version", { stdio: "pipe" });
      this.toolsAvailable.gdlint = true;
    } catch {
      this.toolsAvailable.gdlint = false;
    }

    try {
      execSync("gdformat --version", { stdio: "pipe" });
      this.toolsAvailable.gdformat = true;
    } catch {
      this.toolsAvailable.gdformat = false;
    }

    try {
      execSync("gdparse --version", { stdio: "pipe" });
      this.toolsAvailable.gdparse = true;
    } catch {
      this.toolsAvailable.gdparse = false;
    }
  }

  // ==========================================================================
  // LINTING
  // ==========================================================================

  /**
   * Lint a single file
   */
  async lintFile(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    if (this.toolsAvailable.gdlint) {
      return this.runGdlint([filePath]);
    }

    // Fallback: basic manual lint
    return this.manualLint(filePath);
  }

  /**
   * Lint entire project
   */
  async lintProject(args: { path?: string; config?: any }): Promise<any> {
    const targetPath = args.path
      ? this.config.resolvePath(args.path)
      : this.config.projectPath;

    const files = await fg(["**/*.gd"], {
      cwd: targetPath,
      ignore: ["**/addons/**"],
      absolute: true,
    });

    if (files.length === 0) {
      return {
        content: [{ type: "text", text: "No GDScript files found" }],
      };
    }

    if (this.toolsAvailable.gdlint) {
      return this.runGdlint(files);
    }

    // Fallback: lint each file manually
    const allIssues: LintIssue[] = [];
    for (const file of files) {
      const result = await this.manualLint(file);
      const issues = JSON.parse(result.content[0].text);
      allIssues.push(...issues);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_files: files.length,
              total_issues: allIssues.length,
              issues: allIssues,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async runGdlint(files: string[]): Promise<any> {
    return new Promise((resolve) => {
      const proc = spawn("gdlint", files, { shell: true });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => (stdout += data.toString()));
      proc.stderr.on("data", (data) => (stderr += data.toString()));

      proc.on("close", () => {
        const issues = this.parseGdlintOutput(stdout + stderr);
        resolve({
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "gdlint",
                  total_issues: issues.length,
                  issues,
                },
                null,
                2
              ),
            },
          ],
        });
      });

      proc.on("error", () => {
        resolve({
          content: [{ type: "text", text: "gdlint execution failed" }],
          isError: true,
        });
      });
    });
  }

  private parseGdlintOutput(output: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const lines = output.split("\n");

    // Format: path/to/file.gd:10:5: Error: message (code)
    const regex = /^(.+):(\d+):(\d+):\s*(Error|Warning):\s*(.+?)\s*\((\w+)\)/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        issues.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          severity: match[4].toLowerCase() as "error" | "warning",
          message: match[5],
          code: match[6],
        });
      }
    }

    return issues;
  }

  private async manualLint(filePath: string): Promise<any> {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const issues: LintIssue[] = [];
    const relativePath = path.relative(this.config.projectPath, filePath);

    // Check patterns
    const patterns = [
      {
        regex: /StyleBoxFlat\.new\(\)/,
        code: "UTIL001",
        message: "Use UIStyleFactory instead of StyleBoxFlat.new()",
        severity: "warning" as const,
      },
      {
        regex: /\.queue_free\(\)(?!.*is_instance_valid)/,
        code: "UTIL002",
        message: "Consider using NodeHelpers.safe_free() for safe cleanup",
        severity: "info" as const,
      },
      {
        regex: /"\d+\/\d+"\s*%/,
        code: "UTIL003",
        message: "Consider using StringHelpers.format_hp() or similar",
        severity: "info" as const,
      },
      {
        regex: /\bawait\s+get_tree\(\)\.create_timer\([0-9.]+\)/,
        code: "CONST001",
        message: "Use Constants.WAIT_* instead of magic number delays",
        severity: "warning" as const,
      },
      {
        regex: /\bColor\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+/,
        code: "CONST002",
        message: "Consider using UIStyleFactory.COLOR_* constants",
        severity: "info" as const,
      },
      {
        regex: /\bprint\(/,
        code: "DEBUG001",
        message: "Use ErrorLogger instead of print() for production code",
        severity: "info" as const,
      },
      {
        regex: /^func\s+_\w+\([^)]*\)\s*->\s*void:$/m,
        code: "STYLE001",
        message: "Good: Return type annotation present",
        severity: "info" as const,
        positive: true,
      },
      {
        regex: /\btween_property\([^,]+,\s*"[^"]+",\s*[^,]+,\s*[\d.]+\)/,
        code: "ANIM001",
        message: "Consider using AnimationEffects utility for common animations",
        severity: "info" as const,
      },
      {
        regex: /@onready\s+var\s+\w+\s*=\s*\$/,
        code: "STYLE002",
        message: "Good: Using @onready for node references",
        severity: "info" as const,
        positive: true,
      },
      {
        regex: /^\s{0,}func\s+\w+\([^)]*\)(?!\s*->)/m,
        code: "TYPE001",
        message: "Consider adding return type annotation",
        severity: "info" as const,
      },
    ];

    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        if (pattern.regex.test(line) && !(pattern as any).positive) {
          issues.push({
            file: relativePath,
            line: index + 1,
            column: 1,
            code: pattern.code,
            message: pattern.message,
            severity: pattern.severity,
          });
        }
      }

      // Check line length
      if (line.length > 120) {
        issues.push({
          file: relativePath,
          line: index + 1,
          column: 121,
          code: "LINE001",
          message: `Line too long (${line.length} > 120 characters)`,
          severity: "warning",
        });
      }

      // Check for tabs vs spaces consistency
      if (line.match(/^\t+ /) || line.match(/^ +\t/)) {
        issues.push({
          file: relativePath,
          line: index + 1,
          column: 1,
          code: "INDENT001",
          message: "Mixed tabs and spaces in indentation",
          severity: "warning",
        });
      }
    });

    return {
      content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
    };
  }

  // ==========================================================================
  // FORMATTING
  // ==========================================================================

  /**
   * Format a file
   */
  async formatFile(args: { file: string; dry_run?: boolean }): Promise<any> {
    const { file, dry_run = true } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    if (!this.toolsAvailable.gdformat) {
      return {
        content: [
          {
            type: "text",
            text: "gdformat not available. Install gdtoolkit: pip install gdtoolkit",
          },
        ],
        isError: true,
      };
    }

    return new Promise((resolve) => {
      const args = dry_run ? ["--check", "--diff", filePath] : [filePath];
      const proc = spawn("gdformat", args, { shell: true });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => (stdout += data.toString()));
      proc.stderr.on("data", (data) => (stderr += data.toString()));

      proc.on("close", (code) => {
        if (dry_run) {
          resolve({
            content: [
              {
                type: "text",
                text: code === 0
                  ? "File is already properly formatted"
                  : `Formatting changes needed:\n${stdout}\n${stderr}`,
              },
            ],
          });
        } else {
          resolve({
            content: [
              {
                type: "text",
                text: code === 0
                  ? "File formatted successfully"
                  : `Formatting failed:\n${stderr}`,
              },
            ],
            isError: code !== 0,
          });
        }
      });
    });
  }

  // ==========================================================================
  // COMPLEXITY
  // ==========================================================================

  /**
   * Get cyclomatic complexity
   */
  async getComplexity(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    // Manual complexity analysis (gdradon may not be installed)
    const content = fs.readFileSync(filePath, "utf-8");
    const results = this.calculateComplexity(content);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              file: path.relative(this.config.projectPath, filePath),
              functions: results,
              summary: {
                total_functions: results.length,
                average_complexity: results.length > 0
                  ? (results.reduce((sum, r) => sum + r.complexity, 0) / results.length).toFixed(2)
                  : 0,
                high_complexity: results.filter((r) => r.complexity > 10).length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private calculateComplexity(content: string): ComplexityResult[] {
    const results: ComplexityResult[] = [];
    const lines = content.split("\n");

    let currentFunc: { name: string; line: number; complexity: number } | null = null;
    let braceDepth = 0;
    let inFunction = false;

    const complexityKeywords = [
      /\bif\s/,
      /\belif\s/,
      /\belse:/,
      /\bfor\s/,
      /\bwhile\s/,
      /\bmatch\s/,
      /\band\s/,
      /\bor\s/,
      /\?\s/,  // Ternary
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Function start
      const funcMatch = trimmed.match(/^func\s+(\w+)/);
      if (funcMatch) {
        if (currentFunc) {
          results.push({
            function: currentFunc.name,
            line: currentFunc.line,
            complexity: currentFunc.complexity,
            grade: this.getComplexityGrade(currentFunc.complexity),
          });
        }
        currentFunc = {
          name: funcMatch[1],
          line: i + 1,
          complexity: 1, // Base complexity
        };
        inFunction = true;
        continue;
      }

      // Check for complexity-adding constructs
      if (currentFunc && inFunction) {
        for (const keyword of complexityKeywords) {
          if (keyword.test(line)) {
            currentFunc.complexity++;
          }
        }
      }
    }

    // Don't forget the last function
    if (currentFunc) {
      results.push({
        function: currentFunc.name,
        line: currentFunc.line,
        complexity: currentFunc.complexity,
        grade: this.getComplexityGrade(currentFunc.complexity),
      });
    }

    return results;
  }

  private getComplexityGrade(complexity: number): string {
    if (complexity <= 5) return "A (simple)";
    if (complexity <= 10) return "B (moderate)";
    if (complexity <= 20) return "C (complex)";
    if (complexity <= 30) return "D (very complex)";
    return "F (untestable)";
  }

  // ==========================================================================
  // PATTERN CHECKING
  // ==========================================================================

  /**
   * Check code against patterns
   */
  async checkPatterns(args: { file: string; patterns?: string[] }): Promise<any> {
    const { file, patterns } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const checks = this.runPatternChecks(content, filePath, patterns);

    return {
      content: [{ type: "text", text: JSON.stringify(checks, null, 2) }],
    };
  }

  private runPatternChecks(
    content: string,
    filePath: string,
    specificPatterns?: string[]
  ): any {
    const allPatterns = {
      // CLAUDE.md utility rules
      utility_usage: {
        check: () => this.checkUtilityUsage(content),
        description: "Check for proper utility class usage",
      },
      // Magic numbers
      magic_numbers: {
        check: () => this.checkMagicNumbers(content),
        description: "Check for hardcoded magic numbers",
      },
      // Signal naming
      signal_naming: {
        check: () => this.checkSignalNaming(content),
        description: "Check signal naming conventions",
      },
      // Error handling
      error_handling: {
        check: () => this.checkErrorHandling(content),
        description: "Check for proper error handling",
      },
      // Node references
      node_references: {
        check: () => this.checkNodeReferences(content),
        description: "Check node reference patterns",
      },
    };

    const results: any = {
      file: path.relative(this.config.projectPath, filePath),
      patterns_checked: [],
      issues: [],
      suggestions: [],
    };

    const patternsToCheck = specificPatterns || Object.keys(allPatterns);

    for (const patternName of patternsToCheck) {
      const pattern = (allPatterns as any)[patternName];
      if (pattern) {
        results.patterns_checked.push(patternName);
        const checkResult = pattern.check();
        results.issues.push(...checkResult.issues);
        results.suggestions.push(...checkResult.suggestions);
      }
    }

    return results;
  }

  private checkUtilityUsage(content: string): { issues: any[]; suggestions: any[] } {
    const issues: any[] = [];
    const suggestions: any[] = [];
    const lines = content.split("\n");

    const utilityPatterns = [
      {
        bad: /StyleBoxFlat\.new\(\)/,
        good: "UIStyleFactory.create_*",
        utility: "UIStyleFactory",
      },
      {
        bad: /create_tween\(\)\.tween_property/,
        good: "AnimationEffects.fade_in/slide_in/etc",
        utility: "AnimationEffects",
        note: "For common animation patterns",
      },
      {
        bad: /is_instance_valid\([^)]+\)\s*:\s*[^.]+\.queue_free/,
        good: "NodeHelpers.safe_free()",
        utility: "NodeHelpers",
      },
    ];

    lines.forEach((line, i) => {
      for (const pattern of utilityPatterns) {
        if (pattern.bad.test(line)) {
          suggestions.push({
            line: i + 1,
            current: line.trim(),
            suggestion: `Consider using ${pattern.good}`,
            utility: pattern.utility,
            note: pattern.note,
          });
        }
      }
    });

    return { issues, suggestions };
  }

  private checkMagicNumbers(content: string): { issues: any[]; suggestions: any[] } {
    const issues: any[] = [];
    const suggestions: any[] = [];
    const lines = content.split("\n");

    // Common magic numbers in game dev
    const magicPatterns = [
      { regex: /create_timer\(([0-9.]+)\)/, context: "timer duration" },
      { regex: /tween_property\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/, context: "tween duration" },
      { regex: /Vector2\((\d+),\s*(\d+)\)/, context: "position/size" },
    ];

    lines.forEach((line, i) => {
      // Skip const declarations
      if (line.trim().startsWith("const ")) return;

      for (const pattern of magicPatterns) {
        const match = line.match(pattern.regex);
        if (match && match[1] && !line.includes("Constants.")) {
          suggestions.push({
            line: i + 1,
            type: "magic_number",
            value: match[1],
            context: pattern.context,
            suggestion: `Consider using a constant from Constants.gd for ${pattern.context}`,
          });
        }
      }
    });

    return { issues, suggestions };
  }

  private checkSignalNaming(content: string): { issues: any[]; suggestions: any[] } {
    const issues: any[] = [];
    const suggestions: any[] = [];
    const lines = content.split("\n");

    lines.forEach((line, i) => {
      const signalMatch = line.match(/^signal\s+(\w+)/);
      if (signalMatch) {
        const signalName = signalMatch[1];
        // Signal should be past tense or describe an event
        if (!signalName.match(/(ed|_changed|_updated|_pressed|_entered|_exited|_finished|_started|_completed|_requested)$/)) {
          suggestions.push({
            line: i + 1,
            signal: signalName,
            suggestion: "Signal names should typically be past tense or describe an event (e.g., 'health_changed', 'attack_finished')",
          });
        }
      }
    });

    return { issues, suggestions };
  }

  private checkErrorHandling(content: string): { issues: any[]; suggestions: any[] } {
    const issues: any[] = [];
    const suggestions: any[] = [];
    const lines = content.split("\n");

    // Check for common error-prone patterns
    const errorPatterns = [
      {
        regex: /\.get\([^)]+\)/,
        suggestion: "Consider using .get() with a default value or checking existence",
      },
      {
        regex: /\$[A-Z]\w+(?!\s*(?:==|!=)\s*null)/,
        suggestion: "Consider null checking node paths that might not exist",
      },
    ];

    lines.forEach((line, i) => {
      // Skip comments
      if (line.trim().startsWith("#")) return;

      for (const pattern of errorPatterns) {
        if (pattern.regex.test(line)) {
          // Only suggest for non-trivial cases
          if (!line.includes("if ") && !line.includes("assert")) {
            suggestions.push({
              line: i + 1,
              code: line.trim().substring(0, 60),
              suggestion: pattern.suggestion,
            });
          }
        }
      }
    });

    return { issues, suggestions };
  }

  private checkNodeReferences(content: string): { issues: any[]; suggestions: any[] } {
    const issues: any[] = [];
    const suggestions: any[] = [];
    const lines = content.split("\n");

    let hasOnready = false;
    let hasDirectNodePath = false;

    lines.forEach((line, i) => {
      if (line.includes("@onready")) {
        hasOnready = true;
      }

      // Direct node path access in non-onready context
      if (line.match(/\$\w+/) && !line.includes("@onready") && !line.trim().startsWith("#")) {
        // Check if inside a function
        if (!hasOnready && line.includes("func ")) {
          suggestions.push({
            line: i + 1,
            code: line.trim(),
            suggestion: "Consider caching node references with @onready var for better performance",
          });
        }
      }
    });

    return { issues, suggestions };
  }

  // ==========================================================================
  // AST PARSING
  // ==========================================================================

  /**
   * Parse AST
   */
  async parseAST(args: { file: string; format?: string }): Promise<any> {
    const { file, format = "json" } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    if (this.toolsAvailable.gdparse) {
      return new Promise((resolve) => {
        const proc = spawn("gdparse", [filePath], { shell: true });
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => (stdout += data.toString()));
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
          if (code === 0) {
            resolve({
              content: [{ type: "text", text: stdout }],
            });
          } else {
            resolve({
              content: [{ type: "text", text: `Parse error:\n${stderr}` }],
              isError: true,
            });
          }
        });
      });
    }

    // Fallback: basic structure analysis
    const content = fs.readFileSync(filePath, "utf-8");
    const structure = this.analyzeStructure(content);

    return {
      content: [{ type: "text", text: JSON.stringify(structure, null, 2) }],
    };
  }

  private analyzeStructure(content: string): any {
    const structure: any = {
      class_name: null,
      extends: null,
      signals: [],
      constants: [],
      exports: [],
      onready_vars: [],
      variables: [],
      functions: [],
    };

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Class name
      const classMatch = trimmed.match(/^class_name\s+(\w+)/);
      if (classMatch) {
        structure.class_name = classMatch[1];
        continue;
      }

      // Extends
      const extendsMatch = trimmed.match(/^extends\s+(\w+)/);
      if (extendsMatch) {
        structure.extends = extendsMatch[1];
        continue;
      }

      // Signals
      const signalMatch = trimmed.match(/^signal\s+(\w+)(?:\(([^)]*)\))?/);
      if (signalMatch) {
        structure.signals.push({
          name: signalMatch[1],
          parameters: signalMatch[2] || "",
          line: i + 1,
        });
        continue;
      }

      // Constants
      const constMatch = trimmed.match(/^const\s+(\w+)\s*(?::\s*(\w+))?\s*=\s*(.+)/);
      if (constMatch) {
        structure.constants.push({
          name: constMatch[1],
          type: constMatch[2] || "inferred",
          value: constMatch[3],
          line: i + 1,
        });
        continue;
      }

      // Exports
      const exportMatch = trimmed.match(/^@export(?:_\w+)?\s+var\s+(\w+)/);
      if (exportMatch) {
        structure.exports.push({
          name: exportMatch[1],
          line: i + 1,
        });
        continue;
      }

      // Onready
      const onreadyMatch = trimmed.match(/^@onready\s+var\s+(\w+)/);
      if (onreadyMatch) {
        structure.onready_vars.push({
          name: onreadyMatch[1],
          line: i + 1,
        });
        continue;
      }

      // Variables
      const varMatch = trimmed.match(/^var\s+(\w+)/);
      if (varMatch && !trimmed.startsWith("@")) {
        structure.variables.push({
          name: varMatch[1],
          line: i + 1,
        });
        continue;
      }

      // Functions
      const funcMatch = trimmed.match(/^func\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?/);
      if (funcMatch) {
        structure.functions.push({
          name: funcMatch[1],
          parameters: funcMatch[2],
          return_type: funcMatch[3] || "void",
          line: i + 1,
        });
        continue;
      }
    }

    return structure;
  }

  // ==========================================================================
  // PROJECT VALIDATION
  // ==========================================================================

  /**
   * Validate entire project
   */
  async validateProject(args: { checks?: string[] }): Promise<any> {
    const checks = args.checks || ["scripts", "scenes", "resources", "references"];
    const results: any = {
      valid: true,
      checks_run: checks,
      issues: [],
      warnings: [],
      summary: {},
    };

    for (const check of checks) {
      switch (check) {
        case "scripts":
          await this.validateScripts(results);
          break;
        case "scenes":
          await this.validateScenes(results);
          break;
        case "resources":
          await this.validateResources(results);
          break;
        case "references":
          await this.validateReferences(results);
          break;
      }
    }

    results.valid = results.issues.length === 0;
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }

  private async validateScripts(results: any): Promise<void> {
    const scripts = await fg(["**/*.gd"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    results.summary.scripts = { total: scripts.length, errors: 0 };

    for (const script of scripts) {
      const filePath = path.join(this.config.projectPath, script);
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for basic syntax issues
      if (content.includes("extends") && !content.match(/^extends\s+\w+/m)) {
        results.issues.push({
          type: "script",
          file: script,
          message: "Invalid extends statement",
        });
        results.summary.scripts.errors++;
      }

      // Check for unclosed brackets (basic check)
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        results.warnings.push({
          type: "script",
          file: script,
          message: `Mismatched parentheses: ${openParens} open, ${closeParens} close`,
        });
      }
    }
  }

  private async validateScenes(results: any): Promise<void> {
    const scenes = await fg(["**/*.tscn"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    results.summary.scenes = { total: scenes.length, errors: 0 };

    for (const scene of scenes) {
      const filePath = path.join(this.config.projectPath, scene);
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for broken resource references
      const extResources = content.matchAll(/\[ext_resource[^\]]*path="([^"]+)"[^\]]*\]/g);
      for (const match of extResources) {
        const resourcePath = match[1];
        const resolvedPath = this.config.fromResPath(resourcePath);
        if (!fs.existsSync(resolvedPath)) {
          results.issues.push({
            type: "scene",
            file: scene,
            message: `Missing resource: ${resourcePath}`,
          });
          results.summary.scenes.errors++;
        }
      }
    }
  }

  private async validateResources(results: any): Promise<void> {
    const resources = await fg(["**/*.tres", "**/*.res"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    results.summary.resources = { total: resources.length, errors: 0 };

    for (const resource of resources) {
      const filePath = path.join(this.config.projectPath, resource);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        // Check for broken script references in .tres files
        if (content.includes('type="Script"')) {
          const scriptMatch = content.match(/path="([^"]+)"/);
          if (scriptMatch) {
            const scriptPath = this.config.fromResPath(scriptMatch[1]);
            if (!fs.existsSync(scriptPath)) {
              results.issues.push({
                type: "resource",
                file: resource,
                message: `Missing script: ${scriptMatch[1]}`,
              });
              results.summary.resources.errors++;
            }
          }
        }
      } catch (e) {
        results.warnings.push({
          type: "resource",
          file: resource,
          message: `Could not parse resource file`,
        });
      }
    }
  }

  private async validateReferences(results: any): Promise<void> {
    // Check for preload/load references to missing files
    const scripts = await fg(["**/*.gd"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    let brokenRefs = 0;

    for (const script of scripts) {
      const filePath = path.join(this.config.projectPath, script);
      const content = fs.readFileSync(filePath, "utf-8");

      const preloadMatches = content.matchAll(/(?:preload|load)\("([^"]+)"\)/g);
      for (const match of preloadMatches) {
        const refPath = match[1];
        const resolvedPath = this.config.fromResPath(refPath);
        if (!fs.existsSync(resolvedPath)) {
          results.issues.push({
            type: "reference",
            file: script,
            message: `Broken reference: ${refPath}`,
          });
          brokenRefs++;
        }
      }
    }

    results.summary.references = { broken: brokenRefs };
  }
}
