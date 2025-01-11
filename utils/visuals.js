// hand connection points
const connections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky finger
  [0, 17],
  [2, 5], // Palm
];

// facial feature indicies -- data points to plot
let faceOutline = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];
let innerLips = [
  62, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14,
  87, 178, 88,
];
let outerLips = [
  0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 76, 185,
  40, 39, 37,
];
let leftEyebrow = [55, 65, 52, 53, 46, 70, 63, 105, 66, 107];
let rightEyebrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];
let leftEye = [
  33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
];
let rightEye = [
  362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381,
  382,
];
let noseBridge = [168, 6, 197, 195, 5, 4, 1, 19, 1, 4, 5, 195, 197, 6, 168];
let noseRidge = [
  48, 115, 220, 45, 4, 275, 440, 344, 278, 344, 440, 275, 4, 45, 220, 115, 48,
];
let nostrils = [240, 60, 242, 19, 354, 290, 460, 290, 354, 19, 242, 60, 240];
let noseOutline = [
  240, 64, 48, 49, 209, 217, 114, 128, 245, 193, 168, 417, 465, 357, 343, 437,
  429, 279, 278, 294, 460,
];

// draw Indicies function to draw the points of the facial features
function drawIndices(
  buffer,
  indices,
  points,
  strokeColor = [255, 255, 255],
  fillColor = null,
  weight = 1
) {
  if (strokeColor) {
    buffer.stroke(...strokeColor);
  } else {
    buffer.noStroke();
  }

  if (fillColor) {
    buffer.fill(...fillColor);
  } else {
    buffer.noFill();
  }

  buffer.strokeWeight(weight);

  buffer.beginShape();
  for (let i of indices) {
    let [x, y] = points[i]; // Use adjusted points
    buffer.vertex(x, y);
  }
  buffer.endShape(CLOSE);
}

function faceMasks(buffer, points) {
  // Optional: Add masks for specific features
  buffer.fill(255, 225, 225);
  buffer.noStroke();

  // Left eye mask
  buffer.beginShape();
  for (let i of leftEye) {
    buffer.vertex(points[i][0], points[i][1]);
  }
  buffer.endShape(CLOSE);

  // Right eye mask
  buffer.beginShape();
  for (let i of rightEye) {
    buffer.vertex(points[i][0], points[i][1]);
  }
  buffer.endShape(CLOSE);

  buffer.fill(25, 20, 5);
  // Mouth mask
  buffer.beginShape();
  for (let i of innerLips) {
    buffer.vertex(points[i][0], points[i][1]);
  }
  buffer.endShape(CLOSE);
}
