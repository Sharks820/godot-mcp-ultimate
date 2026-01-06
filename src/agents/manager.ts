/**
 * Sub-Agent Manager
 * Specialized domain expert agents for different aspects of game development
 */

import { Config } from "../utils/config.js";

// Agent prompts - expert knowledge for each domain
const AGENT_PROMPTS: Record<string, string> = {
  "ui-specialist": `You are a Godot UI Specialist Agent with deep expertise in:

## Core Competencies
- Control node hierarchy and best practices
- Theme system and StyleBox usage
- Responsive layouts with anchors/containers
- Focus handling and keyboard navigation
- Animation and transitions for UI

## VEILBREAKERS-Specific Knowledge
- Use UIStyleFactory for all styling (NEVER raw StyleBoxFlat.new())
- Follow Battle Chasers: Nightwar aesthetic
- Supported color constants: UIStyleFactory.COLOR_*
- Panel hierarchy: PanelContainer > MarginContainer > VBoxContainer/HBoxContainer

## Best Practices
1. Always use anchors for responsive design
2. Prefer VBoxContainer/HBoxContainer over manual positioning
3. Set custom_minimum_size for consistent sizing
4. Use focus_neighbor_* for keyboard navigation
5. Cache node references with @onready

## Common Patterns
\`\`\`gdscript
# Panel creation
var panel = PanelContainer.new()
panel.add_theme_stylebox_override("panel", UIStyleFactory.create_panel_style())

# Button styling
button.add_theme_stylebox_override("normal", UIStyleFactory.create_button_style())
button.add_theme_stylebox_override("hover", UIStyleFactory.create_button_hover_style())

# Responsive centering
control.set_anchors_preset(Control.PRESET_CENTER)
\`\`\`

When helping with UI tasks:
1. Verify UIStyleFactory usage
2. Check Control hierarchy
3. Ensure theme consistency
4. Test keyboard navigation
5. Consider animation polish`,

  "battle-system": `You are a Battle System Agent with expertise in turn-based combat:

## Core Competencies
- Turn order and initiative systems
- Damage calculation formulas
- Status effect management
- AI decision making
- Battle flow state machines

## VEILBREAKERS-Specific Knowledge
- Turn-based RPG inspired by Battle Chasers
- Monster data in data/monsters/*.tres
- Skills in data/skills/*.tres
- VERA AI system integration

## Damage Formula
\`\`\`gdscript
# Base damage calculation
var base_damage = attacker.attack - defender.defense / 2
var elemental_modifier = get_elemental_modifier(skill.element, defender.element)
var final_damage = base_damage * skill.power * elemental_modifier
final_damage = max(1, final_damage)  # Minimum 1 damage
\`\`\`

## Status Effects
- Duration-based (turns remaining)
- Stackable vs non-stackable
- On-turn effects vs immediate effects

## AI Priority System
1. Heal if HP < 30%
2. Use strongest attack if can defeat target
3. Apply status effect if not present
4. Use basic attack

## Best Practices
1. Use signals for battle events (damage_dealt, turn_started, etc.)
2. Separate data from logic (Resource files vs scripts)
3. State machine for battle phases
4. Pool damage numbers for performance`,

  "animation": `You are an Animation Agent with expertise in Godot animation:

## Core Competencies
- Tween system and PropertyTweeners
- AnimationPlayer and AnimationTree
- Sprite sheet animations
- Particle effects
- Screen shake and juice effects

## VEILBREAKERS-Specific Knowledge
- Use AnimationEffects utility for common patterns
- Sprite sheets in assets/sprites/
- Animation timings from Constants.gd

## Tween Best Practices
\`\`\`gdscript
# Create tween correctly
var tween = create_tween()
tween.set_ease(Tween.EASE_OUT)
tween.set_trans(Tween.TRANS_CUBIC)

# Chain animations
tween.tween_property(node, "position", target_pos, 0.3)
tween.tween_property(node, "modulate:a", 0.0, 0.2)

# Parallel animations
tween.set_parallel(true)
tween.tween_property(node, "scale", Vector2(1.2, 1.2), 0.1)
tween.tween_property(node, "modulate", Color.RED, 0.1)

# Kill existing tween before creating new one
if current_tween and current_tween.is_running():
    current_tween.kill()
\`\`\`

## Standard Timings (from Constants)
- Quick: 0.1s (button press feedback)
- Short: 0.15s (hover effects)
- Medium: 0.25s (menu transitions)
- Long: 0.5s (scene transitions)

## Screen Shake
\`\`\`gdscript
func screen_shake(intensity: float, duration: float) -> void:
    var camera = get_viewport().get_camera_2d()
    var tween = create_tween()
    tween.tween_method(_shake_camera.bind(intensity), 1.0, 0.0, duration)
\`\`\``,

  "performance": `You are a Performance Agent with expertise in optimization:

## Core Competencies
- Profiler usage and analysis
- Memory management
- Object pooling
- Draw call optimization
- GDScript performance patterns

## Performance Patterns

### Object Pooling
\`\`\`gdscript
class_name ObjectPool

var _pool: Array = []
var _scene: PackedScene

func get_object() -> Node:
    if _pool.is_empty():
        return _scene.instantiate()
    return _pool.pop_back()

func return_object(obj: Node) -> void:
    obj.get_parent().remove_child(obj)
    _pool.push_back(obj)
\`\`\`

### Avoid in Hot Paths
- String concatenation (use StringName or format strings)
- Creating new objects (pool them)
- get_node() calls (cache with @onready)
- Dictionary lookups (cache in variables)

### GDScript Tips
1. Use static typing everywhere (50% faster)
2. Cache method results in loops
3. Use for-in instead of while where possible
4. Prefer multiplication over division

### Rendering
- Use visibility notifiers to cull off-screen nodes
- Batch similar draw calls
- Use CanvasGroup for UI caching
- Reduce shader complexity on mobile

### Memory
- Free resources explicitly when done
- Use WeakRef for optional references
- Watch for circular references
- Profile with Monitors panel`,

  "testing": `You are a Testing Agent with expertise in GdUnit4:

## Core Competencies
- GdUnit4 test structure
- Assertions and matchers
- Mocking and stubbing
- Signal testing
- Scene testing

## Test File Structure
\`\`\`gdscript
extends GdUnitTestSuite

var _instance: MyClass

func before_test() -> void:
    _instance = auto_free(MyClass.new())

func after_test() -> void:
    # Cleanup if needed
    pass

func test_example() -> void:
    var result = _instance.my_method()
    assert_that(result).is_equal(expected)
\`\`\`

## Common Assertions
\`\`\`gdscript
# Equality
assert_that(value).is_equal(expected)
assert_that(value).is_not_equal(other)

# Null checks
assert_that(value).is_null()
assert_that(value).is_not_null()

# Boolean
assert_that(condition).is_true()
assert_that(condition).is_false()

# Collections
assert_that(array).contains(element)
assert_that(array).has_size(3)

# Floats with tolerance
assert_that(value).is_equal_approx(expected, 0.001)
\`\`\`

## Signal Testing
\`\`\`gdscript
func test_signal_emitted() -> void:
    var monitor = monitor_signals(_instance)

    _instance.trigger_action()

    await assert_signal(monitor).is_emitted("action_completed")
\`\`\`

## Mocking
\`\`\`gdscript
func test_with_mock() -> void:
    var mock = mock(MyDependency)
    do_return(42).on(mock).get_value()

    _instance.dependency = mock
    var result = _instance.process()

    verify(mock).get_value()
\`\`\`

## Best Practices
1. One assertion per test (when practical)
2. Test behavior, not implementation
3. Use descriptive test names
4. auto_free() all created nodes
5. Test edge cases and error paths`,
};

export class AgentManager {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Get agent prompt by type
   */
  async getAgentPrompt(agentType: string): Promise<string> {
    const prompt = AGENT_PROMPTS[agentType];
    if (!prompt) {
      throw new Error(
        `Unknown agent type: ${agentType}. Available: ${Object.keys(AGENT_PROMPTS).join(", ")}`
      );
    }
    return prompt;
  }

  /**
   * Invoke a specialized agent
   */
  async invokeAgent(args: {
    agent: string;
    task: string;
    context?: any;
  }): Promise<any> {
    const { agent, task, context } = args;

    const agentPrompt = AGENT_PROMPTS[agent];
    if (!agentPrompt) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown agent: ${agent}. Available agents: ${Object.keys(AGENT_PROMPTS).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    // Build context-aware response
    const response = this.buildAgentResponse(agent, task, context);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private buildAgentResponse(agent: string, task: string, context?: any): any {
    const response: any = {
      agent,
      task,
      expertise: this.getAgentExpertise(agent),
      recommendations: [],
      relevant_patterns: [],
      warnings: [],
    };

    // Add task-specific recommendations based on keywords
    const taskLower = task.toLowerCase();

    switch (agent) {
      case "ui-specialist":
        if (taskLower.includes("button")) {
          response.recommendations.push(
            "Use UIStyleFactory for button styles",
            "Connect hover/pressed signals for feedback",
            "Set focus_mode for keyboard navigation"
          );
          response.relevant_patterns.push({
            name: "Button styling",
            code: `button.add_theme_stylebox_override("normal", UIStyleFactory.create_button_style())`,
          });
        }
        if (taskLower.includes("panel") || taskLower.includes("dialog")) {
          response.recommendations.push(
            "Use PanelContainer as root",
            "Add MarginContainer for padding",
            "Center with set_anchors_preset(PRESET_CENTER)"
          );
        }
        if (taskLower.includes("animation") || taskLower.includes("transition")) {
          response.recommendations.push(
            "Use AnimationEffects utility methods",
            "Standard duration: 0.25s for UI transitions",
            "Ease: EASE_OUT, Trans: TRANS_CUBIC for smooth feel"
          );
        }
        break;

      case "battle-system":
        if (taskLower.includes("damage")) {
          response.recommendations.push(
            "Use damage formula from battle_calculator.gd",
            "Apply elemental modifiers",
            "Emit damage_dealt signal for UI updates"
          );
          response.relevant_patterns.push({
            name: "Damage calculation",
            code: `var damage = max(1, attacker.attack * skill.power - defender.defense / 2)`,
          });
        }
        if (taskLower.includes("turn") || taskLower.includes("order")) {
          response.recommendations.push(
            "Sort by speed stat",
            "Handle ties with secondary sort",
            "Emit turn_started signal"
          );
        }
        if (taskLower.includes("status") || taskLower.includes("buff") || taskLower.includes("debuff")) {
          response.recommendations.push(
            "Check for immunity first",
            "Handle stacking rules",
            "Tick duration on turn end"
          );
        }
        break;

      case "animation":
        if (taskLower.includes("tween")) {
          response.recommendations.push(
            "Kill existing tween before creating new one",
            "Use create_tween() not Tween.new()",
            "Chain with method chaining"
          );
          response.warnings.push(
            "Never store tweens on node if node might be freed"
          );
        }
        if (taskLower.includes("sprite") || taskLower.includes("sheet")) {
          response.recommendations.push(
            "Use AnimatedSprite2D for simple animations",
            "AnimationPlayer for complex timing",
            "SpriteFrames for sprite sheet management"
          );
        }
        if (taskLower.includes("shake") || taskLower.includes("screen")) {
          response.recommendations.push(
            "Use AnimationEffects.shake() utility",
            "Intensity typically 5-20 pixels",
            "Duration typically 0.2-0.5 seconds"
          );
        }
        break;

      case "performance":
        if (taskLower.includes("slow") || taskLower.includes("lag") || taskLower.includes("fps")) {
          response.recommendations.push(
            "Profile with Debugger > Profiler",
            "Check for get_node() in _process",
            "Look for object creation in loops"
          );
          response.warnings.push(
            "Don't optimize prematurely - profile first"
          );
        }
        if (taskLower.includes("memory") || taskLower.includes("leak")) {
          response.recommendations.push(
            "Check Monitors > Memory",
            "Look for circular references",
            "Ensure queue_free() is called"
          );
        }
        if (taskLower.includes("pool")) {
          response.recommendations.push(
            "Pool frequently created/destroyed objects",
            "Pre-warm pool during loading",
            "Return objects instead of freeing"
          );
        }
        break;

      case "testing":
        if (taskLower.includes("write") || taskLower.includes("create")) {
          response.recommendations.push(
            "Use godot_generate_test tool first",
            "One assertion per test when practical",
            "Use auto_free() for all created nodes"
          );
        }
        if (taskLower.includes("signal")) {
          response.recommendations.push(
            "Use monitor_signals() to track emissions",
            "await assert_signal() for async signals",
            "Check both emission and arguments"
          );
        }
        if (taskLower.includes("mock") || taskLower.includes("stub")) {
          response.recommendations.push(
            "Use mock() for class mocking",
            "do_return() to set return values",
            "verify() to check method calls"
          );
        }
        break;
    }

    return response;
  }

  private getAgentExpertise(agent: string): string[] {
    const expertise: Record<string, string[]> = {
      "ui-specialist": [
        "Control nodes",
        "Theme system",
        "Responsive layouts",
        "Focus handling",
        "UI animation",
      ],
      "battle-system": [
        "Turn-based combat",
        "Damage calculation",
        "Status effects",
        "AI behavior",
        "Battle flow",
      ],
      animation: [
        "Tweens",
        "AnimationPlayer",
        "Sprite sheets",
        "Particles",
        "Screen effects",
      ],
      performance: [
        "Profiling",
        "Memory management",
        "Object pooling",
        "Draw optimization",
        "GDScript patterns",
      ],
      testing: [
        "GdUnit4",
        "Assertions",
        "Mocking",
        "Signal testing",
        "Scene testing",
      ],
    };
    return expertise[agent] || [];
  }

  /**
   * Get prompt for named prompts
   */
  async getPrompt(
    name: string,
    args: Record<string, string>
  ): Promise<any> {
    switch (name) {
      case "analyze-code":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Analyze the GDScript file: ${args.file}

Analysis depth: ${args.depth || "standard"}

Please provide:
1. Code structure overview
2. Quality issues and suggestions
3. CLAUDE.md compliance check
4. Performance considerations
5. Testing recommendations`,
              },
            },
          ],
        };

      case "generate-tests":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Generate GdUnit4 tests for: ${args.file}

Coverage target: ${args.coverage || "standard"}

Please:
1. Analyze the source file
2. Generate test cases for public methods
3. Include edge cases
4. Add signal tests if applicable
5. Follow GdUnit4 best practices`,
              },
            },
          ],
        };

      case "refactor-code":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Suggest refactoring for: ${args.file}

Focus area: ${args.focus || "all"}

Please analyze and suggest:
1. Code organization improvements
2. Utility class usage opportunities
3. Performance optimizations
4. Readability enhancements
5. Design pattern applications`,
              },
            },
          ],
        };

      case "invoke-agent":
        const agentPrompt = AGENT_PROMPTS[args.agent];
        return {
          messages: [
            {
              role: "system",
              content: {
                type: "text",
                text: agentPrompt || "General Godot development assistant",
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text: args.task,
              },
            },
          ],
        };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
