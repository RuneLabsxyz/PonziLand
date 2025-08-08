
uniform float hoverState;
uniform float hoveredInstanceIndices[32]; // Support up to 32 outlined instances
uniform int numOutlinedInstances;
uniform vec3 outlineColors[32]; // Support up to 32 different outline colors
uniform vec3 pulseColors[32];   // Support up to 32 different pulse colors

varying float vHover;
varying float vInstanceIndex;
varying vec3 vOutlineColor;
varying vec3 vPulseColor;
