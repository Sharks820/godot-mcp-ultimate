/**
 * GODOT BRAIN - Comprehensive Godot 4.x Knowledge Engine
 *
 * This is the CORE INTELLIGENCE - deep knowledge of:
 * - GDScript syntax, idioms, and best practices
 * - Godot 4.x API and breaking changes from 3.x
 * - Common pitfalls and how to avoid them
 * - Performance patterns
 * - Architecture patterns for games
 */

// =============================================================================
// GDSCRIPT SYNTAX RULES - For validation and generation
// =============================================================================

export const GDSCRIPT_SYNTAX = {
  // Keywords that cannot be used as identifiers
  keywords: new Set([
    "if", "elif", "else", "for", "while", "match", "break", "continue", "pass",
    "return", "class", "class_name", "extends", "is", "as", "self", "signal",
    "func", "static", "const", "enum", "var", "breakpoint", "preload", "await",
    "yield", "assert", "void", "PI", "TAU", "INF", "NAN", "true", "false", "null",
    "not", "and", "or", "in", "super"
  ]),

  // Built-in types
  types: new Set([
    "bool", "int", "float", "String", "StringName", "NodePath", "Vector2", "Vector2i",
    "Vector3", "Vector3i", "Vector4", "Vector4i", "Rect2", "Rect2i", "Transform2D",
    "Transform3D", "Plane", "Quaternion", "AABB", "Basis", "Projection", "Color",
    "RID", "Object", "Callable", "Signal", "Dictionary", "Array", "PackedByteArray",
    "PackedInt32Array", "PackedInt64Array", "PackedFloat32Array", "PackedFloat64Array",
    "PackedStringArray", "PackedVector2Array", "PackedVector3Array", "PackedColorArray"
  ]),

  // Annotations (decorators)
  annotations: new Set([
    "@export", "@export_range", "@export_enum", "@export_file", "@export_dir",
    "@export_multiline", "@export_placeholder", "@export_flags", "@export_exp_easing",
    "@export_color_no_alpha", "@export_node_path", "@export_flags_2d_physics",
    "@export_flags_2d_render", "@export_flags_2d_navigation", "@export_flags_3d_physics",
    "@export_flags_3d_render", "@export_flags_3d_navigation", "@export_category",
    "@export_group", "@export_subgroup", "@onready", "@tool", "@icon", "@warning_ignore"
  ]),

  // Virtual methods that should be overridden
  virtualMethods: {
    Node: ["_ready", "_enter_tree", "_exit_tree", "_process", "_physics_process", "_input", "_unhandled_input", "_notification"],
    Control: ["_gui_input", "_has_point", "_get_minimum_size", "_make_custom_tooltip"],
    Node2D: ["_draw"],
    Node3D: [],
    Resource: ["_setup_local_to_scene"],
    Object: ["_init", "_to_string", "_get", "_set", "_get_property_list", "_notification"],
  },

  // Indentation rules
  indentation: {
    usesTabs: true,
    tabSize: 4,
    increaseAfter: [":", "\\"],
  }
};

// =============================================================================
// GODOT 4.x BREAKING CHANGES FROM 3.x - Critical for migration/validation
// =============================================================================

export const GODOT_4_CHANGES = {
  // Renamed classes
  renamedClasses: {
    "Spatial": "Node3D",
    "KinematicBody": "CharacterBody3D",
    "KinematicBody2D": "CharacterBody2D",
    "RigidBody": "RigidBody3D",
    "StaticBody": "StaticBody3D",
    "Area": "Area3D",
    "Particles": "GPUParticles3D",
    "Particles2D": "GPUParticles2D",
    "Light": "Light3D",
    "Camera": "Camera3D",
    "Listener": "AudioListener3D",
    "ARVRCamera": "XRCamera3D",
    "ARVRController": "XRController3D",
    "ARVRAnchor": "XRAnchor3D",
    "ARVROrigin": "XROrigin3D",
    "ARVRServer": "XRServer",
    "CubeMesh": "BoxMesh",
    "Texture": "Texture2D",
    "ViewportTexture": "ViewportTexture",
    "VisibilityNotifier": "VisibleOnScreenNotifier3D",
    "VisibilityNotifier2D": "VisibleOnScreenNotifier2D",
    "VisibilityEnabler": "VisibleOnScreenEnabler3D",
    "VisibilityEnabler2D": "VisibleOnScreenEnabler2D",
    "Directory": "DirAccess",
    "File": "FileAccess",
    "Reference": "RefCounted",
    "StreamPeerSSL": "StreamPeerTLS",
    "PackedScene": "PackedScene",
    "PoolByteArray": "PackedByteArray",
    "PoolIntArray": "PackedInt32Array",
    "PoolRealArray": "PackedFloat32Array",
    "PoolStringArray": "PackedStringArray",
    "PoolVector2Array": "PackedVector2Array",
    "PoolVector3Array": "PackedVector3Array",
    "PoolColorArray": "PackedColorArray",
  },

  // Renamed methods
  renamedMethods: {
    "instance": "instantiate",
    "connect('signal', obj, 'method')": "signal.connect(callable)",
    "emit_signal('name', args)": "name.emit(args)",
    "yield(obj, 'signal')": "await obj.signal",
    "is_instance_valid": "is_instance_valid",
    "get_child_count": "get_child_count",
    "call_deferred": "call_deferred",
    "funcref": "Callable",
    "rand_range": "randf_range",
    "stepify": "snapped",
    "str2var": "str_to_var",
    "var2str": "var_to_str",
    "parse_json": "JSON.parse_string",
    "to_json": "JSON.stringify",
    "load_interactive": "ResourceLoader.load_threaded_request",
    ".xform(": "* ",
    ".xform_inv(": "* ",
    ".length()": ".length()", // same but good to note
    ".distance_to(": ".distance_to(",
  },

  // Signal connection changes
  signalChanges: {
    old: 'node.connect("signal_name", self, "_on_method")',
    new: 'node.signal_name.connect(_on_method)',
    note: "Signals are now first-class objects in Godot 4"
  },

  // Export changes
  exportChanges: {
    old: 'export(int, 0, 100) var health = 100',
    new: '@export_range(0, 100) var health: int = 100',
    note: "Use typed exports with annotations"
  },

  // Yield to await
  awaitChanges: {
    old: 'yield(get_tree().create_timer(1.0), "timeout")',
    new: 'await get_tree().create_timer(1.0).timeout',
    note: "yield is replaced with await"
  }
};

// =============================================================================
// COMMON PITFALLS AND SOLUTIONS
// =============================================================================

export const COMMON_PITFALLS = [
  {
    name: "null_node_reference",
    description: "Accessing a node that doesn't exist or has been freed",
    badCode: `$SomeNode.do_something()`,
    goodCode: `if $SomeNode:
    $SomeNode.do_something()`,
    betterCode: `if is_instance_valid($SomeNode):
    $SomeNode.do_something()`,
    explanation: "Nodes can be null if path is wrong, or freed during gameplay. Always validate."
  },
  {
    name: "orphan_nodes",
    description: "Creating nodes without adding them to tree or freeing them",
    badCode: `var node = Node2D.new()
# Node is leaked!`,
    goodCode: `var node = Node2D.new()
add_child(node)
# OR
node.queue_free()`,
    explanation: "Nodes created with .new() must be added to tree or freed manually"
  },
  {
    name: "signal_memory_leak",
    description: "Connecting signals to freed objects",
    badCode: `enemy.died.connect(player._on_enemy_died)
# If player is freed, crash!`,
    goodCode: `enemy.died.connect(player._on_enemy_died, CONNECT_ONE_SHOT)
# OR disconnect in _exit_tree`,
    betterCode: `if not enemy.died.is_connected(player._on_enemy_died):
    enemy.died.connect(player._on_enemy_died)`,
    explanation: "Disconnect signals when nodes are freed, or use CONNECT_ONE_SHOT"
  },
  {
    name: "process_waste",
    description: "Doing work in _process that doesn't need to happen every frame",
    badCode: `func _process(delta):
    var enemies = get_tree().get_nodes_in_group("enemies")
    for enemy in enemies:
        # expensive operation`,
    goodCode: `var _cached_enemies: Array[Node] = []

func _ready():
    get_tree().node_added.connect(_on_node_added)
    get_tree().node_removed.connect(_on_node_removed)
    _cached_enemies = get_tree().get_nodes_in_group("enemies")`,
    explanation: "Cache expensive lookups, don't repeat every frame"
  },
  {
    name: "tween_overwrite",
    description: "Creating new tweens without killing old ones",
    badCode: `func hover():
    create_tween().tween_property(self, "scale", Vector2(1.1, 1.1), 0.2)`,
    goodCode: `var _tween: Tween

func hover():
    if _tween:
        _tween.kill()
    _tween = create_tween()
    _tween.tween_property(self, "scale", Vector2(1.1, 1.1), 0.2)`,
    explanation: "Kill existing tweens before creating new ones to avoid conflicts"
  },
  {
    name: "string_in_loop",
    description: "String concatenation in performance-critical code",
    badCode: `for i in 1000:
    text += "item " + str(i) + "\\n"`,
    goodCode: `var parts: PackedStringArray = []
for i in 1000:
    parts.append("item %d" % i)
text = "\\n".join(parts)`,
    explanation: "String concatenation creates new strings each time. Use arrays and join."
  },
  {
    name: "dict_in_hot_path",
    description: "Dictionary lookups in frequently called code",
    badCode: `func _process(delta):
    var speed = stats["speed"]  # lookup every frame`,
    goodCode: `var _speed: float

func _ready():
    _speed = stats["speed"]

func _process(delta):
    position.x += _speed * delta`,
    explanation: "Cache dictionary values in variables for hot paths"
  },
  {
    name: "await_in_wrong_context",
    description: "Using await incorrectly",
    badCode: `func calculate() -> int:
    await get_tree().process_frame
    return 42`,
    goodCode: `func calculate() -> int:
    return 42

func async_calculate():
    await get_tree().process_frame
    return 42`,
    explanation: "Await functions should not have return type annotations (returns Signal implicitly)"
  },
  {
    name: "export_without_type",
    description: "Exports without type hints don't show in inspector correctly",
    badCode: `@export var damage = 10`,
    goodCode: `@export var damage: int = 10`,
    explanation: "Always use type hints with exports for proper inspector UI"
  },
  {
    name: "preload_in_loop",
    description: "Loading resources repeatedly",
    badCode: `func spawn_enemy():
    var scene = load("res://enemy.tscn")
    var enemy = scene.instantiate()`,
    goodCode: `const EnemyScene = preload("res://enemy.tscn")

func spawn_enemy():
    var enemy = EnemyScene.instantiate()`,
    explanation: "Use preload for resources loaded multiple times. Load happens at parse time."
  }
];

// =============================================================================
// ARCHITECTURE PATTERNS FOR GAMES
// =============================================================================

export const GAME_PATTERNS = {
  // State Machine pattern
  stateMachine: {
    name: "Finite State Machine",
    useCase: "Player states, enemy AI, game phases, UI screens",
    structure: `
# StateMachine.gd
extends Node
class_name StateMachine

@export var initial_state: State
var current_state: State
var states: Dictionary = {}

func _ready():
    for child in get_children():
        if child is State:
            states[child.name.to_lower()] = child
            child.state_machine = self
    if initial_state:
        current_state = initial_state
        current_state.enter()

func change_state(new_state_name: String, data: Dictionary = {}) -> void:
    if current_state:
        current_state.exit()
    current_state = states.get(new_state_name.to_lower())
    if current_state:
        current_state.enter(data)
`,
  },

  // Component pattern
  component: {
    name: "Component System",
    useCase: "Modular abilities, stats, behaviors",
    structure: `
# Component.gd
extends Node
class_name Component

func initialize(entity: Node) -> void:
    pass

func deinitialize() -> void:
    pass

# Usage in entity:
func add_component(component: Component) -> void:
    add_child(component)
    component.initialize(self)
`,
  },

  // Event Bus pattern
  eventBus: {
    name: "Event Bus (Observer)",
    useCase: "Decoupled communication between systems",
    structure: `
# EventBus.gd (Autoload)
extends Node

# Define signals for all game events
signal player_damaged(amount: int, source: Node)
signal enemy_killed(enemy: Node, killer: Node)
signal item_collected(item: Resource)
signal quest_updated(quest_id: String, status: int)

# Optional: dynamic event system
var _listeners: Dictionary = {}

func subscribe(event: String, callback: Callable) -> void:
    if not _listeners.has(event):
        _listeners[event] = []
    _listeners[event].append(callback)

func publish(event: String, data: Variant = null) -> void:
    if _listeners.has(event):
        for callback in _listeners[event]:
            if data != null:
                callback.call(data)
            else:
                callback.call()
`,
  },

  // Object Pool pattern
  objectPool: {
    name: "Object Pool",
    useCase: "Bullets, particles, frequently spawned objects",
    structure: `
# ObjectPool.gd
extends Node
class_name ObjectPool

@export var scene: PackedScene
@export var pool_size: int = 20

var _available: Array[Node] = []
var _in_use: Array[Node] = []

func _ready():
    for i in pool_size:
        _create_instance()

func _create_instance() -> Node:
    var instance = scene.instantiate()
    instance.set_process(false)
    instance.hide()
    add_child(instance)
    _available.append(instance)
    return instance

func acquire() -> Node:
    var instance: Node
    if _available.is_empty():
        instance = _create_instance()
    else:
        instance = _available.pop_back()
    _in_use.append(instance)
    instance.set_process(true)
    instance.show()
    return instance

func release(instance: Node) -> void:
    if instance in _in_use:
        _in_use.erase(instance)
        instance.set_process(false)
        instance.hide()
        _available.append(instance)
`,
  },

  // Command pattern for undo/redo
  command: {
    name: "Command Pattern",
    useCase: "Undo/redo, action queues, replays",
    structure: `
# Command.gd
extends RefCounted
class_name Command

func execute() -> void:
    pass

func undo() -> void:
    pass

# CommandManager.gd
extends Node

var _history: Array[Command] = []
var _redo_stack: Array[Command] = []

func execute(command: Command) -> void:
    command.execute()
    _history.append(command)
    _redo_stack.clear()

func undo() -> void:
    if _history.is_empty():
        return
    var command = _history.pop_back()
    command.undo()
    _redo_stack.append(command)

func redo() -> void:
    if _redo_stack.is_empty():
        return
    var command = _redo_stack.pop_back()
    command.execute()
    _history.append(command)
`,
  },

  // Service Locator for dependency injection
  serviceLocator: {
    name: "Service Locator",
    useCase: "Testable singletons, swappable implementations",
    structure: `
# Services.gd (Autoload)
extends Node

var _services: Dictionary = {}

func register(service_name: String, service: Object) -> void:
    _services[service_name] = service

func get_service(service_name: String) -> Object:
    return _services.get(service_name)

func has_service(service_name: String) -> bool:
    return _services.has(service_name)

# Usage:
# Services.register("audio", AudioManager.new())
# var audio = Services.get_service("audio") as AudioManager
`,
  }
};

// =============================================================================
// PERFORMANCE KNOWLEDGE
// =============================================================================

export const PERFORMANCE_KNOWLEDGE = {
  // What to profile
  profilingGuide: {
    tools: [
      "Debugger > Profiler - Function timing",
      "Debugger > Monitors - FPS, memory, objects",
      "Debugger > Video RAM - GPU memory usage",
      "print() with Time.get_ticks_msec() for custom timing"
    ],
    redFlags: [
      "_process or _physics_process taking >8ms",
      "Increasing memory over time (leak)",
      "Draw calls >1000 for 2D games",
      "Physics bodies >500 active"
    ]
  },

  // Optimization techniques
  techniques: {
    gdscript: [
      "Use static typing everywhere (up to 100% faster)",
      "Cache node references with @onready",
      "Avoid get_node() in loops",
      "Use StringName for dictionary keys in hot paths",
      "Prefer for-in over while loops",
      "Use Array methods (map, filter) sparingly in hot paths"
    ],
    rendering: [
      "Use visibility notifiers to disable off-screen nodes",
      "Batch similar sprites with CanvasGroup",
      "Use GPU particles over CPU particles",
      "Limit shader complexity on mobile",
      "Use texture atlases to reduce draw calls"
    ],
    physics: [
      "Use Area2D for detection, not collision",
      "Disable physics processing for sleeping bodies",
      "Use simple collision shapes (circles > rectangles > polygons)",
      "Limit raycasts per frame",
      "Use physics layers to reduce collision checks"
    ],
    memory: [
      "Free unused resources explicitly",
      "Use object pools for frequently created objects",
      "Avoid circular references",
      "Use WeakRef for optional references",
      "Load resources on demand with ResourceLoader.load_threaded"
    ]
  },

  // Benchmarks and targets
  targets: {
    desktop: {
      fps: 60,
      frameTime: 16.67, // ms
      drawCalls: 2000,
      physicsBodies: 1000
    },
    mobile: {
      fps: 60, // or 30 for complex games
      frameTime: 16.67, // or 33.33 for 30fps
      drawCalls: 500,
      physicsBodies: 200
    }
  }
};

// =============================================================================
// CODE VALIDATION RULES
// =============================================================================

export const VALIDATION_RULES = {
  // Syntax validation
  syntax: [
    {
      rule: "no_tabs_spaces_mix",
      check: (line: string) => !(/^\t+ /.test(line) || /^ +\t/.test(line)),
      message: "Don't mix tabs and spaces for indentation"
    },
    {
      rule: "trailing_whitespace",
      check: (line: string) => !/[ \t]+$/.test(line),
      message: "Remove trailing whitespace"
    },
    {
      rule: "line_length",
      check: (line: string) => line.length <= 120,
      message: "Line too long (max 120 characters)"
    }
  ],

  // Best practice validation
  bestPractice: [
    {
      rule: "typed_exports",
      pattern: /@export\s+var\s+\w+\s*[^:]/,
      message: "Add type hint to @export variable"
    },
    {
      rule: "return_type",
      pattern: /^func\s+\w+\([^)]*\)\s*:/m,
      message: "Add return type annotation to function"
    },
    {
      rule: "signal_naming",
      pattern: /^signal\s+(\w+)/,
      validate: (name: string) => /^[a-z_]+$/.test(name),
      message: "Signal names should be snake_case"
    },
    {
      rule: "constant_naming",
      pattern: /^const\s+(\w+)/,
      validate: (name: string) => /^[A-Z_][A-Z0-9_]*$/.test(name),
      message: "Constants should be UPPER_SNAKE_CASE"
    },
    {
      rule: "private_naming",
      pattern: /^var\s+_(\w+)|^func\s+_(?!ready|process|physics|input|enter|exit|init)(\w+)/,
      message: "Private members should start with underscore"
    }
  ],

  // VEILBREAKERS-specific rules
  projectSpecific: [
    {
      rule: "use_ui_style_factory",
      pattern: /StyleBoxFlat\.new\(\)/,
      message: "Use UIStyleFactory instead of StyleBoxFlat.new()"
    },
    {
      rule: "use_animation_effects",
      pattern: /create_tween\(\)\.tween_property.*(?:modulate|scale|position)/,
      message: "Consider using AnimationEffects utility for common animations"
    },
    {
      rule: "use_constants",
      pattern: /create_timer\([\d.]+\)|tween_property\([^)]+,\s*[\d.]+\)/,
      message: "Use Constants.WAIT_* instead of magic number delays"
    },
    {
      rule: "use_error_logger",
      pattern: /\bprint\(/,
      message: "Use ErrorLogger instead of print() for production code"
    },
    {
      rule: "safe_queue_free",
      pattern: /\.queue_free\(\)/,
      message: "Consider using NodeHelpers.safe_free() for safe cleanup"
    }
  ]
};

// =============================================================================
// INTELLIGENT CODE COMPLETION DATA
// =============================================================================

export const COMPLETION_DATA = {
  // Common method chains
  methodChains: {
    "create_tween()": [
      ".set_ease(Tween.EASE_*)",
      ".set_trans(Tween.TRANS_*)",
      ".set_parallel(true)",
      ".set_loops(count)",
      ".tween_property(obj, 'prop', value, duration)",
      ".tween_callback(callable)",
      ".tween_interval(seconds)",
      ".chain()"
    ],
    "get_tree()": [
      ".create_timer(seconds)",
      ".get_nodes_in_group('name')",
      ".call_group('name', 'method')",
      ".change_scene_to_file('path')",
      ".reload_current_scene()",
      ".paused = bool",
      ".current_scene"
    ],
    "Input": [
      ".is_action_pressed('action')",
      ".is_action_just_pressed('action')",
      ".is_action_just_released('action')",
      ".get_action_strength('action')",
      ".get_vector('left', 'right', 'up', 'down')",
      ".get_axis('negative', 'positive')"
    ]
  },

  // Common snippets
  snippets: {
    "ready": "func _ready() -> void:\n\t${0:pass}",
    "process": "func _process(delta: float) -> void:\n\t${0:pass}",
    "physics": "func _physics_process(delta: float) -> void:\n\t${0:pass}",
    "input": "func _input(event: InputEvent) -> void:\n\t${0:pass}",
    "export": "@export var ${1:name}: ${2:Type}${3: = default}",
    "onready": "@onready var ${1:name}: ${2:Type} = $${3:NodePath}",
    "signal": "signal ${1:name}(${2:params})",
    "connect": "${1:node}.${2:signal}.connect(${3:_on_signal})",
    "tween": "var tween = create_tween()\ntween.tween_property(${1:self}, \"${2:property}\", ${3:value}, ${4:0.3})",
    "timer": "await get_tree().create_timer(${1:1.0}).timeout",
    "for": "for ${1:item} in ${2:array}:\n\t${0:pass}",
    "match": "match ${1:value}:\n\t${2:pattern}:\n\t\t${0:pass}",
    "class": "class_name ${1:ClassName}\nextends ${2:Node}\n\n${0:}"
  }
};

// =============================================================================
// MASTER VALIDATION FUNCTION
// =============================================================================

export function validateGDScript(code: string, projectRules: boolean = true): {
  valid: boolean;
  errors: Array<{ line: number; message: string; rule: string }>;
  warnings: Array<{ line: number; message: string; rule: string }>;
  suggestions: Array<{ line: number; message: string; rule: string }>;
} {
  const result = {
    valid: true,
    errors: [] as Array<{ line: number; message: string; rule: string }>,
    warnings: [] as Array<{ line: number; message: string; rule: string }>,
    suggestions: [] as Array<{ line: number; message: string; rule: string }>
  };

  const lines = code.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Syntax checks
    for (const rule of VALIDATION_RULES.syntax) {
      if (!rule.check(line)) {
        result.warnings.push({ line: lineNum, message: rule.message, rule: rule.rule });
      }
    }

    // Best practice checks
    for (const rule of VALIDATION_RULES.bestPractice) {
      if (rule.pattern && rule.pattern.test(line)) {
        if (rule.validate) {
          const match = line.match(rule.pattern);
          if (match && match[1] && !rule.validate(match[1])) {
            result.warnings.push({ line: lineNum, message: rule.message, rule: rule.rule });
          }
        } else {
          result.suggestions.push({ line: lineNum, message: rule.message, rule: rule.rule });
        }
      }
    }

    // Project-specific checks
    if (projectRules) {
      for (const rule of VALIDATION_RULES.projectSpecific) {
        if (rule.pattern.test(line)) {
          result.suggestions.push({ line: lineNum, message: rule.message, rule: rule.rule });
        }
      }
    }

    // Check for Godot 3.x patterns (errors)
    for (const [oldPattern, newPattern] of Object.entries(GODOT_4_CHANGES.renamedClasses)) {
      if (line.includes(oldPattern)) {
        result.errors.push({
          line: lineNum,
          message: `'${oldPattern}' was renamed to '${newPattern}' in Godot 4`,
          rule: "godot4_migration"
        });
        result.valid = false;
      }
    }
  });

  return result;
}

// =============================================================================
// SMART CODE GENERATION
// =============================================================================

export function generateSmartCode(context: {
  type: "function" | "class" | "signal_handler" | "state" | "resource";
  name: string;
  params?: Record<string, string>;
  options?: Record<string, any>;
}): string {
  const { type, name, params = {}, options = {} } = context;

  switch (type) {
    case "function":
      return generateFunction(name, params, options);
    case "class":
      return generateClass(name, params, options);
    case "signal_handler":
      return generateSignalHandler(name, params);
    case "state":
      return generateState(name, options);
    case "resource":
      return generateResourceClass(name, params);
    default:
      return "";
  }
}

function generateFunction(name: string, params: Record<string, string>, options: any): string {
  const paramList = Object.entries(params)
    .map(([pName, pType]) => `${pName}: ${pType}`)
    .join(", ");
  const returnType = options.returnType || "void";
  const isAsync = options.async || false;

  let code = "";
  if (options.docstring) {
    code += `## ${options.docstring}\n`;
  }
  code += `func ${name}(${paramList}) -> ${returnType}:\n`;

  if (isAsync) {
    code += `\tawait get_tree().process_frame\n`;
  }

  code += `\t${options.body || "pass"}\n`;

  return code;
}

function generateClass(name: string, params: Record<string, string>, options: any): string {
  const baseClass = options.extends || "RefCounted";

  let code = `class_name ${name}\nextends ${baseClass}\n\n`;

  // Add signals
  if (options.signals) {
    for (const sig of options.signals) {
      code += `signal ${sig}\n`;
    }
    code += "\n";
  }

  // Add exports
  for (const [pName, pType] of Object.entries(params)) {
    code += `@export var ${pName}: ${pType}\n`;
  }

  if (Object.keys(params).length > 0) code += "\n";

  // Add _ready if needed
  if (options.needsReady !== false && baseClass !== "RefCounted" && baseClass !== "Resource") {
    code += `\nfunc _ready() -> void:\n\tpass\n`;
  }

  return code;
}

function generateSignalHandler(signalName: string, params: Record<string, string>): string {
  const handlerName = `_on_${signalName}`;
  const paramList = Object.entries(params)
    .map(([pName, pType]) => `${pName}: ${pType}`)
    .join(", ");

  return `func ${handlerName}(${paramList}) -> void:\n\t# Handle ${signalName}\n\tpass\n`;
}

function generateState(name: string, options: any): string {
  return `extends State
class_name ${name}State

func enter(data: Dictionary = {}) -> void:
\t# Called when entering ${name} state
\tpass

func exit() -> void:
\t# Called when leaving ${name} state
\tpass

func update(delta: float) -> void:
\t# Called every frame in ${name} state
\tpass

func physics_update(delta: float) -> void:
\t# Called every physics frame in ${name} state
\tpass
`;
}

function generateResourceClass(name: string, params: Record<string, string>): string {
  let code = `extends Resource
class_name ${name}

`;

  for (const [pName, pType] of Object.entries(params)) {
    code += `@export var ${pName}: ${pType}\n`;
  }

  return code;
}
