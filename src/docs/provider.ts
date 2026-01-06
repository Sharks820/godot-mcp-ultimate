/**
 * Documentation Provider
 * Godot API docs injection + project documentation extraction
 */

import * as fs from "fs";
import * as path from "path";
import { Config } from "../utils/config.js";
import fg from "fast-glob";

// Godot 4.x built-in class documentation (commonly used classes)
const GODOT_CLASS_DOCS: Record<string, any> = {
  Node: {
    description: "Base class for all scene objects. Nodes can be added as children of other nodes, forming a tree hierarchy.",
    inherits: "Object",
    methods: {
      add_child: {
        signature: "add_child(node: Node, force_readable_name: bool = false, internal: InternalMode = 0) -> void",
        description: "Adds a child node. Nodes can have any number of children, but every child must have a unique name.",
      },
      get_node: {
        signature: "get_node(path: NodePath) -> Node",
        description: "Fetches a node. The NodePath can be either a relative path or an absolute path.",
      },
      queue_free: {
        signature: "queue_free() -> void",
        description: "Queues a node for deletion at the end of the current frame.",
      },
      get_tree: {
        signature: "get_tree() -> SceneTree",
        description: "Returns the SceneTree that contains this node.",
      },
      is_inside_tree: {
        signature: "is_inside_tree() -> bool",
        description: "Returns true if this node is currently inside a SceneTree.",
      },
    },
    signals: {
      ready: "Emitted when the node is ready (entered tree and all children are ready).",
      tree_entered: "Emitted when the node enters the SceneTree.",
      tree_exited: "Emitted when the node exits the SceneTree.",
    },
  },
  Node2D: {
    description: "A 2D game object, inherited by all 2D-related nodes. Has a position, rotation, scale, and Z index.",
    inherits: "CanvasItem",
    properties: {
      position: "Position relative to the parent node, in pixels.",
      rotation: "Rotation in radians.",
      scale: "Scale factor of the node.",
      global_position: "Global position of the node.",
      global_rotation: "Global rotation of the node.",
    },
    methods: {
      look_at: {
        signature: "look_at(point: Vector2) -> void",
        description: "Rotates the node so it points towards the point.",
      },
      translate: {
        signature: "translate(offset: Vector2) -> void",
        description: "Translates the node by the given offset in local coordinates.",
      },
    },
  },
  Control: {
    description: "Base class for all UI-related nodes. Features anchors, margins, and focus handling.",
    inherits: "CanvasItem",
    properties: {
      anchor_left: "Anchors the left edge of the node to a fraction of the parent's width.",
      anchor_right: "Anchors the right edge of the node to a fraction of the parent's width.",
      anchor_top: "Anchors the top edge of the node to a fraction of the parent's height.",
      anchor_bottom: "Anchors the bottom edge of the node to a fraction of the parent's height.",
      size: "The size of the node's bounding rectangle, in pixels.",
      position: "The position of the node's bounding rectangle, relative to its parent.",
      custom_minimum_size: "The minimum size of the node.",
    },
    methods: {
      set_anchors_preset: {
        signature: "set_anchors_preset(preset: LayoutPreset, keep_offsets: bool = false) -> void",
        description: "Sets anchor_left, anchor_top, anchor_right, anchor_bottom to a preset.",
      },
      grab_focus: {
        signature: "grab_focus() -> void",
        description: "Steal the focus from another control and become the focused control.",
      },
    },
    signals: {
      resized: "Emitted when the node's size changes.",
      focus_entered: "Emitted when the node gains focus.",
      focus_exited: "Emitted when the node loses focus.",
      mouse_entered: "Emitted when the mouse enters the node's Rect area.",
      mouse_exited: "Emitted when the mouse exits the node's Rect area.",
    },
  },
  Tween: {
    description: "Lightweight object used for general-purpose animation via tweening.",
    inherits: "RefCounted",
    methods: {
      tween_property: {
        signature: "tween_property(object: Object, property: NodePath, final_val: Variant, duration: float) -> PropertyTweener",
        description: "Creates and appends a PropertyTweener. Returns the PropertyTweener for method chaining.",
      },
      tween_interval: {
        signature: "tween_interval(time: float) -> IntervalTweener",
        description: "Creates and appends an IntervalTweener. Used to add delays in a sequence.",
      },
      tween_callback: {
        signature: "tween_callback(callback: Callable) -> CallbackTweener",
        description: "Creates and appends a CallbackTweener.",
      },
      set_ease: {
        signature: "set_ease(ease: EaseType) -> Tween",
        description: "Sets the default ease type for PropertyTweeners and MethodTweeners.",
      },
      set_trans: {
        signature: "set_trans(trans: TransitionType) -> Tween",
        description: "Sets the default transition type for PropertyTweeners and MethodTweeners.",
      },
      set_parallel: {
        signature: "set_parallel(parallel: bool = true) -> Tween",
        description: "If parallel is true, the Tweeners will run simultaneously.",
      },
      chain: {
        signature: "chain() -> Tween",
        description: "Makes the following Tweeners run sequentially.",
      },
      kill: {
        signature: "kill() -> void",
        description: "Aborts all tweening operations.",
      },
    },
  },
  AnimationPlayer: {
    description: "Node for playing back animations. Contains an AnimationLibrary for storing animations.",
    inherits: "AnimationMixer",
    methods: {
      play: {
        signature: "play(name: StringName = \"\", custom_blend: float = -1, custom_speed: float = 1.0, from_end: bool = false) -> void",
        description: "Plays the animation with key name.",
      },
      stop: {
        signature: "stop(keep_state: bool = false) -> void",
        description: "Stops the currently playing animation.",
      },
      is_playing: {
        signature: "is_playing() -> bool",
        description: "Returns true if any animation is currently playing.",
      },
      get_animation: {
        signature: "get_animation(name: StringName) -> Animation",
        description: "Returns the Animation with the key name.",
      },
    },
    signals: {
      animation_finished: "Emitted when an animation finishes.",
      animation_started: "Emitted when an animation starts.",
    },
  },
  CharacterBody2D: {
    description: "A 2D physics body specialized for characters moved by script.",
    inherits: "PhysicsBody2D",
    properties: {
      velocity: "Current velocity vector in pixels per second.",
      motion_mode: "Determines if the body moves as a grounded or floating character.",
      floor_max_angle: "Maximum angle considered as floor.",
    },
    methods: {
      move_and_slide: {
        signature: "move_and_slide() -> bool",
        description: "Moves the body based on velocity. Returns true if a collision occurred.",
      },
      is_on_floor: {
        signature: "is_on_floor() -> bool",
        description: "Returns true if the body collided with the floor on the last move_and_slide.",
      },
      is_on_wall: {
        signature: "is_on_wall() -> bool",
        description: "Returns true if the body collided with a wall on the last move_and_slide.",
      },
      get_slide_collision: {
        signature: "get_slide_collision(slide_idx: int) -> KinematicCollision2D",
        description: "Returns a KinematicCollision2D for the collision at index slide_idx.",
      },
    },
  },
  Resource: {
    description: "Base class for serialized objects that can be saved and loaded.",
    inherits: "RefCounted",
    methods: {
      duplicate: {
        signature: "duplicate(subresources: bool = false) -> Resource",
        description: "Duplicates the resource, returning a new resource with the same data.",
      },
    },
    signals: {
      changed: "Emitted when the resource is changed.",
    },
  },
  Signal: {
    description: "Built-in type representing a signal.",
    methods: {
      connect: {
        signature: "connect(callable: Callable, flags: int = 0) -> int",
        description: "Connects this signal to the specified callable.",
      },
      disconnect: {
        signature: "disconnect(callable: Callable) -> void",
        description: "Disconnects this signal from the specified callable.",
      },
      emit: {
        signature: "emit(...) -> void",
        description: "Emits this signal with the given arguments.",
      },
      is_connected: {
        signature: "is_connected(callable: Callable) -> bool",
        description: "Returns true if the specified callable is connected to this signal.",
      },
    },
  },
  Timer: {
    description: "A countdown timer.",
    inherits: "Node",
    properties: {
      wait_time: "The wait time in seconds.",
      one_shot: "If true, the timer will stop after timing out.",
      autostart: "If true, the timer will automatically start when entering the tree.",
    },
    methods: {
      start: {
        signature: "start(time_sec: float = -1) -> void",
        description: "Starts the timer. Sets wait_time to time_sec if >= 0.",
      },
      stop: {
        signature: "stop() -> void",
        description: "Stops the timer.",
      },
    },
    signals: {
      timeout: "Emitted when the timer reaches 0.",
    },
  },
  SceneTree: {
    description: "Manages the game loop and scene hierarchy.",
    inherits: "MainLoop",
    properties: {
      root: "The root of the scene tree.",
      current_scene: "The currently loaded scene.",
      paused: "If true, the SceneTree is paused.",
    },
    methods: {
      change_scene_to_file: {
        signature: "change_scene_to_file(path: String) -> Error",
        description: "Changes the running scene to the one at the given path.",
      },
      create_timer: {
        signature: "create_timer(time_sec: float, process_always: bool = true, process_in_physics: bool = false, ignore_time_scale: bool = false) -> SceneTreeTimer",
        description: "Returns a SceneTreeTimer which will emit timeout after the given time.",
      },
      get_nodes_in_group: {
        signature: "get_nodes_in_group(group: StringName) -> Array[Node]",
        description: "Returns a list of all nodes assigned to the given group.",
      },
    },
  },
};

export class DocsProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // ==========================================================================
  // API DOCUMENTATION
  // ==========================================================================

  /**
   * Get Godot API documentation
   */
  async getAPIDocs(args: {
    class_name: string;
    method?: string;
    property?: string;
  }): Promise<any> {
    const { class_name, method, property } = args;

    const classDoc = GODOT_CLASS_DOCS[class_name];

    if (!classDoc) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Class '${class_name}' not in local cache`,
                suggestion: "Check https://docs.godotengine.org/en/stable/classes/",
                available_classes: Object.keys(GODOT_CLASS_DOCS),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (method && classDoc.methods?.[method]) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                class: class_name,
                method,
                ...classDoc.methods[method],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (property && classDoc.properties?.[property]) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                class: class_name,
                property,
                description: classDoc.properties[property],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(classDoc, null, 2),
        },
      ],
    };
  }

  /**
   * Get project documentation
   */
  async getProjectDocs(args: { file?: string; type?: string }): Promise<any> {
    const { file, type = "all" } = args;

    const docs: any = {
      classes: [],
      functions: [],
      signals: [],
    };

    const files = file
      ? [this.config.resolvePath(file)]
      : await fg(["scripts/**/*.gd"], {
          cwd: this.config.projectPath,
          ignore: ["**/addons/**"],
          absolute: true,
        });

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(this.config.projectPath, filePath);
      const extracted = this.extractDocs(content, relativePath);

      if (type === "all" || type === "classes") {
        docs.classes.push(...extracted.classes);
      }
      if (type === "all" || type === "functions") {
        docs.functions.push(...extracted.functions);
      }
      if (type === "all" || type === "signals") {
        docs.signals.push(...extracted.signals);
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
    };
  }

  /**
   * Search documentation
   */
  async searchDocs(args: { query: string; limit?: number }): Promise<any> {
    const { query, limit = 10 } = args;
    const results: any[] = [];
    const queryLower = query.toLowerCase();

    // Search built-in classes
    for (const [className, classDoc] of Object.entries(GODOT_CLASS_DOCS)) {
      if (className.toLowerCase().includes(queryLower)) {
        results.push({
          type: "class",
          name: className,
          description: (classDoc as any).description,
          source: "godot_api",
        });
      }

      // Search methods
      for (const [methodName, methodDoc] of Object.entries((classDoc as any).methods || {})) {
        if (methodName.toLowerCase().includes(queryLower)) {
          results.push({
            type: "method",
            name: `${className}.${methodName}`,
            signature: (methodDoc as any).signature,
            description: (methodDoc as any).description,
            source: "godot_api",
          });
        }
      }

      // Search signals
      for (const [signalName, signalDesc] of Object.entries((classDoc as any).signals || {})) {
        if (signalName.toLowerCase().includes(queryLower)) {
          results.push({
            type: "signal",
            name: `${className}.${signalName}`,
            description: signalDesc,
            source: "godot_api",
          });
        }
      }
    }

    // Search project docs
    const projectDocs = await this.getProjectDocs({});
    const projectData = JSON.parse(projectDocs.content[0].text);

    for (const cls of projectData.classes) {
      if (cls.name.toLowerCase().includes(queryLower)) {
        results.push({
          type: "project_class",
          name: cls.name,
          file: cls.file,
          description: cls.description,
          source: "project",
        });
      }
    }

    for (const func of projectData.functions) {
      if (func.name.toLowerCase().includes(queryLower)) {
        results.push({
          type: "project_function",
          name: func.name,
          file: func.file,
          description: func.description,
          source: "project",
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results.slice(0, limit), null, 2),
        },
      ],
    };
  }

  // ==========================================================================
  // RESOURCES
  // ==========================================================================

  /**
   * Get resource content
   */
  async getResource(resourceType: string): Promise<any> {
    switch (resourceType) {
      case "project-structure":
        return this.getProjectStructure();
      case "code-patterns":
        return this.getCodePatterns();
      case "utilities":
        return this.getUtilities();
      default:
        throw new Error(`Unknown resource: ${resourceType}`);
    }
  }

  private async getProjectStructure(): Promise<any> {
    const structure: any = {
      scenes: await fg(["scenes/**/*.tscn"], { cwd: this.config.projectPath }),
      scripts: await fg(["scripts/**/*.gd"], { cwd: this.config.projectPath }),
      resources: await fg(["data/**/*.tres"], { cwd: this.config.projectPath }),
      assets: await fg(["assets/**/*"], { cwd: this.config.projectPath }),
      autoloads: [],
    };

    // Parse project.godot for autoloads
    const projectGodot = path.join(this.config.projectPath, "project.godot");
    if (fs.existsSync(projectGodot)) {
      const content = fs.readFileSync(projectGodot, "utf-8");
      const autoloadSection = content.match(/\[autoload\]([\s\S]*?)(?:\[|$)/);
      if (autoloadSection) {
        const matches = autoloadSection[1].matchAll(/(\w+)="[*]?res:\/\/([^"]+)"/g);
        for (const match of matches) {
          structure.autoloads.push({
            name: match[1],
            path: match[2],
          });
        }
      }
    }

    return structure;
  }

  private async getCodePatterns(): Promise<any> {
    // Read CLAUDE.md for patterns
    const claudeMd = path.join(this.config.projectPath, "CLAUDE.md");
    const patterns: any = {
      mandatory_utilities: [],
      anti_patterns: [],
      best_practices: [],
    };

    if (fs.existsSync(claudeMd)) {
      const content = fs.readFileSync(claudeMd, "utf-8");

      // Extract utility rules
      patterns.mandatory_utilities = [
        { bad: "StyleBoxFlat.new()", good: "UIStyleFactory.create_*" },
        { bad: "create_tween().tween_property", good: "AnimationEffects.*" },
        { bad: "queue_free() without check", good: "NodeHelpers.safe_free()" },
        { bad: "hardcoded delays (0.3)", good: "Constants.WAIT_*" },
      ];

      patterns.anti_patterns = [
        "Magic numbers for durations/sizes",
        "Manual StyleBox creation",
        "Unchecked node path access",
        "print() instead of ErrorLogger",
      ];

      patterns.best_practices = [
        "Use @onready for node references",
        "Add return type annotations",
        "Use signals for decoupling",
        "Check is_instance_valid() before operations",
      ];
    }

    return patterns;
  }

  private async getUtilities(): Promise<any> {
    const utilities: any = {
      UIStyleFactory: {
        file: "scripts/utils/ui_style_factory.gd",
        methods: [
          "create_panel_style()",
          "create_button_style()",
          "create_progress_bar_style()",
        ],
        constants: ["COLOR_*", "FONT_*", "MARGIN_*"],
      },
      AnimationEffects: {
        file: "scripts/utils/animation_effects.gd",
        methods: [
          "fade_in()",
          "fade_out()",
          "slide_in()",
          "shake()",
          "pulse()",
        ],
      },
      NodeHelpers: {
        file: "scripts/utils/node_helpers.gd",
        methods: [
          "safe_free()",
          "find_child_by_type()",
          "get_all_children()",
        ],
      },
      StringHelpers: {
        file: "scripts/utils/string_helpers.gd",
        methods: [
          "format_hp()",
          "format_damage()",
          "format_time()",
        ],
      },
      MathHelpers: {
        file: "scripts/utils/math_helpers.gd",
        methods: [
          "lerp_clamped()",
          "random_range_int()",
          "calculate_damage()",
        ],
      },
      Constants: {
        file: "scripts/utils/constants.gd",
        constants: [
          "WAIT_SHORT",
          "WAIT_MEDIUM",
          "WAIT_LONG",
          "SCREEN_WIDTH",
          "SCREEN_HEIGHT",
        ],
      },
    };

    return utilities;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private extractDocs(content: string, filePath: string): any {
    const docs: any = {
      classes: [],
      functions: [],
      signals: [],
    };

    const lines = content.split("\n");
    let currentComment = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Collect comments for documentation
      if (trimmed.startsWith("##")) {
        currentComment += trimmed.slice(2).trim() + " ";
        continue;
      }

      // Class name with preceding comment
      const classMatch = trimmed.match(/^class_name\s+(\w+)/);
      if (classMatch) {
        docs.classes.push({
          name: classMatch[1],
          file: filePath,
          line: i + 1,
          description: currentComment.trim() || null,
        });
        currentComment = "";
        continue;
      }

      // Function with preceding comment
      const funcMatch = trimmed.match(/^func\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?/);
      if (funcMatch) {
        docs.functions.push({
          name: funcMatch[1],
          file: filePath,
          line: i + 1,
          parameters: funcMatch[2],
          return_type: funcMatch[3] || "void",
          description: currentComment.trim() || null,
        });
        currentComment = "";
        continue;
      }

      // Signal with preceding comment
      const signalMatch = trimmed.match(/^signal\s+(\w+)(?:\(([^)]*)\))?/);
      if (signalMatch) {
        docs.signals.push({
          name: signalMatch[1],
          file: filePath,
          line: i + 1,
          parameters: signalMatch[2] || "",
          description: currentComment.trim() || null,
        });
        currentComment = "";
        continue;
      }

      // Reset comment if no match
      if (trimmed && !trimmed.startsWith("#")) {
        currentComment = "";
      }
    }

    return docs;
  }
}
