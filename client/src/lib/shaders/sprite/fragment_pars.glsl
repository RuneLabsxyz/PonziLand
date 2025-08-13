
uniform vec3 outlineColor;
uniform vec3 pulseColor;
uniform float outlineWidth;
uniform vec2 resolution;

varying float vHover;
varying float vInstanceIndex;

vec3 baseColor; // To store outline/glow color
float baseAlpha; // To store outline/glow alpha
