/**
 * Comprehensive Shader Analyzer for Godot 4.x
 * Supports .gdshader files with linting, analysis, and optimization suggestions
 */

import * as fs from "fs";
import * as path from "path";
import fg from "fast-glob";
import { Config } from "../utils/config.js";

// ============================================================================
// SHADER KNOWLEDGE BASE
// ============================================================================

const SHADER_TYPES = ["spatial", "canvas_item", "particles", "sky", "fog"] as const;
type ShaderType = typeof SHADER_TYPES[number];

const RENDER_MODES: Record<ShaderType, string[]> = {
  spatial: [
    "blend_mix", "blend_add", "blend_sub", "blend_mul",
    "depth_draw_opaque", "depth_draw_always", "depth_draw_never",
    "depth_prepass_alpha", "depth_test_disabled",
    "sss_mode_skin", "cull_back", "cull_front", "cull_disabled",
    "unshaded", "wireframe", "diffuse_lambert", "diffuse_lambert_wrap",
    "diffuse_burley", "diffuse_toon", "specular_schlick_ggx",
    "specular_toon", "specular_disabled", "skip_vertex_transform",
    "world_vertex_coords", "ensure_correct_normals", "shadows_disabled",
    "ambient_light_disabled", "shadow_to_opacity", "vertex_lighting",
    "particle_trails", "alpha_to_coverage", "alpha_to_coverage_and_one",
  ],
  canvas_item: [
    "blend_mix", "blend_add", "blend_sub", "blend_mul", "blend_premul_alpha",
    "blend_disabled", "unshaded", "light_only", "skip_vertex_transform",
    "world_vertex_coords",
  ],
  particles: [
    "keep_data", "disable_velocity", "disable_force", "collision_use_scale",
  ],
  sky: [
    "use_half_res_pass", "use_quarter_res_pass",
  ],
  fog: [],
};

const BUILT_IN_UNIFORMS: Record<ShaderType, Record<string, string>> = {
  spatial: {
    TIME: "float - Global time in seconds",
    PI: "float - Pi constant (3.14159...)",
    TAU: "float - Tau constant (6.28318...)",
    E: "float - Euler's number (2.71828...)",
    VIEWPORT_SIZE: "vec2 - Viewport size in pixels",
    VERTEX: "vec3 - Vertex position (local space)",
    NORMAL: "vec3 - Vertex normal (local space)",
    TANGENT: "vec3 - Vertex tangent (local space)",
    BINORMAL: "vec3 - Vertex binormal (local space)",
    UV: "vec2 - Primary UV coordinates",
    UV2: "vec2 - Secondary UV coordinates",
    COLOR: "vec4 - Vertex color",
    MODEL_MATRIX: "mat4 - Model to world transform",
    VIEW_MATRIX: "mat4 - World to view transform",
    PROJECTION_MATRIX: "mat4 - View to clip transform",
    INV_VIEW_MATRIX: "mat4 - Inverse view matrix",
    INV_PROJECTION_MATRIX: "mat4 - Inverse projection matrix",
    CAMERA_POSITION_WORLD: "vec3 - Camera position in world space",
    CAMERA_DIRECTION_WORLD: "vec3 - Camera direction in world space",
    NODE_POSITION_WORLD: "vec3 - Node position in world space",
    NODE_POSITION_VIEW: "vec3 - Node position in view space",
    ALBEDO: "vec3 - Surface albedo color (fragment)",
    ALPHA: "float - Surface alpha (fragment)",
    METALLIC: "float - Metallic value (fragment)",
    ROUGHNESS: "float - Roughness value (fragment)",
    SPECULAR: "float - Specular value (fragment)",
    EMISSION: "vec3 - Emission color (fragment)",
    AO: "float - Ambient occlusion (fragment)",
    NORMAL_MAP: "vec3 - Normal map value (fragment)",
    NORMAL_MAP_DEPTH: "float - Normal map depth (fragment)",
    RIM: "float - Rim lighting (fragment)",
    RIM_TINT: "float - Rim tint (fragment)",
    CLEARCOAT: "float - Clearcoat value (fragment)",
    CLEARCOAT_ROUGHNESS: "float - Clearcoat roughness (fragment)",
    ANISOTROPY: "float - Anisotropy value (fragment)",
    ANISOTROPY_FLOW: "vec2 - Anisotropy flow direction (fragment)",
    SSS_STRENGTH: "float - Subsurface scattering strength (fragment)",
    SSS_TRANSMITTANCE_COLOR: "vec4 - SSS transmittance color (fragment)",
    BACKLIGHT: "vec3 - Backlight color (fragment)",
    SCREEN_UV: "vec2 - Screen UV coordinates (fragment)",
    FRAGCOORD: "vec4 - Fragment coordinates (fragment)",
    FRONT_FACING: "bool - Is front face (fragment)",
  },
  canvas_item: {
    TIME: "float - Global time in seconds",
    PI: "float - Pi constant",
    TAU: "float - Tau constant",
    VERTEX: "vec2 - Vertex position",
    UV: "vec2 - UV coordinates",
    COLOR: "vec4 - Vertex/instance color",
    TEXTURE: "sampler2D - Main texture",
    TEXTURE_PIXEL_SIZE: "vec2 - Pixel size in UV space",
    SCREEN_UV: "vec2 - Screen UV coordinates",
    SCREEN_PIXEL_SIZE: "vec2 - Screen pixel size",
    FRAGCOORD: "vec4 - Fragment coordinates",
    AT_LIGHT_PASS: "bool - True during light pass",
    LIGHT_COLOR: "vec4 - Light color (light pass)",
    LIGHT_POSITION: "vec3 - Light position (light pass)",
    LIGHT_DIRECTION: "vec3 - Light direction (light pass)",
    LIGHT_ENERGY: "float - Light energy (light pass)",
    LIGHT_VERTEX: "vec3 - Vertex in light space (light pass)",
    SHADOW_MODULATE: "vec4 - Shadow modulation (light pass)",
  },
  particles: {
    TIME: "float - Global time in seconds",
    LIFETIME: "float - Particle lifetime",
    DELTA: "float - Frame delta time",
    NUMBER: "uint - Particle number",
    INDEX: "uint - Particle index",
    EMISSION_TRANSFORM: "mat4 - Emitter transform",
    RANDOM_SEED: "uint - Random seed per particle",
    TRANSFORM: "mat4 - Particle transform",
    VELOCITY: "vec3 - Particle velocity",
    COLOR: "vec4 - Particle color",
    CUSTOM: "vec4 - Custom particle data",
    ACTIVE: "bool - Is particle active",
    RESTART: "bool - Should restart",
    RESTART_POSITION: "bool - Restart position",
    RESTART_ROT_SCALE: "bool - Restart rotation/scale",
    RESTART_VELOCITY: "bool - Restart velocity",
    RESTART_COLOR: "bool - Restart color",
    RESTART_CUSTOM: "bool - Restart custom data",
  },
  sky: {
    TIME: "float - Global time",
    POSITION: "vec3 - Sky position",
    RADIANCE: "vec4 - Output radiance",
    IS_HALF_RES_PASS: "bool - Half resolution pass",
    IS_QUARTER_RES_PASS: "bool - Quarter resolution pass",
    SKY_COORDS: "vec2 - Sky coordinates",
    SCREEN_UV: "vec2 - Screen UV",
    FRAGCOORD: "vec4 - Fragment coordinates",
    LIGHT0_ENABLED: "bool - Light 0 enabled",
    LIGHT0_DIRECTION: "vec3 - Light 0 direction",
    LIGHT0_ENERGY: "float - Light 0 energy",
    LIGHT0_COLOR: "vec3 - Light 0 color",
    LIGHT1_ENABLED: "bool - Light 1 enabled",
    LIGHT1_DIRECTION: "vec3 - Light 1 direction",
    LIGHT1_ENERGY: "float - Light 1 energy",
    LIGHT1_COLOR: "vec3 - Light 1 color",
    AT_HALF_RES_PASS: "bool - At half resolution pass",
    AT_QUARTER_RES_PASS: "bool - At quarter resolution pass",
    AT_CUBEMAP_PASS: "bool - At cubemap pass",
  },
  fog: {
    TIME: "float - Global time",
    WORLD_POSITION: "vec3 - World position",
    OBJECT_POSITION: "vec3 - Object position",
    UVW: "vec3 - UVW coordinates",
    SIZE: "vec3 - Fog volume size",
    SDF: "float - Signed distance field",
    ALBEDO: "vec3 - Fog albedo",
    DENSITY: "float - Fog density",
    EMISSION: "vec3 - Fog emission",
  },
};

const GLSL_FUNCTIONS = [
  // Math functions
  "abs", "sign", "floor", "ceil", "round", "trunc", "fract", "mod",
  "min", "max", "clamp", "mix", "step", "smoothstep",
  "sqrt", "inversesqrt", "pow", "exp", "exp2", "log", "log2",
  "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
  "asinh", "acosh", "atanh", "radians", "degrees",
  // Vector functions
  "length", "distance", "dot", "cross", "normalize", "faceforward",
  "reflect", "refract",
  // Matrix functions
  "matrixCompMult", "outerProduct", "transpose", "determinant", "inverse",
  // Texture functions
  "texture", "textureProj", "textureLod", "textureGrad", "texelFetch",
  "textureSize", "textureProjLod", "textureProjGrad",
  // Fragment processing
  "dFdx", "dFdy", "fwidth",
  // Misc
  "isnan", "isinf", "floatBitsToInt", "floatBitsToUint",
  "intBitsToFloat", "uintBitsToFloat", "packHalf2x16", "unpackHalf2x16",
  "packUnorm2x16", "unpackUnorm2x16", "packSnorm2x16", "unpackSnorm2x16",
  // Godot-specific
  "SCREEN_TEXTURE", "DEPTH_TEXTURE", "NORMAL_ROUGHNESS_TEXTURE",
];

interface ShaderIssue {
  line: number;
  column: number;
  severity: "error" | "warning" | "info" | "hint";
  code: string;
  message: string;
}

interface ShaderAnalysis {
  file: string;
  shader_type: ShaderType | null;
  render_modes: string[];
  uniforms: Array<{
    name: string;
    type: string;
    hint?: string;
    default_value?: string;
    line: number;
  }>;
  varyings: Array<{
    name: string;
    type: string;
    interpolation?: string;
    line: number;
  }>;
  functions: Array<{
    name: string;
    return_type: string;
    parameters: string;
    line: number;
  }>;
  includes: string[];
  issues: ShaderIssue[];
  complexity: {
    lines: number;
    functions: number;
    uniforms: number;
    texture_samples: number;
    branching: number;
    loops: number;
  };
  performance_hints: string[];
}

export class ShaderAnalyzer {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // ==========================================================================
  // SHADER ANALYSIS
  // ==========================================================================

  /**
   * Analyze a shader file
   */
  async analyzeShader(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `Shader file not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const analysis = this.parseShader(content, file);

    return {
      content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
    };
  }

  /**
   * Lint a shader file
   */
  async lintShader(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `Shader file not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const issues = this.lintShaderContent(content, file);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          file,
          total_issues: issues.length,
          errors: issues.filter(i => i.severity === "error").length,
          warnings: issues.filter(i => i.severity === "warning").length,
          info: issues.filter(i => i.severity === "info").length,
          hints: issues.filter(i => i.severity === "hint").length,
          issues,
        }, null, 2),
      }],
    };
  }

  /**
   * Lint all shaders in project
   */
  async lintAllShaders(args: { path?: string }): Promise<any> {
    const targetPath = args.path
      ? this.config.resolvePath(args.path)
      : this.config.projectPath;

    const shaderFiles = await fg(["**/*.gdshader", "**/*.shader"], {
      cwd: targetPath,
      ignore: ["**/addons/**"],
      absolute: true,
    });

    if (shaderFiles.length === 0) {
      return {
        content: [{ type: "text", text: "No shader files found" }],
      };
    }

    const results: any[] = [];
    let totalIssues = 0;

    for (const shaderFile of shaderFiles) {
      const content = fs.readFileSync(shaderFile, "utf-8");
      const relativePath = path.relative(this.config.projectPath, shaderFile);
      const issues = this.lintShaderContent(content, relativePath);

      if (issues.length > 0) {
        results.push({
          file: relativePath,
          issues,
        });
        totalIssues += issues.length;
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_files: shaderFiles.length,
          files_with_issues: results.length,
          total_issues: totalIssues,
          results,
        }, null, 2),
      }],
    };
  }

  /**
   * Get shader documentation
   */
  async getShaderDocs(args: {
    shader_type?: ShaderType;
    topic?: string;
  }): Promise<any> {
    const { shader_type, topic } = args;

    if (shader_type && topic === "uniforms") {
      const uniforms = BUILT_IN_UNIFORMS[shader_type];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            shader_type,
            built_in_uniforms: uniforms,
          }, null, 2),
        }],
      };
    }

    if (shader_type && topic === "render_modes") {
      const modes = RENDER_MODES[shader_type];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            shader_type,
            render_modes: modes,
          }, null, 2),
        }],
      };
    }

    if (topic === "functions") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            glsl_functions: GLSL_FUNCTIONS,
            description: "Built-in GLSL functions available in Godot shaders",
          }, null, 2),
        }],
      };
    }

    // Return general overview
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          shader_types: SHADER_TYPES,
          available_topics: ["uniforms", "render_modes", "functions"],
          usage: "Call with shader_type and topic for specific documentation",
          example: "godot_get_shader_docs({ shader_type: 'spatial', topic: 'uniforms' })",
        }, null, 2),
      }],
    };
  }

  /**
   * Get performance analysis for shader
   */
  async analyzeShaderPerformance(args: { file: string }): Promise<any> {
    const { file } = args;
    const filePath = this.config.resolvePath(file);

    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: "text", text: `Shader file not found: ${file}` }],
        isError: true,
      };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const analysis = this.parseShader(content, file);

    const perfReport = {
      file,
      complexity_score: this.calculateComplexityScore(analysis.complexity),
      complexity: analysis.complexity,
      performance_grade: this.getPerformanceGrade(analysis.complexity),
      warnings: analysis.performance_hints,
      recommendations: this.generateRecommendations(analysis),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(perfReport, null, 2) }],
    };
  }

  /**
   * Find all shaders and provide summary
   */
  async findShaders(args: { path?: string }): Promise<any> {
    const targetPath = args.path
      ? this.config.resolvePath(args.path)
      : this.config.projectPath;

    const shaderFiles = await fg(["**/*.gdshader", "**/*.shader"], {
      cwd: targetPath,
      ignore: ["**/addons/**"],
      absolute: true,
    });

    const shaders: any[] = [];

    for (const shaderFile of shaderFiles) {
      const content = fs.readFileSync(shaderFile, "utf-8");
      const relativePath = path.relative(this.config.projectPath, shaderFile);

      // Quick parse for shader type
      const typeMatch = content.match(/^shader_type\s+(\w+)/m);
      const shaderType = typeMatch ? typeMatch[1] : "unknown";

      // Count uniforms
      const uniformCount = (content.match(/^uniform\s+/gm) || []).length;

      // Count texture samples
      const textureCount = (content.match(/\btexture\s*\(/g) || []).length;

      shaders.push({
        file: relativePath,
        type: shaderType,
        uniforms: uniformCount,
        texture_samples: textureCount,
        lines: content.split("\n").length,
      });
    }

    // Group by type
    const byType: Record<string, any[]> = {};
    for (const shader of shaders) {
      if (!byType[shader.type]) {
        byType[shader.type] = [];
      }
      byType[shader.type].push(shader);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_shaders: shaders.length,
          by_type: byType,
          shaders,
        }, null, 2),
      }],
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private parseShader(content: string, file: string): ShaderAnalysis {
    const lines = content.split("\n");
    const issues: ShaderIssue[] = [];
    const performance_hints: string[] = [];

    // Parse shader type
    let shader_type: ShaderType | null = null;
    const typeMatch = content.match(/^shader_type\s+(\w+)\s*;/m);
    if (typeMatch && SHADER_TYPES.includes(typeMatch[1] as ShaderType)) {
      shader_type = typeMatch[1] as ShaderType;
    }

    // Parse render modes
    const render_modes: string[] = [];
    const modeMatch = content.match(/^render_mode\s+([^;]+);/m);
    if (modeMatch) {
      render_modes.push(...modeMatch[1].split(",").map(m => m.trim()));
    }

    // Parse uniforms
    const uniforms: ShaderAnalysis["uniforms"] = [];
    const uniformRegex = /^uniform\s+(\w+)\s+(\w+)(?:\s*:\s*([^=;]+))?(?:\s*=\s*([^;]+))?;/gm;
    let match;
    while ((match = uniformRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      uniforms.push({
        type: match[1],
        name: match[2],
        hint: match[3]?.trim(),
        default_value: match[4]?.trim(),
        line: lineNum,
      });
    }

    // Parse varyings
    const varyings: ShaderAnalysis["varyings"] = [];
    const varyingRegex = /^(varying|flat|smooth)\s+(\w+)\s+(\w+)\s*;/gm;
    while ((match = varyingRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      varyings.push({
        interpolation: match[1] !== "varying" ? match[1] : undefined,
        type: match[2],
        name: match[3],
        line: lineNum,
      });
    }

    // Parse functions
    const functions: ShaderAnalysis["functions"] = [];
    const funcRegex = /^(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      functions.push({
        return_type: match[1],
        name: match[2],
        parameters: match[3].trim(),
        line: lineNum,
      });
    }

    // Parse includes
    const includes: string[] = [];
    const includeRegex = /#include\s+"([^"]+)"/g;
    while ((match = includeRegex.exec(content)) !== null) {
      includes.push(match[1]);
    }

    // Calculate complexity metrics
    const complexity = {
      lines: lines.length,
      functions: functions.length,
      uniforms: uniforms.length,
      texture_samples: (content.match(/\btexture\s*\(/g) || []).length,
      branching: (content.match(/\b(if|else|switch|case)\b/g) || []).length,
      loops: (content.match(/\b(for|while)\b/g) || []).length,
    };

    // Performance analysis
    if (complexity.texture_samples > 8) {
      performance_hints.push(`High texture sample count (${complexity.texture_samples}) - consider texture atlases`);
    }
    if (complexity.branching > 10) {
      performance_hints.push(`High branching complexity (${complexity.branching}) - GPUs prefer uniform control flow`);
    }
    if (complexity.loops > 3) {
      performance_hints.push(`Multiple loops detected (${complexity.loops}) - consider unrolling or reducing`);
    }

    // Check for common issues
    issues.push(...this.lintShaderContent(content, file));

    return {
      file,
      shader_type,
      render_modes,
      uniforms,
      varyings,
      functions,
      includes,
      issues,
      complexity,
      performance_hints,
    };
  }

  private lintShaderContent(content: string, file: string): ShaderIssue[] {
    const issues: ShaderIssue[] = [];
    const lines = content.split("\n");

    // Check for shader_type declaration
    if (!content.match(/^shader_type\s+\w+\s*;/m)) {
      issues.push({
        line: 1,
        column: 1,
        severity: "error",
        code: "SHADER001",
        message: "Missing shader_type declaration",
      });
    }

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith("//") || trimmed.startsWith("/*")) return;

      // Check for deprecated functions (Godot 3 -> 4)
      if (line.includes("texture2D(") || line.includes("texture2DLod(")) {
        issues.push({
          line: lineNum,
          column: line.indexOf("texture2D") + 1,
          severity: "error",
          code: "SHADER002",
          message: "texture2D is deprecated in Godot 4.x, use texture()",
        });
      }

      if (line.includes("textureCube(")) {
        issues.push({
          line: lineNum,
          column: line.indexOf("textureCube") + 1,
          severity: "error",
          code: "SHADER003",
          message: "textureCube is deprecated in Godot 4.x, use texture()",
        });
      }

      // Check for SCREEN_TEXTURE without hint
      if (line.includes("SCREEN_TEXTURE") && !content.includes("hint_screen_texture")) {
        issues.push({
          line: lineNum,
          column: line.indexOf("SCREEN_TEXTURE") + 1,
          severity: "warning",
          code: "SHADER004",
          message: "SCREEN_TEXTURE should use hint_screen_texture uniform in Godot 4.x",
        });
      }

      // Check for precision issues
      if (line.match(/\b(highp|mediump|lowp)\b/)) {
        issues.push({
          line: lineNum,
          column: 1,
          severity: "info",
          code: "SHADER005",
          message: "Precision qualifiers may not work as expected on all platforms",
        });
      }

      // Check for expensive operations in fragment shader
      if (line.includes("pow(") && content.includes("void fragment()")) {
        issues.push({
          line: lineNum,
          column: line.indexOf("pow(") + 1,
          severity: "hint",
          code: "SHADER006",
          message: "pow() is expensive - consider using multiplication for integer powers",
        });
      }

      // Check for dynamic branching
      if (line.match(/\bif\s*\([^)]*uniform[^)]*\)/)) {
        issues.push({
          line: lineNum,
          column: 1,
          severity: "hint",
          code: "SHADER007",
          message: "Branching on uniform values causes shader variants - may impact performance",
        });
      }

      // Check for discard usage
      if (line.includes("discard;")) {
        issues.push({
          line: lineNum,
          column: line.indexOf("discard") + 1,
          severity: "hint",
          code: "SHADER008",
          message: "discard breaks early-Z optimization - use sparingly",
        });
      }

      // Check for division that could be multiplication
      if (line.match(/\/\s*\d+\.0\b/)) {
        issues.push({
          line: lineNum,
          column: 1,
          severity: "hint",
          code: "SHADER009",
          message: "Consider using multiplication by reciprocal instead of division",
        });
      }

      // Check line length
      if (line.length > 120) {
        issues.push({
          line: lineNum,
          column: 121,
          severity: "info",
          code: "SHADER010",
          message: `Line too long (${line.length} characters)`,
        });
      }

      // Check for magic numbers
      if (line.match(/\b\d+\.\d+\b/) && !trimmed.startsWith("const") && !trimmed.startsWith("uniform")) {
        const match = line.match(/\b(\d+\.\d+)\b/);
        if (match && !["0.0", "1.0", "0.5", "2.0"].includes(match[1])) {
          issues.push({
            line: lineNum,
            column: line.indexOf(match[1]) + 1,
            severity: "info",
            code: "SHADER011",
            message: `Magic number ${match[1]} - consider using a const or uniform`,
          });
        }
      }
    });

    // Check for missing vertex/fragment functions
    const hasVertex = content.includes("void vertex()");
    const hasFragment = content.includes("void fragment()");
    const hasLight = content.includes("void light()");

    if (!hasVertex && !hasFragment && !hasLight) {
      issues.push({
        line: 1,
        column: 1,
        severity: "warning",
        code: "SHADER012",
        message: "Shader has no vertex(), fragment(), or light() function",
      });
    }

    return issues;
  }

  private calculateComplexityScore(complexity: ShaderAnalysis["complexity"]): number {
    return (
      complexity.lines * 0.1 +
      complexity.functions * 2 +
      complexity.uniforms * 1 +
      complexity.texture_samples * 5 +
      complexity.branching * 3 +
      complexity.loops * 4
    );
  }

  private getPerformanceGrade(complexity: ShaderAnalysis["complexity"]): string {
    const score = this.calculateComplexityScore(complexity);
    if (score < 20) return "A (Excellent)";
    if (score < 40) return "B (Good)";
    if (score < 60) return "C (Moderate)";
    if (score < 80) return "D (Complex)";
    return "F (Very Complex)";
  }

  private generateRecommendations(analysis: ShaderAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity.texture_samples > 4) {
      recommendations.push("Consider combining textures into a texture atlas to reduce samples");
    }

    if (analysis.complexity.branching > 5) {
      recommendations.push("Reduce branching by using step(), smoothstep(), or mix() functions");
    }

    if (analysis.complexity.loops > 2) {
      recommendations.push("Consider unrolling small loops or using #pragma unroll");
    }

    if (analysis.uniforms.filter(u => u.type.includes("sampler")).length > 6) {
      recommendations.push("High number of texture uniforms - consider using texture arrays");
    }

    const hasUnshaded = analysis.render_modes.includes("unshaded");
    if (!hasUnshaded && analysis.shader_type === "spatial") {
      recommendations.push("Consider 'unshaded' render_mode if lighting is not needed");
    }

    if (analysis.issues.some(i => i.code === "SHADER008")) {
      recommendations.push("discard statements break early-Z - consider alpha scissor instead");
    }

    return recommendations;
  }
}
