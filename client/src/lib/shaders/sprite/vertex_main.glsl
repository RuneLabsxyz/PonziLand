
// Pass the instance index to the fragment shader
vInstanceIndex = float(gl_InstanceID); // Use gl_InstanceID for instanced rendering

// Use instanced buffer attributes directly
float isOutlined = outlineState;
float isOwned = ownedState;
float isAuction = auctionState;
vec3 currentOutlineColor = outlineColor;
float currentTintState = tintState;
vec3 currentTintColor = tintColor;
float isStriped = stripedState;

vIsOutlined = isOutlined;
vOutlineColor = currentOutlineColor;
vPulseColor = currentOutlineColor; // Use same color for pulse
vIsOwned = isOwned;
vIsAuction = isAuction;
vTintState = currentTintState;
vTintColor = currentTintColor;
vIsStriped = isStriped;
