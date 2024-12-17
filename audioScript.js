// const playBTN = document.getElementById("playBtn");
// const synth = new Tone.Synth();

// //create a synth and connect it to the main output (yr speakers)
// // const synth = new Tone.Synth().toDestination();

// // const feedbackDelay = new Tone.FeedbackDelay("8n.", 0.7);
// const feedbackDelay = new Tone.FeedbackDelay({
//   delayTime: 0.5, //ratio of the max limit
//   feedback: 0.3,
//   maxDelay: 2, // sets the max limit of the delay
//   wet: 0.9,
// });

// synth.connect(feedbackDelay);
// feedbackDelay.toDestination();

// playBTN.addEventListener("click", () => {
//   if (Tone.context.state != "running") {
//     Tone.start();
//   }
//   //play a middle 'C' for the duration of an 8th note
//   synth.triggerAttackRelease("C5", "8n");
// });

// const synth = new Tone.Synth({
//   oscillator: {
//     type: "sawtooth",
//   },
// }).toDestination();

// const keyboard = new AudioKeys();

// keyboard.down((key) => {
//   synth.triggerAttackRelease(key.frequency, "8n");
// });
