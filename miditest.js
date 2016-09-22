var colors = require('colors');
var fs = require('fs');
var Midi = require('jsmidgen');
var dnn = require('dnn');

var NOTE_OFFSET = 45;
var WINDOW_WIDTH = 32;

var files = ['0.mid'];
/*for(var i = 0; i <= 53; i++) {
  files.push(+i+'.mid');
}
*/
console.log(files);

//files = ['zepplicained.mid']







function sampleMidi(path, offset) {
  console.log("inside sample midi");
  var midiFileParser = require('midi-file-parser');
  var file = require('fs').readFileSync(path, 'binary');
  var midi = midiFileParser(file);
  console.log(midi.header.trackCount);

  var trackResolution = midi.header.ticksPerBeat;
  var ticksPerSixteenth = trackResolution / 8;
  var trackNumber = (midi.header.trackCount == 1) ? 0 : 1;

  var notes = {};
  var noteCount = 0;

  for(i in midi.tracks[trackNumber]) {
    var event = midi.tracks[trackNumber][i];
    if (event.subtype == 'noteOn' && !notes[event.noteNumber]) {
      notes[event.noteNumber] = true;
      noteCount++;
    }
  }

  for(i in notes) {
    notes[i] = false;
  }

  var samples = [];
  var currentTick = 0;
  var sampleIndex = 0;

  for(i in midi.tracks[trackNumber]) {
    var event = midi.tracks[trackNumber][i];
    currentTick += event.deltaTime;
    if (ticksPerSixteenth * sampleIndex < currentTick) {
      var sample = generateEmptySample();
      for(i in notes) {
        if(i - offset < 40 && i - offset >= 0)
          sample[i - offset] = notes[i] ? 1 : 0;
      }
      samples.push(sample);
      sampleIndex++;
    }
    if (event.subtype == 'noteOn' && event.type == 'channel') {
      notes[event.noteNumber] = true;
    } else if (event.subtype == 'noteOff' && event.type == 'channel') {
      notes[event.noteNumber] = false;
    }
  }

  return samples;
}

function generateEmptySample() {
  var sample = [];
  for(var i = 0; i < 40; i++)
    sample.push(0);
  return sample;
}





/*
 *  Extract samples from files
 */

var data = [];
for(var i = 0; i < files.length; i++) {
  console.log("inside files");

  var samples = sampleMidi(files[i], NOTE_OFFSET);
  console.log("Samples");
  for(var j = 0; (j + 1) * WINDOW_WIDTH < samples.length; j++) {
    var submatrix = extractColumns(samples, j * WINDOW_WIDTH, WINDOW_WIDTH);
    data.push(unfold(submatrix));
  }
  console.log("Parsed " + i + "th file");
}
console.log(data.length);


function extractColumns(arr, start, length) {
  var res = [];
  for(var i = start; i < start + length; i++) {
    res.push(arr[i]);
  }
  return res;
}

function unfold(m) {
  var res = [];
  for(var i = 0; i < m.length; i++) {
    res = res.concat(m[i]);
  }
  return res;
}

function reshape(v) {
  var res = [];
  for(var i = 0; i < v.length / 40; i++) {
    res.push(extractColumns(v, i * 40, 40));
  }
  return res;
}

function printMatrix(m) {
  var rows = m[0].length;
  var columns = m.length;
  console.log("rows: " + rows + ", columns: " + columns + ", elements: " + (rows * columns));

  for(var i = rows - 1; i >= 0; i--) {
    for(var ii = 0; ii < columns; ii++) {
      if(m[ii][i] === 1)
        process.stdout.write((m[ii][i]+"").red)
      else
      process.stdout.write(m[ii][i]+"")
    }
    process.stdout.write('\n');
  }
}

/*
 *  Create model
 */

function createRBN(visible, output, data) {
  var rbm = new dnn.RBM({
      input : data,
      n_visible : visible,
      n_hidden : output
  });

  rbm.set('log level', 0);

  var trainingEpochs = 500;

  rbm.train({
      lr : 0.6,
      k : 1,
      epochs : trainingEpochs
  });

  return rbm;
}


rbm1 = createRBN(1280, 500, data);
data2 = rbm1.sampleHgivenV(data)[1];
rbm2 = createRBN(500, 250, data2);
data3 = rbm2.sampleHgivenV(data2)[1];
rbm3 = createRBN(250, 7, data3);

/*
 *  Generate note matrix using trained units
 */

var generated = [];

var tmpdata2 = rbm1.sampleHgivenV(data)[0];
var tmpdata3 = rbm2.sampleHgivenV(data2)[0];
var tmpfinal = rbm3.sampleHgivenV(data3)[0];

// Randomize results
// for(var i = 0; i < tmpfinal.length; i++) {
//   for(var j = 0; j < tmpfinal[i].length; j++) {
//     if (Math.random() > 0.8) {
//       tmpfinal[i][j] += -0.05 + Math.random() * 0.1;
//     }
//   }
// }

function getRandomActivation(n) {
  var rand = [];
  for(var i = 0; i < n; i++) {
    rand.push(Math.random());
  }
  return rand;
}


for(var i = 0; i < 12; i++) {
  var hiddenTmp = rbm3.sampleVgivenH(tmpfinal)[1][0];
  hiddenTmp = rbm2.sampleVgivenH([hiddenTmp])[1][0];
  var tmp = reshape(rbm1.sampleVgivenH([hiddenTmp])[1][0]);
  for(var j = 0; j < tmp.length; j++) {
    generated.push(tmp[j]);
  }
}

for(var i = 0; i < generated.length; i++) {
  for(var j = 0; j < generated[i].length; j++) {
    generated[i][j] = (generated[i][j] > Math.random()) ? 1 : 0;
  }
}


printMatrix(generated);

/*
 *  Save generated matrix to MIDI file
 */


var events = generated;



var file = new Midi.File();
var track = new Midi.Track();
var offset = 0;
var offsetStep = 32;
var VELOCITY = 100;
file.addTrack(track);

var currentlyPlaying = {};
for (var col = 0; col < events.length - 1; col++){
  for(var i = 0; i < 40; i++) {
    if(events[col][i] === 1 && !currentlyPlaying[i]) {
      currentlyPlaying[i] = true;
      track.addNoteOn(0, i+NOTE_OFFSET, offset, VELOCITY);
      offset = 0;
    }
  }
  var firstOff = true;
  for(var i = 0; i < 40; i++) {
    if(events[col][i] === 0 && currentlyPlaying[i]) {
      currentlyPlaying[i] = false;
      track.addNoteOff(0, i+NOTE_OFFSET, firstOff ? offsetStep : 0, VELOCITY);
      firstOff = false;
    }
  }
  if (firstOff)
    offset += offsetStep;
}
var fistOff = true;
for(var i = 0; i < 40; i++) {
  if(events[events.length - 1][i] === 0 && currentlyPlaying[i]) {
    currentlyPlaying[i] = false;
    track.addNoteOff(0, i+NOTE_OFFSET, firstOff ? offsetStep : 0, VELOCITY);
    firstOff = false;
  }
}

fs.writeFileSync(process.argv[2] || 'test.mid', file.toBytes(), 'binary');
