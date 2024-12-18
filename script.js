let video;
let hands, faceMesh;
let handResults = [];
let faceResults = [];
let crtBuffer;
let noiseOffset = 0;
let wiggleOffset = 0;
let scanlineOffset = 0;
let staticPopFrames = 0;

function setup() {
  createCanvas(800, 600);

  // Initialize webcam feed
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // buffer for effects
  crtBuffer = createGraphics(640, 480);
  crtBuffer.pixelDensity(1);

  // initialize dem hands
  hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8,
  });

  hands.onResults((results) => {
    handResults = results.multiHandLandmarks || [];
  });

  // initialize da face
  faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8,
  });

  faceMesh.onResults((results) => {
    faceResults = results.multiFaceLandmarks || [];
  });

  // video:ON!!
  const camera = new Camera(video.elt, {
    onFrame: async () => {
      await hands.send({ image: video.elt });
      await faceMesh.send({ image: video.elt });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

function draw() {
  background(135, 135, 145);

  // effects to the buffer
  applyCRTEffects(crtBuffer);

  // Preserve the visuals on the CRT buffer
  crtBuffer.push();

  // image trails
  crtBuffer.fill(0, 90); // Fade effect
  crtBuffer.noStroke();
  crtBuffer.rect(0, 0, crtBuffer.width, crtBuffer.height);

  crtBuffer.translate(crtBuffer.width, 0);
  crtBuffer.scale(-1, 1);

  // drawing face
  for (let landmarks of faceResults) {
    drawFace(crtBuffer, landmarks);
  }

  // drawing hands
  for (let landmarks of handResults) {
    drawHand(crtBuffer, landmarks);
    if (landmarks && landmarks.length > 0) {
      checkFingertipAndPlaySound(landmarks);
    } else {
      console.warn("no landmarks detected");
    }
  }

  crtBuffer.pop();

  // draw to the main canvas
  push();
  translate(
    sin(wiggleOffset) * random(1, 3),
    cos(wiggleOffset * 0.5) * random(1, 3)
  );
  image(crtBuffer, 0, 0, width, height);
  pop();

  // magic
  drawMovingScanlines();
  addStaticPops();
  addAnimatedNoise();
  addArtifacts();
  chromaticAberration();

  // more magic -- offsets for fx
  noiseOffset += 0.05;
  wiggleOffset += 0.1;
  scanlineOffset += 6;
  if (scanlineOffset > height) scanlineOffset = 0;
}

function drawHand(buffer, landmarks) {
  buffer.stroke(255, 255, 255);
  buffer.strokeWeight(6);
  for (let [start, end] of connections) {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    buffer.line(
      startPoint.x * buffer.width,
      startPoint.y * buffer.height,
      endPoint.x * buffer.width,
      endPoint.y * buffer.height
    );
  }

  buffer.noStroke();
  buffer.fill(255, 255, 255, 200);
  for (let landmark of landmarks) {
    buffer.ellipse(landmark.x * buffer.width, landmark.y * buffer.height, 8, 8);
  }
}

function drawFace(buffer, landmarks) {
  let centroidX = 0;
  let centroidY = 0;

  for (let pt of landmarks) {
    centroidX += pt.x;
    centroidY += pt.y;
  }
  centroidX = (centroidX / landmarks.length) * buffer.width;
  centroidY = (centroidY / landmarks.length) * buffer.height;

  // lock and center the face in the middle of canvas
  let offsetX = buffer.width / 2 - centroidX;
  let offsetY = buffer.height / 2 - centroidY;

  // adjust landmarks based on the offset
  const points = landmarks.map((pt) => [
    pt.x * buffer.width + offsetX,
    pt.y * buffer.height + offsetY,
    pt.z * buffer.width, // Keep Z scaling consistent
  ]);

  // triangle mapping logic for face using delaunay***************

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

  // individual indices for facial features
  drawIndices(buffer, faceOutline, points, [255, 255, 255], null, 3);
  drawIndices(buffer, outerLips, points, [255, 0, 50, 15], [255, 45, 0, 95], 3); // Red lips outline
  drawIndices(buffer, innerLips, points, [235, 255, 50, 35], null, 2); // Inner lips
  drawIndices(buffer, leftEye, points, [35, 255, 50, 35], null, 1); // Blue eye
  drawIndices(buffer, rightEye, points, [35, 255, 50, 35], null, 1); // Blue eye

  drawIndices(buffer, leftEyebrow, points, [20, 35, 20, 35], [0, 0, 0], 2); //
  drawIndices(buffer, rightEyebrow, points, [20, 35, 20, 35], [0, 0, 0], 2); //
  drawIndices(buffer, noseBridge, points, [175, 175, 175, 35], null, 2); //
  drawIndices(buffer, nostrils, points, [175, 175, 175, 35], null, 2); //
  drawIndices(buffer, noseRidge, points, [175, 175, 175, 35], null, 2); //
  drawIndices(buffer, noseOutline, points, [175, 175, 175, 35], null, 2); //

  faceMasks(buffer, points);
}

// saturate and brighten
function applyCRTEffects(buffer) {
  buffer.filter(POSTERIZE, 6);
  brightenBuffer(buffer, 1.2);
}

// just brighten -- revisit
function brightenBuffer(buffer, brightnessFactor) {
  buffer.loadPixels();
  for (let i = 0; i < buffer.pixels.length; i += 4) {
    buffer.pixels[i] = constrain(buffer.pixels[i] * brightnessFactor, 75, 255); // Red
    buffer.pixels[i + 1] = constrain(
      buffer.pixels[i + 1] * brightnessFactor,
      75,
      255
    ); // Green
    buffer.pixels[i + 2] = constrain(
      buffer.pixels[i + 2] * brightnessFactor,
      75,
      255
    ); // Blue
  }
  buffer.updatePixels();
}

// scanlines buzz buzz
function drawMovingScanlines() {
  stroke(0, random(30, 150));
  let lineSpacing = 8;
  let offset = frameCount % lineSpacing;

  for (let y = -offset; y < height; y += lineSpacing) {
    line(0, y, width, y);
  }
}

// crackle!!! a lil sprinkle!!!
function addStaticPops() {
  if (random() < 0.015) {
    staticPopFrames = int(random(5, 20));
  }

  if (staticPopFrames > 0) {
    for (let i = 0; i < 300; i++) {
      let x = random(width);
      let y = random(height);
      let size = random(1, 3);
      fill(random(200, 255), random(50, 255));
      noStroke();
      rect(x, y, size, size);
    }
    staticPopFrames--;
  }
}

// different flavour of sprinkle
function addAnimatedNoise() {
  noStroke();
  fill(255, 60);
  for (let i = 0; i < 150; i++) {
    let x = random(width) + sin(noiseOffset) * 10;
    let y = random(height);
    rect(x, y, 2, 2);
  }
}

// glitch it up
function addArtifacts() {
  if (random() < 0.02) {
    let artifactHeight = random(10, 40);
    let y = random(height);
    let xOffset = random(-30, 30);

    copy(
      crtBuffer,
      0,
      y,
      crtBuffer.width,
      artifactHeight,
      xOffset,
      y,
      crtBuffer.width,
      artifactHeight
    );

    fill(random(200, 255), random(50, 255), random(50, 255), 50);
    rect(0, y, width, artifactHeight);
  }
}

// tint for the overlay*************
function chromaticAberration() {
  tint(255, 0, 0, 70);
  image(crtBuffer, -3, 0, width, height);

  tint(0, 255, 0, 70);
  image(crtBuffer, 0, -2, width, height);

  tint(0, 0, 255, 70);
  image(crtBuffer, 3, 2, width, height);

  noTint();
}

////////// audio logic
// initialize
const synth = new Tone.Synth().toDestination();

//notes relative to position
function mapFingertipToSound(fingertip) {
  const { x, y } = fingertip;

  // Map x to frequency
  const frequency = map(x, 0, windowWidth, 220, 880); // A3 to A5
  console.log(`Mapped Frequency: ${frequency}`);

  // Map y to volume
  const volume = map(y, 0, windowHeight, -12, 0); // -12dB to 0dB
  console.log(`Mapped Volume: ${volume}`);

  synth.volume.value = volume;
  return Tone.Frequency(frequency).toNote(); // convert frequency to note
  const note = mapFingertipToSound({ x, y });
  console.log(`Generated Note: ${note}`);
  if (!isNaN(note)) {
    synth.triggerAttackRelease(note, "8n");
  }
}

let lastPlayedNote = null; // track the last played note
let lastFingerPosition = { x: null, y: null }; // track fingertip position

// coordinates
function checkFingertipAndPlaySound(landmarks) {
  const indexFingertip = landmarks[8]; // Index finger tip

  if (landmarks[8]) {
    const x = landmarks[8].x * windowWidth; // scale normalized x to screen width
    const y = landmarks[8].y * windowHeight; // scale normalized y to screen height
    console.log(`Fingertip Position: x=${x}, y=${y}`);

    const note = mapFingertipToSound({ x, y });
    console.log(`Note to Play: ${note}`);

    if (note && note !== lastPlayedNote) {
      console.log(`Playing Note: ${note}`);
      synth.triggerAttackRelease(note, "8n");
      lastPlayedNote = note;
    }
  } else {
    console.warn("Index fingertip not found.");
  }

  if (indexFingertip && indexFingertip.x != null && indexFingertip.y != null) {
    const x = indexFingertip.x;
    const y = indexFingertip.y;

    // logic for distance and repeats
    const distance = dist(
      x,
      y,
      lastFingerPosition.x || 0,
      lastFingerPosition.y || 0
    );
    if (distance > 10) {
      // threshold to avoid re-triggering at similar positions
      const note = mapFingertipToSound({ x, y });

      console.log(`Generated Note: ${note}, Distance Moved: ${distance}`);

      // only play if it's a new note
      if (note !== lastPlayedNote) {
        synth.triggerAttackRelease(note, "8n"); // play the note
        console.log(`Playing Note: ${note}`);
        lastPlayedNote = note; // update last note
      }

      // update the last known finger position
      lastFingerPosition = { x, y };
    }
  } else {
    console.warn("Index fingertip not found or invalid.");
  }
}
