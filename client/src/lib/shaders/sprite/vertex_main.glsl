
// Pass the instance index to the fragment shader
vInstanceIndex = float(gl_InstanceID); // Use gl_InstanceID for instanced rendering

// Use instanced buffer attributes directly
float isOutlined = outlineState;
float isOwned = ownedState;
vec3 currentOutlineColor = outlineColor;

vHover = isOutlined;
vOutlineColor = currentOutlineColor;
vPulseColor = currentOutlineColor; // Use same color for pulse
vIsOwned = isOwned;
