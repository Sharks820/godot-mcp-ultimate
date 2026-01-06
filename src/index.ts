#!/usr/bin/env node
/**
 * godot-mcp-ultimate - The ULTIMATE Godot MCP Server
 * =================================================
 *
 * A MONSTER of an MCP server for Godot game development featuring:
 * - Deep GDScript semantic analysis (LSP + AST + Pattern matching)
 * - Comprehensive code quality (linting, formatting, complexity)
 * - Full testing integration (GdUnit4)
 * - Intelligent documentation (Godot 4.x API + project docs)
 * - AI-powered code generation (templates, smart completion)
 * - 15+ specialized sub-agents with clear domains
 * - VEILBREAKERS-specific patterns and utilities
 *
 * NO EXTERNAL DEPENDENCIES FOR CORE INTELLIGENCE
 * All knowledge is built-in from deep Godot expertise
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Core modules
import { SemanticAnalyzer } from "./semantic/analyzer.js";
import { QualityChecker } from "./quality/checker.js";
import { TestRunner } from "./testing/runner.js";
import { DocsProvider } from "./docs/provider.js";
import { AgentManager } from "./agents/manager.js";
import { Config } from "./utils/config.js";

// Advanced modules
import { CodeGenerator } from "./ai/code-generator.js";
import { AGENT_ECOSYSTEM, routeToAgent, getCollaborationPlan } from "./agents/agent-ecosystem.js";
import { validateGDScript, generateSmartCode, COMMON_PITFALLS, GAME_PATTERNS, PERFORMANCE_KNOWLEDGE } from "./knowledge/godot-brain.js";
import { AdvancedAnalyzer } from "./analysis/advanced.js";

// New modules
import { EnvDoctor } from "./diagnostics/env-doctor.js";
import { ShaderAnalyzer } from "./shaders/analyzer.js";

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

const config = new Config();
const semantic = new SemanticAnalyzer(config);
const quality = new QualityChecker(config);
const testing = new TestRunner(config);
const docs = new DocsProvider(config);
const agents = new AgentManager(config);
const codeGen = new CodeGenerator(config);
const advanced = new AdvancedAnalyzer(config);
const envDoctor = new EnvDoctor(config);
const shaders = new ShaderAnalyzer(config);

const server = new Server(
  {
    name: "godot-mcp-ultimate",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// =============================================================================
// COMPREHENSIVE TOOL DEFINITIONS (40+ TOOLS)
// =============================================================================

const TOOLS = [
  // =========================================================================
  // SEMANTIC ANALYSIS TOOLS
  // =========================================================================
  {
    name: "godot_find_symbol",
    description: "Find a symbol definition by name across the project. Uses LSP when available, falls back to pattern matching.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Symbol name to find" },
        scope: { type: "string", enum: ["file", "project"], description: "Search scope" },
        file: { type: "string", description: "File to search in (for file scope)" },
      },
      required: ["name"],
    },
  },
  {
    name: "godot_find_references",
    description: "Find all references to a symbol. Returns all usages across the project.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path" },
        line: { type: "number", description: "Line number (1-based)" },
        column: { type: "number", description: "Column number (1-based)" },
      },
      required: ["file", "line", "column"],
    },
  },
  {
    name: "godot_go_to_definition",
    description: "Jump to the definition of a symbol at a specific location.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path" },
        line: { type: "number", description: "Line number (1-based)" },
        column: { type: "number", description: "Column number (1-based)" },
      },
      required: ["file", "line", "column"],
    },
  },
  {
    name: "godot_document_symbols",
    description: "Get all symbols (classes, functions, variables, signals) in a file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path to analyze" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_workspace_symbols",
    description: "Search for symbols across the entire project by name pattern.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Symbol name pattern" },
        limit: { type: "number", description: "Max results (default 50)" },
      },
      required: ["query"],
    },
  },
  {
    name: "godot_analyze_scene",
    description: "Deep analysis of a .tscn scene file - node hierarchy, scripts, resources, signals.",
    inputSchema: {
      type: "object",
      properties: {
        scene: { type: "string", description: "Scene file path (.tscn)" },
      },
      required: ["scene"],
    },
  },
  {
    name: "godot_analyze_dependencies",
    description: "Analyze script dependencies - preloads, loads, signals, autoloads used.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Script file to analyze" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_analyze_resources",
    description: "Find and analyze all resources (.tres, .res) in the project.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Resource type filter (e.g., 'SkillData')" },
      },
    },
  },

  // =========================================================================
  // CODE QUALITY TOOLS
  // =========================================================================
  {
    name: "godot_lint_file",
    description: "Lint a GDScript file with detailed issues, CLAUDE.md compliance, and suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path to lint" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_lint_project",
    description: "Lint the entire project with comprehensive quality report.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory (default: project root)" },
      },
    },
  },
  {
    name: "godot_format_file",
    description: "Format a GDScript file. Preview changes without modifying by default.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path to format" },
        dry_run: { type: "boolean", description: "Preview only (default: true)" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_get_complexity",
    description: "Calculate cyclomatic complexity for all functions in a file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path to analyze" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_check_patterns",
    description: "Check code against VEILBREAKERS patterns, utilities usage, and best practices.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File to check" },
        patterns: { type: "array", items: { type: "string" }, description: "Specific patterns" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_validate_code",
    description: "Comprehensive GDScript validation using built-in Godot Brain knowledge.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "GDScript code to validate" },
        project_rules: { type: "boolean", description: "Include VEILBREAKERS rules (default: true)" },
      },
      required: ["code"],
    },
  },
  {
    name: "godot_parse_ast",
    description: "Parse GDScript and return structure analysis.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File to parse" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_validate_project",
    description: "Run comprehensive project validation - scripts, scenes, resources, references.",
    inputSchema: {
      type: "object",
      properties: {
        checks: { type: "array", items: { type: "string" }, description: "Checks to run" },
      },
    },
  },

  // =========================================================================
  // TESTING TOOLS
  // =========================================================================
  {
    name: "godot_run_tests",
    description: "Execute GdUnit4 tests with optional filtering.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Test path or file" },
        filter: { type: "string", description: "Test name filter" },
        continue_on_failure: { type: "boolean", description: "Don't stop on failure" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 300000 = 5 minutes)" },
      },
    },
  },
  {
    name: "godot_run_test_file",
    description: "Run a specific test file and return detailed results.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Test file path" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_generate_test",
    description: "Generate comprehensive GdUnit4 test stub for a source file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Source file" },
        function: { type: "string", description: "Specific function (optional)" },
        output: { type: "string", description: "Output path (optional)" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_get_test_coverage",
    description: "Get test coverage report showing tested vs untested files.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to analyze" },
      },
    },
  },

  // =========================================================================
  // DOCUMENTATION TOOLS
  // =========================================================================
  {
    name: "godot_get_api_docs",
    description: "Get Godot 4.x API documentation for any class, method, or property.",
    inputSchema: {
      type: "object",
      properties: {
        class_name: { type: "string", description: "Godot class (e.g., 'Node2D')" },
        method: { type: "string", description: "Method name (optional)" },
        property: { type: "string", description: "Property name (optional)" },
      },
      required: ["class_name"],
    },
  },
  {
    name: "godot_get_project_docs",
    description: "Extract documentation from project code comments.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File (optional, default: all)" },
        type: { type: "string", enum: ["classes", "functions", "signals", "all"] },
      },
    },
  },
  {
    name: "godot_search_docs",
    description: "Search both Godot API and project documentation.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "godot_get_common_pitfalls",
    description: "Get comprehensive list of common GDScript pitfalls and how to avoid them.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (optional)" },
      },
    },
  },
  {
    name: "godot_get_game_patterns",
    description: "Get proven game development patterns (State Machine, Object Pool, Event Bus, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Specific pattern name (optional)" },
      },
    },
  },
  {
    name: "godot_get_performance_guide",
    description: "Get performance optimization knowledge - profiling, techniques, targets.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // =========================================================================
  // CODE GENERATION TOOLS
  // =========================================================================
  {
    name: "godot_generate_from_template",
    description: "Generate code from proven templates (Node2D, Control, Resource, StateMachine, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: ["node2d", "control", "resource", "autoload", "state_machine", "state", "event_bus", "object_pool", "tween_helper"],
          description: "Template type",
        },
        class_name: { type: "string", description: "Class name" },
        output: { type: "string", description: "Output path (optional)" },
        options: { type: "object", description: "Template options" },
      },
      required: ["template"],
    },
  },
  {
    name: "godot_generate_feature",
    description: "Generate complete feature boilerplate (skill, monster, UI component, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        feature_type: {
          type: "string",
          enum: ["skill", "monster", "ui_component", "status_effect", "battle_action"],
          description: "Feature type",
        },
        name: { type: "string", description: "Feature name" },
        options: { type: "object", description: "Feature options" },
      },
      required: ["feature_type", "name"],
    },
  },
  {
    name: "godot_smart_complete",
    description: "Get intelligent code completions based on context.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File path" },
        line: { type: "number", description: "Line number" },
        prefix: { type: "string", description: "Text prefix to complete" },
      },
      required: ["file", "line", "prefix"],
    },
  },
  {
    name: "godot_auto_fix",
    description: "Automatically fix common code issues.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "File to fix" },
        fixes: { type: "array", items: { type: "string" }, description: "Specific fixes" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_generate_smart_code",
    description: "Generate code using AI-powered smart generation.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["function", "class", "signal_handler", "state", "resource"],
          description: "Code type",
        },
        name: { type: "string", description: "Name" },
        params: { type: "object", description: "Parameters" },
        options: { type: "object", description: "Options" },
      },
      required: ["type", "name"],
    },
  },

  // =========================================================================
  // AGENT TOOLS
  // =========================================================================
  {
    name: "godot_invoke_agent",
    description: "Invoke a specialized sub-agent for domain-specific expertise.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          enum: Object.keys(AGENT_ECOSYSTEM),
          description: "Agent to invoke",
        },
        task: { type: "string", description: "Task description" },
        context: { type: "object", description: "Additional context" },
      },
      required: ["agent", "task"],
    },
  },
  {
    name: "godot_route_task",
    description: "Automatically route a task to the most appropriate agent(s).",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description" },
      },
      required: ["task"],
    },
  },
  {
    name: "godot_get_agent_info",
    description: "Get detailed information about an agent's domain and expertise.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "Agent ID" },
      },
      required: ["agent"],
    },
  },
  {
    name: "godot_list_agents",
    description: "List all available agents with their domains.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_plan_collaboration",
    description: "Plan a multi-agent collaboration for a complex task.",
    inputSchema: {
      type: "object",
      properties: {
        primary_agent: { type: "string", description: "Primary agent" },
        task: { type: "string", description: "Task description" },
      },
      required: ["primary_agent", "task"],
    },
  },

  // =========================================================================
  // ADVANCED ANALYSIS TOOLS (THE POWERHOUSE)
  // =========================================================================
  {
    name: "godot_visualize_scene_tree",
    description: "Generate a visual ASCII tree of a scene's node hierarchy with icons, scripts, and types.",
    inputSchema: {
      type: "object",
      properties: {
        scene: { type: "string", description: "Scene file path (.tscn)" },
        depth: { type: "number", description: "Max depth to visualize (default: 10)" },
      },
      required: ["scene"],
    },
  },
  {
    name: "godot_detect_dead_code",
    description: "Find potentially unused functions, variables, and signals across the project.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to analyze (default: project root)" },
      },
    },
  },
  {
    name: "godot_analyze_signal_flow",
    description: "Analyze signal connections, emissions, and find orphan signals throughout the project.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Specific file to analyze (optional)" },
      },
    },
  },
  {
    name: "godot_project_health",
    description: "Generate comprehensive project health metrics, scores, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_analyze_autoloads",
    description: "Analyze autoload dependencies, detect circular dependencies, suggest load order.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_find_duplication",
    description: "Find potential code duplication across the project.",
    inputSchema: {
      type: "object",
      properties: {
        min_lines: { type: "number", description: "Minimum lines for duplicate detection (default: 5)" },
      },
    },
  },
  {
    name: "godot_complexity_heatmap",
    description: "Generate a complexity heatmap showing the most complex files and functions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // =========================================================================
  // ENVIRONMENT & DIAGNOSTICS TOOLS
  // =========================================================================
  {
    name: "godot_env_doctor",
    description: "Run comprehensive environment health check. Validates Godot setup, LSP, gdtoolkit, GdUnit4, and provides actionable remediation steps.",
    inputSchema: {
      type: "object",
      properties: {
        verbose: { type: "boolean", description: "Return full JSON report instead of summary (default: false)" },
      },
    },
  },

  // =========================================================================
  // SHADER TOOLS
  // =========================================================================
  {
    name: "godot_analyze_shader",
    description: "Deep analysis of a .gdshader file - uniforms, varyings, functions, complexity metrics, and performance hints.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Shader file path (.gdshader)" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_lint_shader",
    description: "Lint a shader file for errors, warnings, deprecations, and performance issues.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Shader file path (.gdshader)" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_lint_all_shaders",
    description: "Lint all shaders in the project and return comprehensive report.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory to scan (default: project root)" },
      },
    },
  },
  {
    name: "godot_shader_performance",
    description: "Analyze shader performance - complexity score, grade, and optimization recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Shader file path (.gdshader)" },
      },
      required: ["file"],
    },
  },
  {
    name: "godot_find_shaders",
    description: "Find all shaders in the project with summary of types, uniforms, and texture samples.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory to scan (default: project root)" },
      },
    },
  },
  {
    name: "godot_get_shader_docs",
    description: "Get Godot shader documentation - built-in uniforms, render modes, GLSL functions by shader type.",
    inputSchema: {
      type: "object",
      properties: {
        shader_type: {
          type: "string",
          enum: ["spatial", "canvas_item", "particles", "sky", "fog"],
          description: "Shader type",
        },
        topic: {
          type: "string",
          enum: ["uniforms", "render_modes", "functions"],
          description: "Documentation topic",
        },
      },
    },
  },

  // =========================================================================
  // PROJECT VALIDATION TOOLS (CRITICAL FOR CATCHING BUGS EARLY)
  // =========================================================================
  {
    name: "godot_validate_scenes",
    description: "Validate all scenes for broken references, missing scripts, invalid paths. Catches bugs BEFORE runtime!",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory to validate (default: project root)" },
      },
    },
  },
  {
    name: "godot_analyze_assets",
    description: "Find unused assets, oversized files, and optimization opportunities. Reduce project bloat!",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_validate_inputs",
    description: "Validate input mappings - find undefined actions, unused inputs, and hardcoded action names.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_validate_game_data",
    description: "Validate VEILBREAKERS game data resources (skills, monsters, equipment) for missing/invalid fields.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "godot_find_unused_files",
    description: "Find scripts, scenes, and resources that are never referenced anywhere. Clean up your project!",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// =============================================================================
// RESOURCES
// =============================================================================

const RESOURCES = [
  // Project info
  { uri: "godot://project-structure", name: "Project Structure", description: "VEILBREAKERS project structure", mimeType: "application/json" },
  { uri: "godot://code-patterns", name: "Code Patterns", description: "VEILBREAKERS code patterns and anti-patterns", mimeType: "application/json" },
  { uri: "godot://utilities", name: "Utility Reference", description: "Available utility classes", mimeType: "application/json" },
  { uri: "godot://common-pitfalls", name: "Common Pitfalls", description: "GDScript pitfalls and solutions", mimeType: "application/json" },
  { uri: "godot://game-patterns", name: "Game Patterns", description: "Proven game development patterns", mimeType: "application/json" },
  { uri: "godot://performance", name: "Performance Guide", description: "Optimization techniques", mimeType: "application/json" },

  // Agents
  ...Object.values(AGENT_ECOSYSTEM).map(agent => ({
    uri: `agent://${agent.id}`,
    name: agent.name,
    description: agent.description,
    mimeType: "text/plain",
  })),
];

// =============================================================================
// PROMPTS
// =============================================================================

const PROMPTS = [
  {
    name: "analyze-code",
    description: "Deep analysis of GDScript code with quality checks and suggestions",
    arguments: [
      { name: "file", description: "File to analyze", required: true },
      { name: "depth", description: "Analysis depth: quick, standard, deep", required: false },
    ],
  },
  {
    name: "generate-tests",
    description: "Generate comprehensive GdUnit4 tests for a file",
    arguments: [
      { name: "file", description: "File to test", required: true },
      { name: "coverage", description: "minimal, standard, comprehensive", required: false },
    ],
  },
  {
    name: "refactor-code",
    description: "Intelligent refactoring with semantic analysis",
    arguments: [
      { name: "file", description: "File to refactor", required: true },
      { name: "focus", description: "performance, readability, patterns", required: false },
    ],
  },
  {
    name: "invoke-agent",
    description: "Get specialized help from a domain expert agent",
    arguments: [
      { name: "agent", description: "Agent ID", required: true },
      { name: "task", description: "Task to accomplish", required: true },
    ],
  },
  {
    name: "veilbreakers-session",
    description: "Start a VEILBREAKERS development session with full context",
    arguments: [],
  },
];

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Semantic tools
      case "godot_find_symbol":
        return await semantic.findSymbol(args as any);
      case "godot_find_references":
        return await semantic.findReferences(args as any);
      case "godot_go_to_definition":
        return await semantic.goToDefinition(args as any);
      case "godot_document_symbols":
        return await semantic.getDocumentSymbols(args as any);
      case "godot_workspace_symbols":
        return await semantic.getWorkspaceSymbols(args as any);
      case "godot_analyze_scene":
        return await semantic.analyzeScene(args as any);
      case "godot_analyze_dependencies":
        return await semantic.analyzeDependencies(args as any);
      case "godot_analyze_resources":
        return await semantic.analyzeResources(args as any);

      // Quality tools
      case "godot_lint_file":
        return await quality.lintFile(args as any);
      case "godot_lint_project":
        return await quality.lintProject(args as any);
      case "godot_format_file":
        return await quality.formatFile(args as any);
      case "godot_get_complexity":
        return await quality.getComplexity(args as any);
      case "godot_check_patterns":
        return await quality.checkPatterns(args as any);
      case "godot_parse_ast":
        return await quality.parseAST(args as any);
      case "godot_validate_project":
        return await quality.validateProject(args as any);

      // Validation with Godot Brain
      case "godot_validate_code":
        const validation = validateGDScript((args as any).code, (args as any).project_rules !== false);
        return {
          content: [{ type: "text", text: JSON.stringify(validation, null, 2) }],
        };

      // Testing tools
      case "godot_run_tests":
        return await testing.runTests(args as any);
      case "godot_run_test_file":
        return await testing.runTestFile(args as any);
      case "godot_generate_test":
        return await testing.generateTest(args as any);
      case "godot_get_test_coverage":
        return await testing.getCoverage(args as any);

      // Documentation tools
      case "godot_get_api_docs":
        return await docs.getAPIDocs(args as any);
      case "godot_get_project_docs":
        return await docs.getProjectDocs(args as any);
      case "godot_search_docs":
        return await docs.searchDocs(args as any);

      // Knowledge tools
      case "godot_get_common_pitfalls":
        const category = (args as any)?.category;
        const pitfalls = category
          ? COMMON_PITFALLS.filter(p => p.name.includes(category))
          : COMMON_PITFALLS;
        return {
          content: [{ type: "text", text: JSON.stringify(pitfalls, null, 2) }],
        };

      case "godot_get_game_patterns":
        const patternName = (args as any)?.pattern;
        const patterns = patternName
          ? { [patternName]: (GAME_PATTERNS as any)[patternName] }
          : GAME_PATTERNS;
        return {
          content: [{ type: "text", text: JSON.stringify(patterns, null, 2) }],
        };

      case "godot_get_performance_guide":
        return {
          content: [{ type: "text", text: JSON.stringify(PERFORMANCE_KNOWLEDGE, null, 2) }],
        };

      // Code generation tools
      case "godot_generate_from_template":
        return await codeGen.generateFromTemplate(args as any);
      case "godot_generate_feature":
        return await codeGen.generateFeature(args as any);
      case "godot_smart_complete":
        return await codeGen.getSuggestions(args as any);
      case "godot_auto_fix":
        return await codeGen.autoFix(args as any);
      case "godot_generate_smart_code":
        const code = generateSmartCode(args as any);
        return {
          content: [{ type: "text", text: code }],
        };

      // Agent tools
      case "godot_invoke_agent":
        return await agents.invokeAgent(args as any);

      case "godot_route_task":
        const matchedAgents = routeToAgent((args as any).task);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task: (args as any).task,
              recommended_agents: matchedAgents,
              agents_info: matchedAgents.map(id => ({
                id,
                name: AGENT_ECOSYSTEM[id]?.name,
                domain: AGENT_ECOSYSTEM[id]?.domain,
              })),
            }, null, 2),
          }],
        };

      case "godot_get_agent_info":
        const agentId = (args as any).agent;
        const agent = AGENT_ECOSYSTEM[agentId];
        if (!agent) {
          return {
            content: [{ type: "text", text: `Unknown agent: ${agentId}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(agent, null, 2) }],
        };

      case "godot_list_agents":
        const agentList = Object.values(AGENT_ECOSYSTEM).map(a => ({
          id: a.id,
          name: a.name,
          domain: a.domain,
          expertise: a.expertise,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(agentList, null, 2) }],
        };

      case "godot_plan_collaboration":
        const plan = getCollaborationPlan((args as any).primary_agent, (args as any).task);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              primary: { id: plan.primary.id, name: plan.primary.name, domain: plan.primary.domain },
              collaborators: plan.collaborators.map(c => ({ id: c.id, name: c.name, domain: c.domain })),
              workflow: plan.workflow,
            }, null, 2),
          }],
        };

      // Advanced analysis tools
      case "godot_visualize_scene_tree":
        return await advanced.visualizeSceneTree(args as any);
      case "godot_detect_dead_code":
        return await advanced.detectDeadCode(args as any);
      case "godot_analyze_signal_flow":
        return await advanced.analyzeSignalFlow(args as any);
      case "godot_project_health":
        return await advanced.getProjectHealth(args as any);
      case "godot_analyze_autoloads":
        return await advanced.analyzeAutoloads(args as any);
      case "godot_find_duplication":
        return await advanced.findDuplication(args as any);
      case "godot_complexity_heatmap":
        return await advanced.getComplexityHeatmap(args as any);

      // Environment & diagnostics tools
      case "godot_env_doctor":
        return await envDoctor.runDiagnostics(args as any);

      // Shader tools
      case "godot_analyze_shader":
        return await shaders.analyzeShader(args as any);
      case "godot_lint_shader":
        return await shaders.lintShader(args as any);
      case "godot_lint_all_shaders":
        return await shaders.lintAllShaders(args as any);
      case "godot_shader_performance":
        return await shaders.analyzeShaderPerformance(args as any);
      case "godot_find_shaders":
        return await shaders.findShaders(args as any);
      case "godot_get_shader_docs":
        return await shaders.getShaderDocs(args as any);

      // Project validation tools (NEW - CRITICAL FOR BUG PREVENTION)
      case "godot_validate_scenes":
        return await advanced.validateScenes(args as any);
      case "godot_analyze_assets":
        return await advanced.analyzeAssets(args as any);
      case "godot_validate_inputs":
        return await advanced.validateInputMappings(args as any);
      case "godot_validate_game_data":
        return await advanced.validateGameData(args as any);
      case "godot_find_unused_files":
        return await advanced.findUnusedFiles(args as any);

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "godot://common-pitfalls") {
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(COMMON_PITFALLS, null, 2) }],
    };
  }

  if (uri === "godot://game-patterns") {
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(GAME_PATTERNS, null, 2) }],
    };
  }

  if (uri === "godot://performance") {
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(PERFORMANCE_KNOWLEDGE, null, 2) }],
    };
  }

  if (uri.startsWith("godot://")) {
    const resourceType = uri.replace("godot://", "");
    const content = await docs.getResource(resourceType);
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(content, null, 2) }],
    };
  }

  if (uri.startsWith("agent://")) {
    const agentId = uri.replace("agent://", "");
    const agent = AGENT_ECOSYSTEM[agentId];
    if (!agent) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    return {
      contents: [{ uri, mimeType: "text/plain", text: agent.systemPrompt }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "veilbreakers-session") {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Starting VEILBREAKERS development session.

MANDATORY: Read CLAUDE.md and VEILBREAKERS.md first.
Use godot-mcp-ultimate tools for all Godot operations.
Follow utility patterns (UIStyleFactory, AnimationEffects, Constants).

Available agents: ${Object.keys(AGENT_ECOSYSTEM).join(", ")}

What would you like to work on?`,
        },
      }],
    };
  }

  return await agents.getPrompt(name, args || {});
});

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("godot-mcp-ultimate v2.0 - THE ULTIMATE GODOT MCP - ONLINE");
}

main().catch(console.error);
