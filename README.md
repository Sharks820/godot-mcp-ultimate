# godot-mcp-ultimate

**THE ULTIMATE MCP Server for Godot Game Development**

A comprehensive Model Context Protocol (MCP) server that transforms any AI assistant into a **Godot development powerhouse**. Built with deep GDScript knowledge, intelligent analysis tools, and 15 specialized sub-agents.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![Godot](https://img.shields.io/badge/godot-4.x-purple)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## Why This MCP?

Unlike basic MCP servers that just run commands, **godot-mcp-ultimate** has:

- **Built-in Intelligence**: Deep Godot 4.x knowledge - no external lookups needed
- **47+ Specialized Tools**: From semantic analysis to dead code detection
- **15 Sub-Agents**: Domain experts that don't overlap and complement each other
- **Project Health Dashboard**: Know your codebase quality at a glance
- **Zero Config**: Point it at your project and go

---

## Features

### Semantic Analysis (8 tools)
- Find symbol definitions across the project
- Go to definition with LSP or pattern matching fallback
- Analyze scene files (.tscn) - node hierarchy, scripts, resources
- Trace dependencies and resource usage

### Code Quality (8 tools)
- Lint with gdtoolkit or built-in fallback rules
- Format code (preview before applying)
- Calculate cyclomatic complexity
- Validate against CLAUDE.md patterns (VEILBREAKERS-specific)
- Full project validation

### Testing (4 tools)
- Run GdUnit4 tests
- Generate test stubs with proper structure
- Coverage analysis

### Documentation (6 tools)
- Built-in Godot 4.x API docs
- Project documentation extraction
- 10 common pitfalls with bad/good code examples
- 6 proven game patterns (State Machine, Object Pool, etc.)
- Performance optimization guide

### Code Generation (5 tools)
- 9 templates: Node2D, Control, Resource, StateMachine, State, EventBus, ObjectPool, TweenHelper, Autoload
- Feature generators: Skill, Monster, UI Component, Status Effect, Battle Action
- Smart completions based on context
- Auto-fix common issues

### Agent System (5 tools)
- **15 specialized sub-agents** with clear domains
- Auto-routing: describe your task, get the right agent
- Multi-agent collaboration planning
- Full agent introspection

### Advanced Analysis (7 tools) - **THE POWERHOUSE**
- **Scene Tree Visualizer**: ASCII tree with icons and scripts
- **Dead Code Detector**: Find unused functions, variables, signals
- **Signal Flow Analyzer**: Trace all signals, find orphans
- **Project Health Dashboard**: Scores, grades, recommendations
- **Autoload Dependency Graph**: Detect circular dependencies
- **Code Duplication Finder**: Find copy-paste patterns
- **Complexity Heatmap**: Identify the most complex code

---

## The 15 Sub-Agents

| Agent | Domain |
|-------|--------|
| **architect** | High-level design, project structure |
| **code-quality** | Standards, linting, refactoring |
| **testing** | GdUnit4, test creation, coverage |
| **performance** | Profiling, optimization |
| **ui-layout** | Control hierarchy, anchors |
| **ui-styling** | UIStyleFactory, colors, themes |
| **ui-animation** | Tweens, transitions |
| **battle-logic** | Combat mechanics, damage formulas |
| **battle-ai** | Enemy AI, decision making |
| **battle-animation** | Attack choreography, VFX |
| **data-manager** | Resources, .tres files |
| **vera-ai** | AI companion system |
| **dialogue** | NPC dialogue trees |
| **quest** | Quest structure, objectives |
| **sprite** | Sprite sheets, animation frames |
| **audio** | Sound integration, music |

---

## Installation

### Prerequisites
- Node.js 18+
- Godot 4.x (for LSP and testing features)
- Optional: gdtoolkit (`pip install gdtoolkit`)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/godot-mcp-ultimate.git
cd godot-mcp-ultimate

# Install dependencies
npm install

# Build
npm run build
```

### Add to Your MCP Configuration

Add to your `.mcp.json` or MCP settings:

```json
{
  "mcpServers": {
    "godot-ultimate": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/godot-mcp-ultimate/dist/index.js"],
      "env": {
        "GODOT_PROJECT_PATH": "/path/to/your/godot/project",
        "GODOT_PATH": "/path/to/godot/executable",
        "GODOT_LSP_PORT": "6005"
      }
    }
  }
}
```

---

## Usage

### Just Talk Naturally

The MCP understands natural language task descriptions and routes to the right tools/agents:

| You Say | What Happens |
|---------|--------------|
| "Check this code for issues" | Runs linting + quality checks |
| "Make a new skill called Fireball" | Generates complete skill resource |
| "Why is my UI laggy?" | Routes to performance agent |
| "Show me the scene tree" | Visualizes node hierarchy |
| "How healthy is my project?" | Full health dashboard |

### Key Tools

```bash
# Get project health score
godot_project_health

# Visualize a scene
godot_visualize_scene_tree "res://scenes/main/battle.tscn"

# Find dead code
godot_detect_dead_code

# Get signal flow
godot_analyze_signal_flow

# Auto-route a task
godot_route_task "fix the button hover animation"

# Generate code from template
godot_generate_from_template template="state_machine" class_name="PlayerStateMachine"

# Get common pitfalls
godot_get_common_pitfalls

# Get game patterns
godot_get_game_patterns pattern="stateMachine"
```

---

## Built-in Knowledge

### GDScript Syntax Rules
- All keywords, types, and annotations
- Virtual methods for all node types
- Indentation rules

### Godot 4.x Changes
- 30+ renamed classes (Spatial→Node3D, etc.)
- Method renames (instance→instantiate)
- Signal changes (connect→.connect())
- Export annotation changes

### Common Pitfalls (10)
Each with bad code, good code, and explanation:
1. Null node references
2. Orphan nodes (memory leaks)
3. Signal memory leaks
4. Process waste (expensive operations every frame)
5. Tween overwrites
6. String concatenation in loops
7. Dictionary lookups in hot paths
8. Await in wrong context
9. Exports without type hints
10. Preload in loops

### Game Patterns (6)
Complete implementations:
1. State Machine
2. Component System
3. Event Bus
4. Object Pool
5. Command Pattern (undo/redo)
6. Service Locator

### Performance Knowledge
- Profiling guide
- GDScript optimization techniques
- Rendering optimization
- Physics optimization
- Memory management
- Desktop and mobile targets

---

## Project Structure

```
godot-mcp-ultimate/
├── src/
│   ├── index.ts              # Main server (47 tools)
│   ├── utils/config.ts       # Configuration
│   ├── semantic/analyzer.ts  # LSP + pattern matching
│   ├── quality/checker.ts    # Linting, formatting
│   ├── testing/runner.ts     # GdUnit4 integration
│   ├── docs/provider.ts      # Documentation
│   ├── ai/code-generator.ts  # Templates, features
│   ├── knowledge/godot-brain.ts  # Built-in intelligence
│   ├── agents/
│   │   ├── manager.ts        # Agent orchestration
│   │   └── agent-ecosystem.ts # 15 sub-agents
│   └── analysis/advanced.ts  # Power tools
├── dist/                     # Compiled output
├── package.json
└── tsconfig.json
```

---

## Contributing

Contributions welcome! Areas of interest:

- More code templates
- Additional game patterns
- Enhanced LSP integration
- More sub-agents for specific domains
- Better dead code detection
- Shader support

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Credits

Built for the **VEILBREAKERS** project - an AAA 2D turn-based RPG.

Inspired by the need for an AI assistant that truly understands Godot development, not just runs commands.

---

## Changelog

### v2.0.0
- Initial public release
- 47 tools across 7 categories
- 15 specialized sub-agents
- Built-in Godot Brain knowledge engine
- Advanced analysis suite
- Project health dashboard
