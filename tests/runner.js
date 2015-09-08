'use strict';

var glob = require('glob');
var Mocha = require('mocha');
var RSVP = require('rsvp');
var rimraf = require('rimraf');
var mochaOnlyDetector = require('mocha-only-detector');

if (process.env.EOLNEWLINE) {
  require('os').EOL = '\n';
}

rimraf.sync('.node_modules-tmp');
rimraf.sync('.bower_components-tmp');

var root = 'tests';
var _checkOnlyInTests = RSVP.denodeify(mochaOnlyDetector.checkFolder.bind(null, root + '/**/*{-test,-slow}.js'));
var optionOrFile = process.argv[2];
var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec'
});
var testFiles = glob.sync(root + '/**/*-test.js');
var jshintPosition = testFiles.indexOf('tests/unit/jshint-test.js');
var jshint = testFiles.splice(jshintPosition, 1);

testFiles = jshint.concat(testFiles);

var testScope = process.env['TEST_SCOPE'];

if (!testScope) {
  if (optionOrFile === 'all') {
    addFiles(mocha, testFiles);
    addFiles(mocha, '/**/*-slow.js');
  } else if (process.argv.length > 2)  {
    addFiles(mocha, process.argv.slice(2));
  } else {
    addFiles(mocha, testFiles);
  }
} else {
  switch (testScope) {
    case 'unit':
      addFiles(mocha, '/unit/**/*-test.js');
      break;
    case 'acceptance':
      addFiles(mocha, '/acceptance/**/*-test.js');
      break;
    case 'slow':
      addFiles(mocha, '/**/*-slow.js');
      break;
    default:
      throw new Error('Unable to find what tests should be run. TEST_SCOPE "' + testScope+ '" is unknown');
  }
}


function addFiles(mocha, files) {
  files = (typeof files === 'string') ? glob.sync(root + files) : files;
  files.forEach(mocha.addFile.bind(mocha));
}

function checkOnlyInTests() {
  console.log('Verifing `.only` in tests');
  return _checkOnlyInTests().then(function() {
    console.log('No `.only` found');
  });
}

function runMocha() {
  mocha.run(function(failures) {
    process.on('exit', function() {
      process.exit(failures);
    });
  });
}

function ciVerificationStep() {
  if (process.env.CI === 'true') {
    return checkOnlyInTests();
  } else {
    return RSVP.resolve();
  }
}

ciVerificationStep()
  .then(function() {
    runMocha();
  })
  .catch(function(error) {
    console.error(error);
    process.exit(1);
  });
