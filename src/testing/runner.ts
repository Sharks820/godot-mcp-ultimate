/**
 * GdUnit4 Test Runner Integration
 * Run tests, generate test stubs, get coverage
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { Config } from "../utils/config.js";
import fg from "fast-glob";

interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration?: number;
  message?: string;
  stack?: string;
}

interface TestSuiteResult {
  suite: string;
  file: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export class TestRunner {
  private config: Config;
  private gdunitPath: string | null = null;

  constructor(config: Config) {
    this.config = config;
    this.detectGdUnit();
  }

  private detectGdUnit(): void {
    const possiblePaths = [
      path.join(this.config.projectPath, "addons", "gdUnit4"),
      path.join(this.config.projectPath, "addons", "GdUnit4"),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.gdunitPath = p;
        break;
      }
    }
  }

  // ==========================================================================
  // TEST EXECUTION
  // ==========================================================================

  /**
   * Run tests
   */
  async runTests(args: {
    path?: string;
    filter?: string;
    continue_on_failure?: boolean;
    timeout?: number;
  }): Promise<any> {
    const { path: testPath, filter, continue_on_failure = true, timeout = 300000 } = args; // 5 min default timeout

    if (!this.gdunitPath) {
      return {
        content: [
          {
            type: "text",
            text: "GdUnit4 not found. Install it from AssetLib or https://github.com/MikeSchulze/gdUnit4",
          },
        ],
        isError: true,
      };
    }

    // Build command
    const godotPath = this.config.godotPath;
    const projectPath = this.config.projectPath;
    const cmdArgs = [
      "--headless",
      "--path",
      projectPath,
      "-s",
      "res://addons/gdUnit4/bin/GdUnitCmdTool.gd",
    ];

    if (testPath) {
      cmdArgs.push("-a", testPath);
    }

    if (filter) {
      cmdArgs.push("-f", filter);
    }

    if (continue_on_failure) {
      cmdArgs.push("-c");
    }

    return new Promise((resolve) => {
      const proc = spawn(godotPath, cmdArgs, {
        cwd: projectPath,
        shell: true,
      });

      let stdout = "";
      let stderr = "";
      let killed = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
        // Force kill after 5 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill("SIGKILL");
          }
        }, 5000);
      }, timeout);

      proc.stdout.on("data", (data) => (stdout += data.toString()));
      proc.stderr.on("data", (data) => (stderr += data.toString()));

      proc.on("close", (code) => {
        clearTimeout(timeoutId);

        if (killed) {
          resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    exit_code: -1,
                    success: false,
                    error: `Test execution timed out after ${timeout / 1000} seconds`,
                    partial_output: stdout.slice(0, 5000),
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          });
          return;
        }

        const results = this.parseTestOutput(stdout);
        resolve({
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  exit_code: code,
                  success: code === 0,
                  summary: {
                    total: results.reduce((sum, r) => sum + r.tests.length, 0),
                    passed: results.reduce((sum, r) => sum + r.passed, 0),
                    failed: results.reduce((sum, r) => sum + r.failed, 0),
                    skipped: results.reduce((sum, r) => sum + r.skipped, 0),
                  },
                  suites: results,
                  raw_output: stdout.slice(0, 5000), // Truncate if too long
                },
                null,
                2
              ),
            },
          ],
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timeoutId);
        resolve({
          content: [
            {
              type: "text",
              text: `Failed to run tests: ${err.message}`,
            },
          ],
          isError: true,
        });
      });
    });
  }

  /**
   * Run a specific test file
   */
  async runTestFile(args: { file: string }): Promise<any> {
    const { file } = args;
    const resolvedPath = this.config.resolvePath(file);

    if (!fs.existsSync(resolvedPath)) {
      return {
        content: [{ type: "text", text: `Test file not found: ${file}` }],
        isError: true,
      };
    }

    return this.runTests({ path: file });
  }

  private parseTestOutput(output: string): TestSuiteResult[] {
    const results: TestSuiteResult[] = [];
    const lines = output.split("\n");

    let currentSuite: TestSuiteResult | null = null;

    // GdUnit4 output format patterns
    const suiteStartRegex = /Running test suite:\s*(.+)/;
    const testPassRegex = /\[PASSED\]\s*(\w+)/;
    const testFailRegex = /\[FAILED\]\s*(\w+)/;
    const testSkipRegex = /\[SKIPPED\]\s*(\w+)/;
    const errorRegex = /Error:\s*(.+)/;

    for (const line of lines) {
      const suiteMatch = line.match(suiteStartRegex);
      if (suiteMatch) {
        if (currentSuite) {
          results.push(currentSuite);
        }
        currentSuite = {
          suite: suiteMatch[1],
          file: suiteMatch[1],
          tests: [],
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
        };
        continue;
      }

      if (!currentSuite) continue;

      const passMatch = line.match(testPassRegex);
      if (passMatch) {
        currentSuite.tests.push({
          name: passMatch[1],
          status: "passed",
        });
        currentSuite.passed++;
        continue;
      }

      const failMatch = line.match(testFailRegex);
      if (failMatch) {
        currentSuite.tests.push({
          name: failMatch[1],
          status: "failed",
        });
        currentSuite.failed++;
        continue;
      }

      const skipMatch = line.match(testSkipRegex);
      if (skipMatch) {
        currentSuite.tests.push({
          name: skipMatch[1],
          status: "skipped",
        });
        currentSuite.skipped++;
        continue;
      }
    }

    if (currentSuite) {
      results.push(currentSuite);
    }

    return results;
  }

  // ==========================================================================
  // TEST GENERATION
  // ==========================================================================

  /**
   * Generate test stub for a file
   */
  async generateTest(args: {
    file: string;
    function?: string;
    output?: string;
  }): Promise<any> {
    const { file, function: funcName, output } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `Source file not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const analysis = this.analyzeForTests(content);

    // Generate test file
    const testContent = this.generateTestContent(analysis, file, funcName);

    // Determine output path
    const outputPath =
      output ||
      file
        .replace("scripts/", "tests/")
        .replace(".gd", "_test.gd");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              source_file: file,
              test_file: outputPath,
              functions_covered: funcName
                ? [funcName]
                : analysis.functions.map((f: any) => f.name),
              test_content: testContent,
              instructions: [
                `Save the test content to: ${outputPath}`,
                "Ensure GdUnit4 is installed",
                "Run tests with godot_run_tests tool",
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private analyzeForTests(content: string): any {
    const analysis: any = {
      class_name: null,
      extends: null,
      functions: [],
      signals: [],
      public_vars: [],
    };

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Class name
      const classMatch = trimmed.match(/^class_name\s+(\w+)/);
      if (classMatch) {
        analysis.class_name = classMatch[1];
        continue;
      }

      // Extends
      const extendsMatch = trimmed.match(/^extends\s+(\w+)/);
      if (extendsMatch) {
        analysis.extends = extendsMatch[1];
        continue;
      }

      // Public functions (not starting with _)
      const funcMatch = trimmed.match(
        /^func\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?/
      );
      if (funcMatch && !funcMatch[1].startsWith("_")) {
        analysis.functions.push({
          name: funcMatch[1],
          parameters: this.parseParameters(funcMatch[2]),
          return_type: funcMatch[3] || "void",
          line: i + 1,
        });
        continue;
      }

      // Signals
      const signalMatch = trimmed.match(/^signal\s+(\w+)/);
      if (signalMatch) {
        analysis.signals.push(signalMatch[1]);
        continue;
      }

      // Public variables
      const varMatch = trimmed.match(/^var\s+(\w+)/);
      if (varMatch && !varMatch[1].startsWith("_")) {
        analysis.public_vars.push(varMatch[1]);
        continue;
      }
    }

    return analysis;
  }

  private parseParameters(paramString: string): any[] {
    if (!paramString.trim()) return [];

    return paramString.split(",").map((param) => {
      const parts = param.trim().split(":");
      return {
        name: parts[0].trim(),
        type: parts[1]?.trim() || "Variant",
      };
    });
  }

  private generateTestContent(
    analysis: any,
    sourceFile: string,
    specificFunc?: string
  ): string {
    const className = analysis.class_name || path.basename(sourceFile, ".gd");
    const testClassName = `Test${className}`;

    let content = `# GdUnit4 Test Suite for ${className}
# Generated by godot-mcp-ultimate

extends GdUnitTestSuite

var _instance: ${analysis.extends || "RefCounted"}

func before_test() -> void:
\t# Called before each test
`;

    // Instance creation based on type
    if (analysis.extends === "Node" || analysis.extends?.endsWith("2D") || analysis.extends?.endsWith("3D")) {
      content += `\t_instance = auto_free(${className}.new())\n`;
      content += `\tadd_child(_instance)\n`;
    } else if (analysis.class_name) {
      content += `\t_instance = auto_free(${className}.new())\n`;
    } else {
      content += `\t# Load the script and create instance\n`;
      content += `\tvar script = load("${this.config.toResPath(sourceFile)}")\n`;
      content += `\t_instance = auto_free(script.new())\n`;
    }

    content += `
func after_test() -> void:
\t# Called after each test
\tpass

`;

    // Generate test functions
    const functionsToTest = specificFunc
      ? analysis.functions.filter((f: any) => f.name === specificFunc)
      : analysis.functions;

    for (const func of functionsToTest) {
      content += this.generateTestFunction(func);
    }

    // Generate signal tests
    for (const signal of analysis.signals) {
      content += this.generateSignalTest(signal);
    }

    return content;
  }

  private generateTestFunction(func: any): string {
    const testName = `test_${func.name}`;
    let content = `func ${testName}() -> void:\n`;
    content += `\t# Test: ${func.name}\n`;

    // Generate parameter placeholders
    if (func.parameters.length > 0) {
      content += `\t# Parameters: ${func.parameters.map((p: any) => `${p.name}: ${p.type}`).join(", ")}\n`;
      content += `\t\n`;

      // Generate placeholder values
      for (const param of func.parameters) {
        content += `\tvar ${param.name} = ${this.getDefaultValue(param.type)}\n`;
      }
      content += `\t\n`;
    }

    // Call the function
    const paramNames = func.parameters.map((p: any) => p.name).join(", ");
    if (func.return_type !== "void") {
      content += `\tvar result = _instance.${func.name}(${paramNames})\n`;
      content += `\t\n`;
      content += `\t# TODO: Add assertions\n`;
      content += `\t# assert_that(result).is_equal(expected_value)\n`;
    } else {
      content += `\t_instance.${func.name}(${paramNames})\n`;
      content += `\t\n`;
      content += `\t# TODO: Add assertions\n`;
      content += `\t# assert_that(_instance.some_property).is_equal(expected_value)\n`;
    }

    content += `\tpass\n\n`;
    return content;
  }

  private generateSignalTest(signalName: string): string {
    return `func test_signal_${signalName}() -> void:
\t# Test signal: ${signalName}
\tvar monitor = monitor_signals(_instance)
\t
\t# TODO: Trigger the signal
\t# _instance.some_method_that_emits_signal()
\t
\t# Verify signal was emitted
\t# await assert_signal(monitor).is_emitted("${signalName}")
\tpass

`;
  }

  private getDefaultValue(type: string): string {
    const defaults: Record<string, string> = {
      int: "0",
      float: "0.0",
      String: '""',
      bool: "false",
      Vector2: "Vector2.ZERO",
      Vector3: "Vector3.ZERO",
      Array: "[]",
      Dictionary: "{}",
      Color: "Color.WHITE",
      NodePath: 'NodePath("")',
      Variant: "null",
    };
    return defaults[type] || "null";
  }

  // ==========================================================================
  // COVERAGE
  // ==========================================================================

  /**
   * Get test coverage report
   */
  async getCoverage(args: { path?: string }): Promise<any> {
    const targetPath = args.path || this.config.projectPath;

    // Find all source files
    const sourceFiles = await fg(["scripts/**/*.gd"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**", "**/tests/**", "**/*_test.gd"],
    });

    // Find all test files
    const testFiles = await fg(["tests/**/*_test.gd", "**/*_test.gd"], {
      cwd: this.config.projectPath,
      ignore: ["**/addons/**"],
    });

    // Analyze coverage
    const coverage: any = {
      source_files: sourceFiles.length,
      test_files: testFiles.length,
      covered_files: [],
      uncovered_files: [],
      coverage_percent: 0,
    };

    // Map test files to source files
    const testToSource = new Map<string, string>();
    for (const testFile of testFiles) {
      const baseName = path.basename(testFile, "_test.gd");
      const possibleSources = sourceFiles.filter((sf) =>
        path.basename(sf, ".gd") === baseName
      );
      if (possibleSources.length > 0) {
        testToSource.set(testFile, possibleSources[0]);
        coverage.covered_files.push({
          source: possibleSources[0],
          test: testFile,
        });
      }
    }

    // Find uncovered files
    const coveredSources = new Set(testToSource.values());
    for (const sourceFile of sourceFiles) {
      if (!coveredSources.has(sourceFile)) {
        coverage.uncovered_files.push(sourceFile);
      }
    }

    coverage.coverage_percent =
      sourceFiles.length > 0
        ? Math.round((coverage.covered_files.length / sourceFiles.length) * 100)
        : 0;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(coverage, null, 2),
        },
      ],
    };
  }
}
