"use client";

import React, { useMemo, type ComponentProps } from "react";
import { ReactShaderToy } from "@/components/react-shader-toy";
import { cn } from "@/lib/utils";

/**
 * Standalone aura visualizer for the AI agent avatar.
 * Uses the same WebGL shader as LiveKit's AgentAudioVisualizerAura
 * but without requiring LiveKit audio tracks or session state.
 *
 * States:
 * - idle: gentle slow pulse
 * - thinking: faster, more turbulent
 * - speaking: high energy, bright
 */

const DEFAULT_COLOR = "#1FD5F9";

function hexToRgb(hexColor: string) {
  try {
    const rgbColor = hexColor.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if (rgbColor) {
      const [, r, g, b] = rgbColor;
      return [r, g, b].map((c = "00") => parseInt(c, 16) / 255);
    }
  } catch { /* fallback */ }
  return [0.12, 0.84, 0.98]; // default cyan
}

const shaderSource = `
const float TAU = 6.283185;

vec2 randFibo(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.xx + p.yx) * p.xy);
}

vec3 Tonemap(vec3 x) {
  x *= 4.0;
  return x / (1.0 + x);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdCircle(vec2 st, float r) {
  return length(st) - r;
}

float getSdf(vec2 st) {
  return sdCircle(st, uScale);
}

vec2 turb(vec2 pos, float t, float it) {
  mat2 rotation = mat2(0.6, -0.25, 0.25, 0.9);
  mat2 layerRotation = mat2(0.6, -0.8, 0.8, 0.6);
  
  float frequency = mix(2.0, 15.0, uFrequency);
  float amplitude = uAmplitude;
  float frequencyGrowth = 1.4;
  float animTime = t * 0.1 * uSpeed;
  
  const int LAYERS = 4;
  for(int i = 0; i < LAYERS; i++) {
    vec2 rotatedPos = pos * rotation;
    vec2 wave = sin(frequency * rotatedPos + float(i) * animTime + it);
    pos += (amplitude / frequency) * rotation[0] * wave;
    rotation *= layerRotation;
    amplitude *= mix(1.0, max(wave.x, wave.y), uVariance);
    frequency *= frequencyGrowth;
  }

  return pos;
}

const float ITERATIONS = 36.0;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  
  vec3 pp = vec3(0.0);
  vec3 bloom = vec3(0.0);
  float t = iTime * 0.5;
  vec2 pos = uv - 0.5;
      
  vec2 prevPos = turb(pos, t, 0.0 - 1.0 / ITERATIONS);
  float spacing = mix(1.0, TAU, uSpacing);

  for(float i = 1.0; i < ITERATIONS + 1.0; i++) {
    float iter = i / ITERATIONS;
    vec2 st = turb(pos, t, iter * spacing);
    float d = abs(getSdf(st));
    float pd = distance(st, prevPos);
    prevPos = st;
    float dynamicBlur = exp2(pd * 2.0 * 1.4426950408889634) - 1.0;
    float ds = smoothstep(0.0, uBlur * 0.05 + max(dynamicBlur * uSmoothing, 0.001), d);
    
    vec3 color = uColor;
    if(uColorShift > 0.01) {
      vec3 hsv = rgb2hsv(color);
      hsv.x = fract(hsv.x + (1.0 - iter) * uColorShift * 0.3); 
      color = hsv2rgb(hsv);
    }
    
    float invd = 1.0 / max(d + dynamicBlur, 0.001);
    pp += (ds - 1.0) * color;
    bloom += clamp(invd, 0.0, 250.0) * color;
  }

  pp *= 1.0 / ITERATIONS;
  
  vec3 color;
  
  if(uMode < 0.5) {
    bloom = bloom / (bloom + 2e4);
    color = (-pp + bloom * 3.0 * uBloom) * 1.2;
    color += (randFibo(fragCoord).x - 0.5) / 255.0;
    color = Tonemap(color);
    float alpha = luma(color) * uMix;
    fragColor = vec4(color * uMix, alpha);
  } else {
    color = -pp;
    color += (randFibo(fragCoord).x - 0.5) / 255.0;
    float brightness = length(color);
    vec3 direction = brightness > 0.0 ? color / brightness : color;
    float factor = 2.0;
    float mappedBrightness = (brightness * factor) / (1.0 + brightness * factor);
    color = direction * mappedBrightness;
    float gray = dot(color, vec3(0.2, 0.5, 0.1));
    float saturationBoost = 3.0;
    color = mix(vec3(gray), color, saturationBoost);
    color = clamp(color, 0.0, 1.0);
    float alpha = mappedBrightness * clamp(uMix, 1.0, 2.0);
    fragColor = vec4(color, alpha);
  }
}`;

export type AiAuraState = "idle" | "thinking" | "speaking";

const STATE_PARAMS: Record<AiAuraState, {
  speed: number; amplitude: number; frequency: number; scale: number; brightness: number;
}> = {
  idle:     { speed: 0.6, amplitude: 0.3, frequency: 0.3, scale: 0.18, brightness: 0.7 },
  thinking: { speed: 1.2, amplitude: 0.6, frequency: 0.5, scale: 0.22, brightness: 0.9 },
  speaking: { speed: 1.8, amplitude: 0.8, frequency: 0.7, scale: 0.25, brightness: 1.0 },
};

interface AiAuraProps extends ComponentProps<"div"> {
  /** Visual state of the aura */
  state?: AiAuraState;
  /** Color in hex format */
  color?: `#${string}`;
  /** Color shift amount (0-1) */
  colorShift?: number;
  /** Theme mode */
  themeMode?: "dark" | "light";
}

export function AiAura({
  state = "idle",
  color = DEFAULT_COLOR as `#${string}`,
  colorShift = 0.3,
  themeMode,
  className,
  ...props
}: AiAuraProps) {
  const resolvedTheme = themeMode ?? (
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark" : "light"
  );

  const rgbColor = useMemo(() => hexToRgb(color), [color]);
  const params = STATE_PARAMS[state];

  return (
    <div className={cn("aspect-square", className)} {...props}>
      <ReactShaderToy
        fs={shaderSource}
        devicePixelRatio={1}
        animateWhenNotVisible
        clearColor={[0, 0, 0, 0]}
        contextAttributes={{ premultipliedAlpha: false, alpha: true }}
        uniforms={{
          uSpeed:      { type: "1f", value: params.speed },
          uBlur:       { type: "1f", value: 0.2 },
          uScale:      { type: "1f", value: params.scale },
          uFrequency:  { type: "1f", value: params.frequency },
          uAmplitude:  { type: "1f", value: params.amplitude },
          uBloom:      { type: "1f", value: 0.0 },
          uMix:        { type: "1f", value: params.brightness },
          uSpacing:    { type: "1f", value: 0.5 },
          uColorShift: { type: "1f", value: colorShift },
          uVariance:   { type: "1f", value: 0.1 },
          uSmoothing:  { type: "1f", value: 1.0 },
          uMode:       { type: "1f", value: resolvedTheme === "light" ? 1.0 : 0.0 },
          uColor:      { type: "3fv", value: rgbColor ?? [0, 0.7, 1] },
        }}
        onError={(e) => console.error("AiAura shader error:", e)}
        onWarning={(w) => console.warn("AiAura shader warning:", w)}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
