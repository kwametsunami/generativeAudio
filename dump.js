// ************************* triangle mapping logic for face using delaunay ***************

//   const filteredPoints = points.filter(
//     (pt) => pt[0] >= 0 && pt[0] <= width && pt[1] >= 0 && pt[1] <= height
//   );

//   const delaunay = d3.Delaunay.from(filteredPoints.map((pt) => [pt[0], pt[1]]));
//   const triangles = delaunay.triangles;

//   const lightSource = { x: 0, y: 0, z: -200 };

//   // Iterate through triangles
//   for (let i = 0; i < triangles.length; i += 3) {
//     const [a, b, c] = [triangles[i], triangles[i + 1], triangles[i + 2]];
//     const p1 = points[a];
//     const p2 = points[b];
//     const p3 = points[c];

//     // Compute centroid and normal vector
//     const centroid = [
//       (p1[0] + p2[0] + p3[0]) / 3,
//       (p1[1] + p2[1] + p3[1]) / 3,
//       (p1[2] + p2[2] + p3[2]) / 3,
//     ];

//     const u = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
//     const v = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
//     const normal = [
//       u[1] * v[2] - u[2] * v[1],
//       u[2] * v[0] - u[0] * v[2],
//       u[0] * v[1] - u[1] * v[0],
//     ];

//     // Normalize vectors
//     const normalize = (vec) => {
//       const length = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
//       return vec.map((v) => v / length);
//     };
//     const n = normalize(normal);
//     const l = normalize([
//       lightSource.x - centroid[0],
//       lightSource.y - centroid[1],
//       lightSource.z - centroid[2],
//     ]);

//     // Calculate lighting intensity
//     const intensity = max(0, n[0] * l[0] + n[1] * l[1] + n[2] * l[2]);
//     const brightness = map(intensity, 0, 1, 50, 195);

//     // Draw triangles
//     buffer.fill(200, 200, 200, brightness); // Neon green with dynamic brightness 57, 255, 20
//     buffer.stroke(175, 175, 175, brightness - 50); // Darker neon green stroke 30, 200, 10
//     buffer.strokeWeight(1);

//     buffer.beginShape();
//     buffer.vertex(p1[0], p1[1]);
//     buffer.vertex(p2[0], p2[1]);
//     buffer.vertex(p3[0], p3[1]);
//     buffer.endShape(CLOSE);
//   }

//   // Calculate average Z for face outline visibility
//   const avgZ =
//     faceOutline.reduce((sum, idx) => sum + points[idx][2], 0) /
//     faceOutline.length;

//   if (avgZ < 0) {
//     // Draw facial outlines
//     drawIndices(faceOutline, points, [255, 255, 255], null, 3); // Face outline
//   }
