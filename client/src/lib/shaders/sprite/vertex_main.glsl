
// Pass the instance index to the fragment shader
vInstanceIndex = float(gl_InstanceID); // Use gl_InstanceID for instanced rendering

// Check if this instance is in the outlined instances array
float isOutlined = 0.0;
vec3 currentOutlineColor = vec3(1.0, 0.0, 0.0); // Default red
vec3 currentPulseColor = vec3(1.0, 1.0, 0.0);   // Default yellow

if (hoverState > 0.5) {
    for (int i = 0; i < 32; i++) {
        if (i >= numOutlinedInstances) break;
        if (vInstanceIndex == hoveredInstanceIndices[i]) {
            isOutlined = 1.0;
            currentOutlineColor = outlineColors[i];
            currentPulseColor = pulseColors[i];
            break;
        }
    }
}

// Check if this instance is owned
float isOwned = 0.0;
for (int i = 0; i < 32; i++) {
    if (i >= numOwnedLands) break;
    if (vInstanceIndex == ownedLandIndices[i]) {
        isOwned = 1.0;
        break;
    }
}

vHover = isOutlined;
vOutlineColor = currentOutlineColor;
vPulseColor = currentPulseColor;
vIsOwned = isOwned;
