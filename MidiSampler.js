function sampleMidi(path, offset) {
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

module.exports = sampleMidi;
