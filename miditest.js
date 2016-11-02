function generateMiDi() {
var colors = require('colors');
var sampleMidi = require('./MidiSampler');
var fs = require('fs');
var Midi = require('jsmidgen');
var dnn = require('dnn');

var NOTE_OFFSET = 45;
var WINDOW_WIDTH = 32;

var files = [];
for(var i = 0; i <1; i++) {
  files.push('uploads/'+i+'.mid');
}

//files = ['0.mid']

console.log(files);
/*
 *  Extract samples from files
 */

var data = [];
console.log("files length"+files.length);
for(var i = 0; i < files.length; i++) {
  if(!fs.existsSync(files[i]))
    continue;
  var samples = sampleMidi(files[i], NOTE_OFFSET);
  for(var j = 0; (j + 1) * WINDOW_WIDTH < samples.length; j++) {
    var submatrix = extractColumns(samples, j * WINDOW_WIDTH, WINDOW_WIDTH);
    data.push(unfold(submatrix));
  }
  console.log("Parsed " + i + "th file");
}

console.log(data.length);




rbm1 = createRBN(1280, 500, data); 
data2 = rbm1.sampleHgivenV(data)[1]; // get hidden layer probabilities from visible unit.
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




for(var i = 0; i < 18; i++) {
  var hiddenTmp = rbm3.sampleVgivenH(tmpfinal)[1][0];
  hiddenTmp = rbm2.sampleVgivenH([hiddenTmp])[1][0];
  var tmp = reshape(rbm1.sampleVgivenH([hiddenTmp])[1][0]);
  for(var j = 0; j < tmp.length; j++) {
    generated.push(tmp[j]);
  }
}

//Randomly select 1 and 0 and use the sampleVgivenH probablitiy to reconstruct. 
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

fs.writeFileSync(process.argv[2] || 'uploads/generatedMIDI.mid', file.toBytes(), 'binary');
}





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

function createRBN(input, output, data) {
  var rbm = new dnn.RBM({
      input : data,
      n_visible : input,
      n_hidden : output
  });

  rbm.set('log level', 2);

  var trainingEpochs = 150;

  rbm.train({
      lr : 0.6,
      k : 3,
      epochs : trainingEpochs
  });

  return rbm;
}


function getRandomActivation(n) {
  var rand = [];
  for(var i = 0; i < n; i++) {
    rand.push(Math.random());
  }
  return rand;
}

module.exports = generateMiDi;