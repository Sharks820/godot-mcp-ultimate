/**
 * AI-Powered Code Generation
 * Smart code completion, generation, and refactoring
 */

import * as fs from "fs";
import * as path from "path";
import { Config } from "../utils/config.js";
import fg from "fast-glob";

// GDScript patterns and templates for intelligent generation
const GDSCRIPT_TEMPLATES: Record<string, string> = {
  // Node templates
  node2d: `extends Node2D

## Description of this node
class_name {CLASS_NAME}

# Signals
signal {signal_name}

# Exports
@export var speed: float = 100.0

# Onready
@onready var sprite: Sprite2D = $Sprite2D

# Private
var _velocity: Vector2 = Vector2.ZERO


func _ready() -> void:
\tpass


func _process(delta: float) -> void:
\tpass
`,

  control: `extends Control

## UI Component
class_name {CLASS_NAME}

# Signals
signal pressed
signal value_changed(new_value: Variant)

# Exports
@export var label_text: String = ""

# Onready
@onready var label: Label = $Label
@onready var button: Button = $Button


func _ready() -> void:
\t_setup_ui()
\t_connect_signals()


func _setup_ui() -> void:
\tif label:
\t\tlabel.text = label_text


func _connect_signals() -> void:
\tif button:
\t\tbutton.pressed.connect(_on_button_pressed)


func _on_button_pressed() -> void:
\tpressed.emit()
`,

  resource: `extends Resource

## Data Resource
class_name {CLASS_NAME}

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var icon: Texture2D


func _init(p_id: String = "", p_name: String = "") -> void:
\tid = p_id
\tdisplay_name = p_name
`,

  autoload: `extends Node

## Singleton Autoload
# Add to Project Settings > Autoload

signal initialized


var _is_ready: bool = false


func _ready() -> void:
\t_initialize()


func _initialize() -> void:
\t# Setup logic here
\t_is_ready = true
\tinitialized.emit()


func is_ready() -> bool:
\treturn _is_ready
`,

  state_machine: `extends Node

## Finite State Machine
class_name StateMachine

signal state_changed(from_state: String, to_state: String)

@export var initial_state: String = "idle"

var current_state: String = ""
var states: Dictionary = {}


func _ready() -> void:
\tawait owner.ready
\t_setup_states()
\tchange_state(initial_state)


func _setup_states() -> void:
\t# Override in child class to register states
\tpass


func register_state(state_name: String, state_node: Node) -> void:
\tstates[state_name] = state_node
\tstate_node.state_machine = self


func change_state(new_state: String, data: Dictionary = {}) -> void:
\tif not states.has(new_state):
\t\tpush_error("State not found: " + new_state)
\t\treturn
\t
\tvar old_state = current_state
\t
\tif current_state and states.has(current_state):
\t\tstates[current_state].exit()
\t
\tcurrent_state = new_state
\tstates[current_state].enter(data)
\t
\tstate_changed.emit(old_state, new_state)


func _process(delta: float) -> void:
\tif current_state and states.has(current_state):
\t\tstates[current_state].update(delta)


func _physics_process(delta: float) -> void:
\tif current_state and states.has(current_state):
\t\tstates[current_state].physics_update(delta)
`,

  state: `extends Node

## State for StateMachine
class_name State

var state_machine: StateMachine


func enter(data: Dictionary = {}) -> void:
\t# Called when entering this state
\tpass


func exit() -> void:
\t# Called when leaving this state
\tpass


func update(delta: float) -> void:
\t# Called every frame
\tpass


func physics_update(delta: float) -> void:
\t# Called every physics frame
\tpass
`,

  event_bus: `extends Node

## Global Event Bus for decoupled communication
# Usage: EventBus.emit_event("event_name", data)
#        EventBus.subscribe("event_name", callable)

var _subscribers: Dictionary = {}


func subscribe(event_name: String, callback: Callable) -> void:
\tif not _subscribers.has(event_name):
\t\t_subscribers[event_name] = []
\t_subscribers[event_name].append(callback)


func unsubscribe(event_name: String, callback: Callable) -> void:
\tif _subscribers.has(event_name):
\t\t_subscribers[event_name].erase(callback)


func emit_event(event_name: String, data: Variant = null) -> void:
\tif not _subscribers.has(event_name):
\t\treturn
\t
\tfor callback in _subscribers[event_name]:
\t\tif callback.is_valid():
\t\t\tif data != null:
\t\t\t\tcallback.call(data)
\t\t\telse:
\t\t\t\tcallback.call()


func clear_event(event_name: String) -> void:
\tif _subscribers.has(event_name):
\t\t_subscribers.erase(event_name)
`,

  object_pool: `extends Node

## Object Pool for performance
class_name ObjectPool

@export var scene: PackedScene
@export var initial_size: int = 10

var _pool: Array[Node] = []
var _active: Array[Node] = []


func _ready() -> void:
\t_prewarm()


func _prewarm() -> void:
\tfor i in initial_size:
\t\tvar obj = scene.instantiate()
\t\tobj.set_process(false)
\t\tobj.hide()
\t\t_pool.append(obj)
\t\tadd_child(obj)


func get_object() -> Node:
\tvar obj: Node
\t
\tif _pool.is_empty():
\t\tobj = scene.instantiate()
\t\tadd_child(obj)
\telse:
\t\tobj = _pool.pop_back()
\t
\tobj.set_process(true)
\tobj.show()
\t_active.append(obj)
\treturn obj


func return_object(obj: Node) -> void:
\tif not obj in _active:
\t\treturn
\t
\t_active.erase(obj)
\tobj.set_process(false)
\tobj.hide()
\t_pool.append(obj)


func return_all() -> void:
\tfor obj in _active.duplicate():
\t\treturn_object(obj)
`,

  tween_helper: `extends RefCounted

## Tween utility functions
class_name TweenHelper

const DEFAULT_DURATION := 0.25
const DEFAULT_EASE := Tween.EASE_OUT
const DEFAULT_TRANS := Tween.TRANS_CUBIC


static func fade_in(node: CanvasItem, duration: float = DEFAULT_DURATION) -> Tween:
\tnode.modulate.a = 0.0
\tvar tween = node.create_tween()
\ttween.set_ease(DEFAULT_EASE).set_trans(DEFAULT_TRANS)
\ttween.tween_property(node, "modulate:a", 1.0, duration)
\treturn tween


static func fade_out(node: CanvasItem, duration: float = DEFAULT_DURATION) -> Tween:
\tvar tween = node.create_tween()
\ttween.set_ease(DEFAULT_EASE).set_trans(DEFAULT_TRANS)
\ttween.tween_property(node, "modulate:a", 0.0, duration)
\treturn tween


static func slide_in(node: Control, from: Vector2, duration: float = DEFAULT_DURATION) -> Tween:
\tvar target_pos = node.position
\tnode.position = from
\tvar tween = node.create_tween()
\ttween.set_ease(DEFAULT_EASE).set_trans(DEFAULT_TRANS)
\ttween.tween_property(node, "position", target_pos, duration)
\treturn tween


static func pop(node: CanvasItem, scale_factor: float = 1.2, duration: float = 0.1) -> Tween:
\tvar tween = node.create_tween()
\ttween.tween_property(node, "scale", Vector2.ONE * scale_factor, duration)
\ttween.tween_property(node, "scale", Vector2.ONE, duration)
\treturn tween


static func shake(node: Node2D, intensity: float = 10.0, duration: float = 0.3) -> Tween:
\tvar original_pos = node.position
\tvar tween = node.create_tween()
\tvar shake_count = int(duration / 0.05)
\t
\tfor i in shake_count:
\t\tvar offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * intensity
\t\ttween.tween_property(node, "position", original_pos + offset, 0.05)
\t\tintensity *= 0.9
\t
\ttween.tween_property(node, "position", original_pos, 0.05)
\treturn tween
`,
};

// Common GDScript patterns
const CODE_PATTERNS: Record<string, { pattern: string; replacement: string; description: string }[]> = {
  signals: [
    {
      pattern: "emit_signal(\"$NAME\")",
      replacement: "$NAME.emit()",
      description: "Modern signal emission (Godot 4.x)",
    },
  ],
  null_safety: [
    {
      pattern: "if $NODE:\n\t$NODE.$METHOD()",
      replacement: "if is_instance_valid($NODE):\n\t$NODE.$METHOD()",
      description: "Safe null check for nodes",
    },
  ],
  typing: [
    {
      pattern: "var $NAME = $VALUE",
      replacement: "var $NAME: $TYPE = $VALUE",
      description: "Add type annotation",
    },
    {
      pattern: "func $NAME($PARAMS):",
      replacement: "func $NAME($PARAMS) -> $RETURN:",
      description: "Add return type annotation",
    },
  ],
};

export class CodeGenerator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Generate code from template
   */
  async generateFromTemplate(args: {
    template: string;
    class_name?: string;
    output?: string;
    options?: Record<string, string>;
  }): Promise<any> {
    const { template, class_name, output, options = {} } = args;

    const templateCode = GDSCRIPT_TEMPLATES[template];
    if (!templateCode) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Unknown template: ${template}`,
                available: Object.keys(GDSCRIPT_TEMPLATES),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Replace placeholders
    let code = templateCode;
    if (class_name) {
      code = code.replace(/{CLASS_NAME}/g, class_name);
    }
    for (const [key, value] of Object.entries(options)) {
      code = code.replace(new RegExp(`{${key}}`, "g"), value);
    }

    // Remove unused placeholders
    code = code.replace(/{[^}]+}/g, "");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              template,
              class_name,
              output_path: output,
              code,
              instructions: output
                ? `Save to: ${output}`
                : "Copy the code above to your new file",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Generate smart code completion suggestions
   */
  async getSuggestions(args: {
    file: string;
    line: number;
    prefix: string;
  }): Promise<any> {
    const { file, line, prefix } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const currentLine = lines[line - 1] || "";
    const context = this.analyzeContext(lines, line);

    const suggestions = this.generateSuggestions(prefix, context, content);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              prefix,
              context: context.type,
              suggestions,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Auto-fix common issues
   */
  async autoFix(args: { file: string; fixes?: string[] }): Promise<any> {
    const { file, fixes } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `File not found: ${file}` }],
        isError: true,
      };
    }

    let content = fs.readFileSync(filePath, "utf-8");
    const appliedFixes: string[] = [];

    // Auto-fixes
    const autoFixes = [
      {
        name: "modern_signals",
        pattern: /emit_signal\("(\w+)"([^)]*)\)/g,
        replacement: (match: string, signal: string, args: string) => {
          const cleanArgs = args.replace(/^\s*,\s*/, "");
          return cleanArgs ? `${signal}.emit(${cleanArgs})` : `${signal}.emit()`;
        },
        description: "Convert emit_signal() to modern .emit() syntax",
      },
      {
        name: "safe_queue_free",
        pattern: /(\w+)\.queue_free\(\)(?!\s*#\s*safe)/g,
        replacement: (match: string, varName: string) => {
          return `if is_instance_valid(${varName}):\n\t${varName}.queue_free()`;
        },
        description: "Add is_instance_valid check before queue_free",
        skip: (content: string, match: string) => {
          // Skip if already inside an if is_instance_valid block
          const lineIndex = content.indexOf(match);
          const prevLines = content.slice(0, lineIndex).split("\n").slice(-3).join("\n");
          return prevLines.includes("is_instance_valid");
        },
      },
      {
        name: "trailing_whitespace",
        pattern: /[ \t]+$/gm,
        replacement: "",
        description: "Remove trailing whitespace",
      },
      {
        name: "double_blank_lines",
        pattern: /\n{3,}/g,
        replacement: "\n\n",
        description: "Reduce multiple blank lines to two",
      },
    ];

    const fixesToApply = fixes
      ? autoFixes.filter((f) => fixes.includes(f.name))
      : autoFixes;

    for (const fix of fixesToApply) {
      const originalContent = content;

      if (typeof fix.replacement === "function") {
        content = content.replace(fix.pattern, fix.replacement as any);
      } else {
        content = content.replace(fix.pattern, fix.replacement);
      }

      if (content !== originalContent) {
        appliedFixes.push(fix.description);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              file,
              applied_fixes: appliedFixes,
              changes_made: appliedFixes.length > 0,
              fixed_content: content,
              instructions: appliedFixes.length > 0
                ? "Review the fixed content and save if appropriate"
                : "No fixes needed",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Generate boilerplate for a new feature
   */
  async generateFeature(args: {
    feature_type: string;
    name: string;
    options?: Record<string, any>;
  }): Promise<any> {
    const { feature_type, name, options = {} } = args;

    const features: Record<string, () => any> = {
      skill: () => this.generateSkillFeature(name, options),
      monster: () => this.generateMonsterFeature(name, options),
      ui_component: () => this.generateUIComponent(name, options),
      status_effect: () => this.generateStatusEffect(name, options),
      battle_action: () => this.generateBattleAction(name, options),
    };

    const generator = features[feature_type];
    if (!generator) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Unknown feature type: ${feature_type}`,
                available: Object.keys(features),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const result = generator();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private analyzeContext(
    lines: string[],
    currentLine: number
  ): { type: string; data: any } {
    // Look at surrounding lines to determine context
    const prevLines = lines.slice(Math.max(0, currentLine - 5), currentLine);
    const currentText = lines[currentLine - 1] || "";

    // Check what context we're in
    for (let i = prevLines.length - 1; i >= 0; i--) {
      const line = prevLines[i].trim();

      if (line.startsWith("func ")) {
        return { type: "function_body", data: { functionLine: line } };
      }
      if (line.startsWith("class ") || line.startsWith("class_name ")) {
        return { type: "class_body", data: { className: line } };
      }
      if (line.startsWith("match ")) {
        return { type: "match_body", data: { matchLine: line } };
      }
      if (line.startsWith("if ") || line.startsWith("elif ") || line.startsWith("else:")) {
        return { type: "conditional", data: {} };
      }
      if (line.startsWith("for ") || line.startsWith("while ")) {
        return { type: "loop", data: {} };
      }
    }

    // Check current line
    if (currentText.includes(".")) {
      return { type: "member_access", data: {} };
    }
    if (currentText.includes("(")) {
      return { type: "function_call", data: {} };
    }

    return { type: "general", data: {} };
  }

  private generateSuggestions(
    prefix: string,
    context: { type: string; data: any },
    fileContent: string
  ): any[] {
    const suggestions: any[] = [];
    const prefixLower = prefix.toLowerCase();

    // Common completions based on context
    const contextSuggestions: Record<string, any[]> = {
      function_body: [
        { label: "return", snippet: "return ${1:value}" },
        { label: "await", snippet: "await ${1:expression}" },
        { label: "var", snippet: "var ${1:name}: ${2:Type} = ${3:value}" },
        { label: "if", snippet: "if ${1:condition}:\n\t${2:pass}" },
        { label: "for", snippet: "for ${1:item} in ${2:collection}:\n\t${3:pass}" },
        { label: "match", snippet: "match ${1:value}:\n\t${2:pattern}:\n\t\t${3:pass}" },
      ],
      class_body: [
        { label: "func", snippet: "func ${1:name}(${2:params}) -> ${3:void}:\n\t${4:pass}" },
        { label: "var", snippet: "var ${1:name}: ${2:Type}" },
        { label: "const", snippet: "const ${1:NAME}: ${2:Type} = ${3:value}" },
        { label: "signal", snippet: "signal ${1:name}(${2:params})" },
        { label: "@export", snippet: "@export var ${1:name}: ${2:Type}" },
        { label: "@onready", snippet: "@onready var ${1:name}: ${2:Type} = $${3:NodePath}" },
      ],
      member_access: [
        { label: "emit", snippet: "emit(${1:args})" },
        { label: "connect", snippet: "connect(${1:callable})" },
        { label: "queue_free", snippet: "queue_free()" },
        { label: "get_node", snippet: 'get_node("${1:path}")' },
        { label: "add_child", snippet: "add_child(${1:node})" },
      ],
      general: [
        { label: "print", snippet: "print(${1:value})" },
        { label: "push_error", snippet: 'push_error("${1:message}")' },
        { label: "assert", snippet: "assert(${1:condition}, ${2:message})" },
      ],
    };

    // Add context-specific suggestions
    const ctxSuggestions = contextSuggestions[context.type] || contextSuggestions.general;
    for (const sugg of ctxSuggestions) {
      if (sugg.label.toLowerCase().startsWith(prefixLower)) {
        suggestions.push(sugg);
      }
    }

    // Extract symbols from file for local completions
    const symbolPatterns = [
      /var\s+(\w+)/g,
      /const\s+(\w+)/g,
      /func\s+(\w+)/g,
      /signal\s+(\w+)/g,
    ];

    for (const pattern of symbolPatterns) {
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        if (match[1].toLowerCase().startsWith(prefixLower)) {
          suggestions.push({
            label: match[1],
            kind: pattern.source.includes("func") ? "function" : "variable",
          });
        }
      }
    }

    return suggestions.slice(0, 20);
  }

  private generateSkillFeature(name: string, options: Record<string, any>): any {
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");
    const pascalName = name.replace(/(?:^|\s)\w/g, (m) => m.toUpperCase()).replace(/\s/g, "");

    return {
      files: [
        {
          path: `data/skills/${snakeName}.tres`,
          content: `[gd_resource type="Resource" script_class="SkillData" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/data/skill_data.gd" id="1"]

[resource]
script = ExtResource("1")
id = "${snakeName}"
display_name = "${name}"
description = "${options.description || "A powerful skill."}"
skill_type = ${options.type || 0}
target_type = ${options.target || 0}
power = ${options.power || 100}
mp_cost = ${options.mp_cost || 10}
cooldown = ${options.cooldown || 0}
`,
        },
      ],
      instructions: [
        `Created skill resource at data/skills/${snakeName}.tres`,
        "Add to DataManager skill list",
        "Configure animations if needed",
      ],
    };
  }

  private generateMonsterFeature(name: string, options: Record<string, any>): any {
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");

    return {
      files: [
        {
          path: `data/monsters/${snakeName}.tres`,
          content: `[gd_resource type="Resource" script_class="MonsterData" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/data/monster_data.gd" id="1"]

[resource]
script = ExtResource("1")
id = "${snakeName}"
display_name = "${name}"
max_hp = ${options.hp || 100}
attack = ${options.attack || 10}
defense = ${options.defense || 5}
speed = ${options.speed || 10}
element = ${options.element || 0}
skills = []
`,
        },
      ],
      instructions: [
        `Created monster resource at data/monsters/${snakeName}.tres`,
        "Add sprite to assets/sprites/monsters/",
        "Configure skills array",
      ],
    };
  }

  private generateUIComponent(name: string, options: Record<string, any>): any {
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");
    const pascalName = name.replace(/(?:^|\s)\w/g, (m) => m.toUpperCase()).replace(/\s/g, "");

    return {
      files: [
        {
          path: `scripts/ui/${snakeName}.gd`,
          content: `extends Control

## ${name} UI Component
class_name ${pascalName}

signal value_changed(new_value: Variant)

@export var initial_value: Variant


func _ready() -> void:
\t_setup()


func _setup() -> void:
\t# Configure UI elements
\tpass


func set_value(value: Variant) -> void:
\t# Update display
\tvalue_changed.emit(value)
`,
        },
        {
          path: `scenes/ui/${snakeName}.tscn`,
          content: `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/ui/${snakeName}.gd" id="1"]

[node name="${pascalName}" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1")
`,
        },
      ],
      instructions: [
        `Created UI component: ${pascalName}`,
        `Script: scripts/ui/${snakeName}.gd`,
        `Scene: scenes/ui/${snakeName}.tscn`,
      ],
    };
  }

  private generateStatusEffect(name: string, options: Record<string, any>): any {
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");

    return {
      files: [
        {
          path: `data/status_effects/${snakeName}.tres`,
          content: `[gd_resource type="Resource" script_class="StatusEffectData" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/data/status_effect_data.gd" id="1"]

[resource]
script = ExtResource("1")
id = "${snakeName}"
display_name = "${name}"
description = "${options.description || "A status effect."}"
duration = ${options.duration || 3}
is_debuff = ${options.is_debuff || false}
stacks = ${options.stacks || false}
`,
        },
      ],
      instructions: [
        `Created status effect: ${name}`,
        "Implement on_apply, on_tick, on_remove logic",
      ],
    };
  }

  private generateBattleAction(name: string, options: Record<string, any>): any {
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");
    const pascalName = name.replace(/(?:^|\s)\w/g, (m) => m.toUpperCase()).replace(/\s/g, "");

    return {
      files: [
        {
          path: `scripts/battle/actions/${snakeName}_action.gd`,
          content: `extends BattleAction

## ${name} Battle Action
class_name ${pascalName}Action


func can_execute(actor: BattleUnit, targets: Array[BattleUnit]) -> bool:
\t# Check if action can be performed
\treturn true


func execute(actor: BattleUnit, targets: Array[BattleUnit]) -> void:
\t# Perform the action
\tfor target in targets:
\t\t# Apply effect
\t\tpass
\t
\taction_completed.emit()


func get_valid_targets(actor: BattleUnit, all_units: Array[BattleUnit]) -> Array[BattleUnit]:
\t# Return valid targets for this action
\treturn all_units.filter(func(u): return u.is_alive)
`,
        },
      ],
      instructions: [
        `Created battle action: ${pascalName}Action`,
        "Register in BattleActionManager",
        "Configure targeting rules",
      ],
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): string[] {
    return Object.keys(GDSCRIPT_TEMPLATES);
  }

  /**
   * Get available feature types
   */
  getFeatureTypes(): string[] {
    return ["skill", "monster", "ui_component", "status_effect", "battle_action"];
  }
}
