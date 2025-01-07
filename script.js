let video;
let hands, faceMesh;
let handResults = [];
let faceResults = [];
let crtBuffer;
let noiseOffset = 0;
let wiggleOffset = 0;
let scanlineOffset = 0;
let staticPopFrames = 0;

// window variables
let leftZoneWidth, rightZoneWidth;
let borderMargin = 50; // distance from edges

function setup() {
  let aspectRatio = 16 / 9;
  let width = windowWidth;
  let height = windowWidth / aspectRatio;

  if (height > windowHeight) {
    height = windowHeight;
    width = height * aspectRatio;
  }

  leftBoundary = width * 0.05;
  rightBoundary = width * 0.95;
  topBoundary = height * 0.05;
  bottomBoundary = height * 0.95;

  createCanvas(width, height);

  // initialize webcam feed
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  zoneWidth = width / 2 / numZones; // divide the left half into equal zone

  leftZoneWidth = width / 2; // left side of the canvas
  rightZoneWidth = width / 2; // right side of the canvas

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

  //drawing hands
  for (let landmarks of handResults) {
    drawHand(crtBuffer, landmarks);
    if (landmarks && landmarks.length > 0) {
      playChord(handResults); // play the chord based on hand position
    } else {
      console.warn("No landmarks detected");
    }
  }

  crtBuffer.pop();

  // ************************* border drawing for testing *************************
  drawBorder(crtBuffer);
  drawZoneBorders(crtBuffer, numZones);

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

// draw borders
function drawBorder(crtBuffer) {
  const leftBoundary = crtBuffer.width * 0.05; // 10% from the left edge
  const rightBoundary = crtBuffer.width * 0.95; // 10% from the right edge
  const topBoundary = crtBuffer.height * 0.05; // 10% from the top edge
  const bottomBoundary = crtBuffer.height * 0.95; // 10% from the bottom edge
  const middleX = crtBuffer.width / 2; // Middle of the canvas (x-axis)

  // left border
  crtBuffer.stroke(255, 0, 0); // Red border
  crtBuffer.strokeWeight(2);
  crtBuffer.noFill();
  crtBuffer.line(leftBoundary, 0, leftBoundary, crtBuffer.height);

  // right border
  crtBuffer.line(rightBoundary, 0, rightBoundary, crtBuffer.height);

  // top border
  crtBuffer.line(0, topBoundary, crtBuffer.width, topBoundary);

  // bottom border
  crtBuffer.line(0, bottomBoundary, crtBuffer.width, bottomBoundary);

  // middle line
  crtBuffer.stroke(0, 255, 0); // Green line for the middle (optional color change)
  crtBuffer.line(middleX, 0, middleX, crtBuffer.height);
}

// draw zones

function drawZoneBorders(crtBuffer, numZones) {
  // boundaries
  const leftBoundary = crtBuffer.width * 0.05;
  const rightBoundary = crtBuffer.width * 0.95;
  const topBoundary = crtBuffer.height * 0.05;
  const bottomBoundary = crtBuffer.height * 0.95;

  // calculate zone widths for left and right
  const leftZoneWidth = (rightBoundary - leftBoundary) / 2 / numZones;
  const rightZoneStart = leftBoundary + (rightBoundary - leftBoundary) / 2;

  // border style
  crtBuffer.stroke(0, 0, 255); // Blue lines for zones
  crtBuffer.strokeWeight(2);

  // left zones
  for (let i = 0; i <= numZones; i++) {
    const x = leftBoundary + i * leftZoneWidth;
    crtBuffer.line(x, topBoundary, x, bottomBoundary); // Vertical line for each left zone
  }

  // right zones
  for (let i = 0; i <= numZones; i++) {
    const x = rightZoneStart + i * leftZoneWidth;
    crtBuffer.line(x, topBoundary, x, bottomBoundary); // Vertical line for each right zone
  }

  // labels
  crtBuffer.fill(255);
  crtBuffer.noStroke();
  crtBuffer.textSize(16);
  for (let i = 0; i < numZones; i++) {
    const leftLabelX = leftBoundary + i * leftZoneWidth + leftZoneWidth / 2;
    const rightLabelX = rightZoneStart + i * leftZoneWidth + leftZoneWidth / 2;

    crtBuffer.text(`L${i + 1}`, leftLabelX, topBoundary - 10); // Left zone labels
    crtBuffer.text(`R${i + 1}`, rightLabelX, topBoundary - 10); // Right zone labels
  }
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
const polySynth = new Tone.PolySynth(Tone.Synth).toDestination();

// chords for c major scale
const chords = [
  ["C4", "E4", "G4", "B4"], // Cmaj7
  ["D4", "F4", "A4", "C5"], // Dmin7
  ["E4", "G4", "B4", "D5"], // Emin7
  ["F4", "A4", "C5", "E5"], // Fmaj7
  ["G4", "B4", "D5", "F5"], // G7
  ["A4", "C5", "E5", "G5"], // Amin7
  ["B4", "D5", "F5", "A5"], // Bmin7(b5)
  ["C5", "E5", "G5", "B5"], // Cmaj7 up an octave
];

const numZones = chords.length; // number of zones
let isChordPlaying = false; // ...is it playing?
let lastPlayedChord = null; // last played chord

// function to check if finger tip is out of bounds
function isOutOfBounds(landmarks) {
  const handX = landmarks[8].x * width; // index
  const handY = landmarks[8].y * height;

  // defined boundary zones
  const leftBoundary = width * 0.05;
  const rightBoundary = width * 0.95;
  const topBoundary = height * 0.05;
  const bottomBoundary = height * 0.95;

  // check if the hand is out of bounds (left, right, top, or bottom)
  if (
    handX < leftBoundary || // left boundary
    handX > rightBoundary || // right boundary
    handY < topBoundary || // top boundary
    handY > bottomBoundary // bottom boundary
  ) {
    return true; // hand is out of bounds
  }
  return false; // hand is in bounds
}

let lastZoneIndex = -1; // track the last zone the finger was in
let lastStrumDistance = 0; // track the last distance of strum
let isPlaying = false; // keep track of whether the chord is already being played

function playChord(handResults) {
  if (handResults.length > 0) {
    const landmarks = handResults[0]; // single hand detection for now
    const indexFingertip = landmarks[8]; // index finger coordinate
    const thumbTip = landmarks[4]; // thumb coordinate

    if (indexFingertip && thumbTip) {
      const fingerX = indexFingertip.x; // finger X normalized to [0, 1]
      const fingerY = indexFingertip.y; // finger Y normalized to [0, 1]

      const thumbX = thumbTip.x; // thumb X normalized to [0, 1]
      const thumbY = thumbTip.y; // thumb Y normalized to [0, 1]

      // calculate the distance between index finger and thumb
      const distance = dist(
        fingerX * width,
        fingerY * height,
        thumbX * width,
        thumbY * height
      );

      const strumThreshold = 0.05 * width; // min. pixel distance for playing a note
      const maxDistance = 0.2 * width; // max. distance for full volume

      // map distance to volume (distance = 0 -> mute, distance = large -> loud)
      const mappedVolume = map(
        distance,
        strumThreshold,
        maxDistance,
        -60,
        0,
        true
      );
      polySynth.volume.value = mappedVolume;

      // distance threshold check
      if (distance > strumThreshold) {
        // zone index for right side
        const zoneIndex = Math.floor(
          map(
            fingerX * width, // finger's absolute X position
            width / 2, // start from the middle of the canvas (right half)
            rightBoundary, // end at the right boundary
            0,
            numZones // map to the number of zones
          )
        );

        // if the zone has changed, release the previous chord and play the new one
        if (zoneIndex !== lastZoneIndex) {
          if (lastZoneIndex !== -1) {
            polySynth.releaseAll(); // stop previous chord
          }
          lastZoneIndex = zoneIndex; // update the last zone index

          // map the Y-position of the index finger to an octave range
          const fingerOctave = Math.floor(
            map(fingerY * height, height, 0, 0, 2) // invert the mapping: higher Y -> higher octaves
          );

          // get the chord for the current zone
          if (zoneIndex >= 0 && zoneIndex < numZones) {
            let chord = chords[zoneIndex]; // get the chord for the current zone

            // adjust the chord notes based on the octave determined by the Y-position
            chord = chord.map((note) => {
              const baseNote = note.substring(0, note.length - 1);
              const baseOctave = parseInt(note[note.length - 1]);
              const newNote = `${baseNote}${baseOctave + fingerOctave}`;
              return newNote;
            });

            // if the current chord is different from the last one, play the new chord
            if (chord !== lastPlayedChord) {
              polySynth.triggerAttack(chord); // play new chord
              lastPlayedChord = chord; // update the last played chord
            }
          }
        }
      } else {
        // if strum distance is below the threshold, release the current chord
        if (lastPlayedChord) {
          polySynth.releaseAll(); // stop chord
          lastPlayedChord = null; // reset lastPlayedChord
          lastZoneIndex = -1; // reset zone
        }
      }
    }
  }
}
