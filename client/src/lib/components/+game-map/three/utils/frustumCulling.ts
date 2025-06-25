import { Frustum, Matrix4, Vector3, Camera, Plane } from 'three';

export function isInFrustum(
  position: [number, number, number],
  camera: Camera,
  padding = 1,
): boolean {
  const frustum = new Frustum();
  const projScreenMatrix = new Matrix4();
  projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  frustum.setFromProjectionMatrix(projScreenMatrix);

  if (padding !== 0) {
    // Expand or shrink the frustum by moving each plane
    for (let i = 0; i < 6; i++) {
      const plane = frustum.planes[i];
      // Move the plane along its normal by the padding amount
      // Negative padding will shrink the frustum
      plane.constant += padding;
    }
  }

  const pos = new Vector3(position[0], position[1], position[2]);
  return frustum.containsPoint(pos);
}
