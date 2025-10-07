
uniform float darkenFactor;
uniform bool darkenOnlyWhenUnzoomed;
uniform bool isUnzoomed;

// Instanced buffer attributes (supports 60k+ lands)
attribute float ownedState;
attribute float auctionState;
attribute float outlineState;
attribute vec3 outlineColor;
attribute float tintState;
attribute vec3 tintColor;

varying float vIsOutlined;
varying float vInstanceIndex;
varying vec3 vOutlineColor;
varying vec3 vPulseColor;
varying float vIsOwned;
varying float vIsAuction;
varying float vTintState;
varying vec3 vTintColor;
