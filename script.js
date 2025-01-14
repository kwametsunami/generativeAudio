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
    minDetectionConfidence: 0.85,
    minTrackingConfidence: 0.8,
  });

  let lastHandDetectedTime = Date.now(); // timestamp for when hands were last detected
  const HAND_DETECTION_TIMEOUT = 1500; // second and a half timeout

  // handle hand results
  hands.onResults((results) => {
    // reset hand data for each frame
    handData.left = null;
    handData.right = null;

    // processing detected hands
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i].label; // 'Left' or 'Right'

        // assign landmarks to left or right hand based on handedness
        if (handedness === "Left") {
          //////// BIG FYI!!!! okay this is confusing but since the image is mirrored the hands are switched
          handData.right = { landmarks, handedness };
          console.log(handData.right);
        } else if (handedness === "Right") {
          handData.left = { landmarks, handedness };
        }
      }

      // update the last hand detected time if any hand is present
      if (handData.left || handData.right) {
        lastHandDetectedTime = Date.now();
      }
    }

    // check if 1.5 seconds have passed without detecting any hands
    if (Date.now() - lastHandDetectedTime > HAND_DETECTION_TIMEOUT) {
      noteClear(); // trigger note clearing
    }
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

// store handedness and landmarks for both hands
let handData = {
  left: null,
  right: null,
};

// lil check to see palm orientation
function isPalmFacingCamera(landmarks, hand) {
  const thumbX = landmarks[4].x; // thumb x-coordinate
  const pinkyX = landmarks[20].x; // pinky x-coordinate

  // determine if the palm is facing the camera based on the hand side
  const isPalmFacing = thumbX < pinkyX;

  // return true/false based on the hand
  return (
    (hand === "left" && isPalmFacing) || (hand === "right" && !isPalmFacing)
  );
}

function draw() {
  background(135, 135, 145);

  // effects to the buffer
  applyCRTEffects(crtBuffer);

  // save visuals on the CRT buffer
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
  if (handData.left) {
    let orientation = isPalmFacingCamera(handData.left.landmarks, "left");
    // left hand
    drawHand(crtBuffer, handData.left.landmarks, "yellow");
    playChord(handData.left.landmarks, orientation); // play chords with the left hand
  }

  if (handData.right) {
    let orientation = isPalmFacingCamera(handData.right.landmarks, "right");
    // right hand
    drawHand(crtBuffer, handData.right.landmarks, "blue");
    playNote(handData.right.landmarks, orientation); // play notes with the right hand
  }

  crtBuffer.pop();

  // ************************* border drawing for testing *************************
  // drawBorder(crtBuffer);
  // drawZoneBorders(crtBuffer, numZones);

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
// function drawBorder(crtBuffer) {
//   const leftBoundary = crtBuffer.width * 0.05; // 10% from the left edge
//   const rightBoundary = crtBuffer.width * 0.95; // 10% from the right edge
//   const topBoundary = crtBuffer.height * 0.05; // 10% from the top edge
//   const bottomBoundary = crtBuffer.height * 0.95; // 10% from the bottom edge
//   const middleX = crtBuffer.width / 2; // Middle of the canvas (x-axis)

//   // left border
//   crtBuffer.stroke(255, 0, 0); // Red border
//   crtBuffer.strokeWeight(2);
//   crtBuffer.noFill();
//   crtBuffer.line(leftBoundary, 0, leftBoundary, crtBuffer.height);

//   // right border
//   crtBuffer.line(rightBoundary, 0, rightBoundary, crtBuffer.height);

//   // top border
//   crtBuffer.line(0, topBoundary, crtBuffer.width, topBoundary);

//   // bottom border
//   crtBuffer.line(0, bottomBoundary, crtBuffer.width, bottomBoundary);

//   // middle line
//   crtBuffer.stroke(0, 255, 0); // Green line for the middle (optional color change)
//   crtBuffer.line(middleX, 0, middleX, crtBuffer.height);
// }

// draw zones

// function drawZoneBorders(crtBuffer, numZones) {
//   // boundaries
//   const topBoundary = crtBuffer.height * 0.05;
//   const bottomBoundary = crtBuffer.height * 0.95;

//   // calculate the width of each zone across the entire canvas
//   const zoneWidth = crtBuffer.width / numZones;

//   // border style
//   crtBuffer.stroke(0, 0, 255); // Blue lines for zones
//   crtBuffer.strokeWeight(2);

//   // draw vertical lines for each zone across the entire width
//   for (let i = 0; i <= numZones; i++) {
//     const x = i * zoneWidth;
//     crtBuffer.line(x, topBoundary, x, bottomBoundary); // Vertical line for each zone
//   }

//   // labels
//   crtBuffer.fill(255);
//   crtBuffer.noStroke();
//   crtBuffer.textSize(8);
//   for (let i = 0; i < numZones; i++) {
//     const labelX = i * zoneWidth + zoneWidth / 2;
//     crtBuffer.text(`Zone ${i + 1}`, labelX, topBoundary - 10); // Zone labels
//   }
// }

function drawHand(buffer, landmarks, color) {
  buffer.stroke(color === "blue" ? "blue" : "yellow");
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

  const fillColor =
    color === "blue" ? "rgba(0, 0, 255, 0.8)" : "rgba(255, 255, 0, 0.8)";
  buffer.fill(fillColor);

  for (let landmark of landmarks) {
    buffer.ellipse(landmark.x * buffer.width, landmark.y * buffer.height, 8, 8);
  }
}

let accompanyMode = false; // Tracks if accompany mode is active
let speedControlMode = false; // Tracks if speed control mode is active
let arpeggiatorSpeed = 0.5; // Default speed
let lastToggleTime = 0; // Tracks the last toggle time for debouncing
let debounceDuration = 300; // 300ms debounce duration
let speedLocked = false; // Tracks if speed has been locked

// Update chin detection logic
function drawFace(buffer, landmarks) {
  let centroidX = 0;
  let centroidY = 0;

  for (let pt of landmarks) {
    centroidX += pt.x;
    centroidY += pt.y;
  }
  centroidX = (centroidX / landmarks.length) * buffer.width;
  centroidY = (centroidY / landmarks.length) * buffer.height;

  let offsetX = buffer.width / 2 - centroidX;
  let offsetY = buffer.height / 2 - centroidY;

  const points = landmarks.map((pt) => [
    pt.x * buffer.width + offsetX,
    pt.y * buffer.height + offsetY,
    pt.z * buffer.width,
  ]);

  // testing mode switching with chin position --------------------- not working yet
  const chinPoint = points[152];
  const noseTip = points[1];

  if (chinPoint && noseTip) {
    const deltaX = chinPoint[0] - noseTip[0];
    const deltaY = chinPoint[1] - noseTip[1];

    const now = Date.now();
    const thresholdYAccompany = buffer.height * 0.05; // slight lowering for accompany
    const thresholdYSpeedControl = buffer.height * 0.1; // deeper lowering for speed control
    const thresholdXLeft = buffer.width * 0.15; // left zone
    const thresholdXRight = buffer.width * 0.15; // right zone

    // **toggle accompany mode**
    if (
      deltaY > thresholdYAccompany &&
      deltaY < thresholdYSpeedControl &&
      now - lastToggleTime > debounceDuration &&
      !speedControlMode // don't toggle accompany if in speed control mode
    ) {
      accompanyMode = !accompanyMode; // toggle accompany mode
      speedLocked = false; // reset speed lock
      console.log(accompanyMode ? "accompany mode on" : "accompany mode off");
      accompanyMode ? enableAccompanyMode() : disableAccompanyMode();
      lastToggleTime = now; // update debounce timer
    }

    // **speed control mode**
    if (
      accompanyMode &&
      deltaY > thresholdYSpeedControl &&
      !speedLocked // only allow speed control if speed isn't locked
    ) {
      if (!speedControlMode) {
        speedControlMode = true; // activate speed control
        console.log("Speed control mode activated");
      }

      // map x position to arpeggiator speed
      const maxSpeed = 10;
      const minSpeed = 0.5;
      arpeggiatorSpeed = map(
        chinPoint[0],
        noseTip[0] - thresholdXLeft, // furthest left
        noseTip[0] + thresholdXRight, // furthest right
        minSpeed,
        maxSpeed,
        true
      );

      console.log(`Arpeggiator speed: ${arpeggiatorSpeed} Hz`);
      adjustArpeggiatorSpeed(arpeggiatorSpeed);
    }

    // **lock speed**
    if (speedControlMode && deltaY < thresholdYSpeedControl) {
      console.log("Speed locked at", arpeggiatorSpeed, "Hz");
      speedControlMode = false; // exit speed control mode
      speedLocked = true; // lock the speed
    }
  }

  // drawing the face
  drawIndices(buffer, faceOutline, points, [255, 255, 255], null, 3);
  drawIndices(buffer, outerLips, points, [255, 0, 50, 15], [255, 45, 0, 95], 3);
  drawIndices(buffer, innerLips, points, [235, 255, 50, 35], null, 2);
  drawIndices(buffer, leftEye, points, [35, 255, 50, 35], null, 1);
  drawIndices(buffer, rightEye, points, [35, 255, 50, 35], null, 1);
  drawIndices(buffer, leftEyebrow, points, [20, 35, 20, 35], [0, 0, 0], 2);
  drawIndices(buffer, rightEyebrow, points, [20, 35, 20, 35], [0, 0, 0], 2);
  drawIndices(buffer, noseBridge, points, [175, 175, 175, 35], null, 2);
  drawIndices(buffer, nostrils, points, [175, 175, 175, 35], null, 2);
  drawIndices(buffer, noseRidge, points, [175, 175, 175, 35], null, 2);
  drawIndices(buffer, noseOutline, points, [175, 175, 175, 35], null, 2);

  faceMasks(buffer, points);
}

//////////////////////////////////////////// arp adjustments
// enable accompany mode
function enableAccompanyMode() {
  synthRight.set({ arpeggiator: true });
}

// disable accompany mode
function disableAccompanyMode() {
  synthRight.set({ arpeggiator: false });
}

// adjust arpeggiator speed
function adjustArpeggiatorSpeed(speed) {
  synthRight.set({ arpeggioRate: speed });
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
// individual synthesizers for both hands
const synthLeft = new Tone.PolySynth({
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 1,
  },
}).toDestination();

const synthRight = new Tone.Synth({
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 1,
    release: 1,
  },
}).toDestination();

// chords for left hand
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

const notes = ["A6", "G5", "F5", "E5", "D5", "C5", "B5", "A5"];

let lastZoneIndex = -1; // track the last zone the finger was in
let lastZoneIndexNote = -1;
let lastPlayedChord = null; // last played chord
let isChordPlaying = false; // whether the chord is currently playing
let currentOrientation = null;

let lastPlayedNote = null;
let isNotePlaying = false;

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

// play chords -- left hand
function playChord(landmarks, orientation) {
  const indexFingertip = landmarks[8]; // index finger coordinate
  const thumbTip = landmarks[4]; // thumb coordinate

  if (indexFingertip && thumbTip) {
    const fingerX = indexFingertip.x; // finger X normalized to [0, 1]
    const fingerY = indexFingertip.y; // finger Y normalized to [0, 1]

    const thumbX = thumbTip.x; // thumb X normalized to [0, 1]
    const thumbY = thumbTip.y; // thumb Y normalized to [0, 1]

    // check if the finger is out of bounds
    if (isOutOfBounds(landmarks)) {
      // If the finger is out of bounds, release all notes and stop the chord
      if (lastPlayedChord) {
        synthLeft.releaseAll(); // stop the chord
        stopArpeggiator();
        lastPlayedChord = null; // reset last played chord
        lastZoneIndex = -1; // reset zone index
      }
      return; // exit early to prevent playing
    }

    // calculate the distance between index finger and thumb
    const distance = dist(
      fingerX * width,
      fingerY * height,
      thumbX * width,
      thumbY * height
    );

    const strumThreshold = 0.05 * width; // min. pixel distance for playing a note
    const maxDistance = 0.25 * width; // max. distance for full volume

    // map distance to volume (distance = 0 -> mute, distance = large -> loud)
    const mappedVolume = map(
      distance,
      strumThreshold,
      maxDistance,
      -60,
      0,
      true
    );
    synthLeft.volume.value = mappedVolume;

    if (orientation === false) {
      if (distance > strumThreshold) {
        // calculate the zone index based on the X position across the entire canvas
        const zoneWidth = width / numZones; // calculate the width of each zone
        const zoneIndex = Math.floor((fingerX * width) / zoneWidth); // use fingerX normalized to map across the full width

        currentOrientation !== orientation && zoneIndex === lastZoneIndex
          ? (synthLeft.releaseAll(),
            startArpeggiator(lastPlayedChord),
            (currentOrientation = orientation))
          : (synthLeft.releaseAll(), currentOrientation);

        // ensure the zoneIndex is within bounds
        if (zoneIndex >= 0 && zoneIndex < numZones) {
          // if the zone has changed, release the previous chord and play the new one
          if (zoneIndex !== lastZoneIndex) {
            if (lastZoneIndex !== -1) {
              stopArpeggiator();
            }
            lastZoneIndex = zoneIndex; // update the last zone index

            // map the Y-position of the index finger to an octave range
            const fingerOctave = Math.floor(
              map(fingerY * height, height, 0, 0, 2) // invert the mapping: higher Y -> higher octaves
            );

            // get the chord for the current zone
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
              startArpeggiator(chord);
              lastPlayedChord = chord; // update the last played chord
            }
          }
        }
      }
    } else {
      // distance threshold check
      if (distance > strumThreshold) {
        // calculate the zone index based on the X position across the entire canvas
        const zoneWidth = width / numZones; // calculate the width of each zone
        const zoneIndex = Math.floor((fingerX * width) / zoneWidth); // use fingerX normalized to map across the full width

        if (currentOrientation !== orientation && zoneIndex === lastZoneIndex) {
          stopArpeggiator();
          console.log(lastPlayedChord);
          synthLeft.triggerAttack(lastPlayedChord);
          currentOrientation = true;
        } else {
          stopArpeggiator();
          // lastPlayedChord = null;
          currentOrientation = true;
        }

        // ensure the zoneIndex is within bounds
        if (zoneIndex >= 0 && zoneIndex < numZones) {
          // if the zone has changed, release the previous chord and play the new one
          if (zoneIndex !== lastZoneIndex) {
            if (lastZoneIndex !== -1) {
              synthLeft.releaseAll(); // stop previous chord
            }
            lastZoneIndex = zoneIndex; // update the last zone index

            // map the Y-position of the index finger to an octave range
            const fingerOctave = Math.floor(
              map(fingerY * height, height, 0, 0, 2) // invert the mapping: higher Y -> higher octaves
            );

            // get the chord for the current zone
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
              synthLeft.triggerAttack(chord); // play new chord
              lastPlayedChord = chord; // update the last played chord
            }
          }
        }
      } else {
        // if strum distance is below the threshold, release the current chord
        if (lastPlayedChord) {
          synthLeft.releaseAll(); // stop chord
          lastPlayedChord = null; // reset lastPlayedChord
          lastZoneIndex = -1; // reset zone
        }
      }
    }
  }
}

// arp patter settings
let arpeggioPattern = new Tone.Pattern(
  function (time, note) {
    // trigger note at the given time
    synthLeft.triggerAttackRelease(note, "16n", time); //
  },
  [], // empty array of notes to be updated dynamically
  "upDown" // arpeggio direction
);

// start the arpeggiator for a selected chord
function startArpeggiator(chord) {
  // update the Pattern notes with the current chord
  arpeggioPattern.values = chord;

  // start the arpeggio
  arpeggioPattern.start(0); // starts the Pattern at the first beat
  arpeggioPattern.interval = "16n";

  // tone.js Transport is running
  if (Tone.Transport.state !== "started") {
    Tone.Transport.start(); // starts the Transport if it's not already running
  }
}

// stop the arpeggiator
function stopArpeggiator() {
  arpeggioPattern.stop(); // stop the Pattern
}

// play notes -- right hand
function playNote(landmarks, orientation) {
  if (landmarks.length > 0) {
    const indexFingertip = landmarks[8]; // index finger coordinate
    const thumbTip = landmarks[4]; // thumb coordinate

    if (indexFingertip && thumbTip) {
      const fingerX = indexFingertip.x; // finger X normalized to [0, 1]
      const fingerY = indexFingertip.y; // finger Y normalized to [0, 1]

      const thumbX = thumbTip.x; // thumb X normalized to [0, 1]
      const thumbY = thumbTip.y; // thumb Y normalized to [0, 1]

      // check if the finger is out of bounds
      if (isOutOfBounds(landmarks)) {
        // If the finger is out of bounds, release all notes and stop the chord
        if (lastPlayedNote) {
          synthRight.triggerRelease(); // stop the chord
          lastPlayedChord = null; // reset last played chord
          lastZoneIndexNote = -1; // reset zone index
        }
        return; // exit early to prevent playing
      }

      // calculate the distance between index finger and thumb
      const distance = dist(
        fingerX * width,
        fingerY * height,
        thumbX * width,
        thumbY * height
      );

      const strumThreshold = 0.05 * width; // min. pixel distance for playing a note
      const maxDistance = 0.3 * width; // max. distance for full volume

      // map distance to volume (distance = 0 -> mute, distance = large -> loud)
      const mappedVolume = map(
        distance,
        strumThreshold,
        maxDistance,
        -60,
        0,
        true
      );
      synthRight.volume.value = mappedVolume;

      // distance threshold check
      if (distance > strumThreshold) {
        // Calculate the zone index for the entire canvas
        const zoneIndexNote = Math.floor(
          map(
            fingerX * width, // finger's absolute X position
            0, // start from the left boundary
            width, // end at the right boundary
            0,
            numZones // map to the number of zones
          )
        );

        // if the zone has changed, release the previous note and play the new one
        if (zoneIndexNote !== lastZoneIndexNote) {
          if (lastZoneIndexNote !== -1) {
            synthRight.triggerRelease(); // stop previous note
          }
          lastZoneIndexNote = zoneIndexNote; // update the last zone index

          // map the Y-position of the index finger to an octave range
          const fingerOctave = Math.floor(
            map(fingerY * height, height, 0, 0, 2) // invert the mapping: higher Y -> higher octaves
          );

          // get the note for the current zone
          if (zoneIndexNote >= 0 && zoneIndexNote < numZones) {
            let note = notes[zoneIndexNote]; // Get the note for the current zone

            // adjust the note based on the octave determined by y-position
            const baseNote = note.substring(0, note.length - 1); // gets the note
            const baseOctave = parseInt(note[note.length - 1]); // gets the octave
            const octaveAdjustment = -1; // adjustment for reversed orientation
            if (orientation === false) {
              note = `${baseNote}${
                baseOctave + fingerOctave + octaveAdjustment
              }`; // adjust the octave based on finger position for reversed orientation
            } else {
              note = `${baseNote}${baseOctave + fingerOctave}`; // adjust the octave based on finger position
            }

            // if the current note is different from the last one, play the new note
            if (note !== lastPlayedNote) {
              synthRight.triggerAttack(note); // play the new note
              lastPlayedNote = note; // update the last played note
            }
          }
        }
      } else {
        // if strum distance is below the threshold, release the current note
        if (lastPlayedNote) {
          synthRight.triggerRelease(); // stop note
          lastPlayedNote = null; // reset lastPlayedNote
          lastZoneIndexNote = -1; // reset zone
        }
      }
    }
  }
}

// clean up notes if there are no hands in frame
function noteClear() {
  synthLeft.releaseAll();
  stopArpeggiator();
  synthRight.triggerRelease();
  lastPlayedNote = null; // reset last played notes if necessary
  lastPlayedChord = null;
  lastZoneIndex = -1; // reset zones
}
