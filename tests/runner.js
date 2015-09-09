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
var _checkOnlyInTests = RSVP.denodeify(mochaOnlyDetector.checkFolder.bind(null, root + '/{unit,acceptance}/**/*{-test,-slow}.js'));
var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec'
});

var testSuite = process.env['TEST_SUITE'] || 'default';
var testFiles;

if (process.argv.length > 2) {
  testFiles = process.argv.slice(2);
} else {
  testFiles = filesForTestSuite(testSuite);
}

addFiles(mocha, testFiles);

function filesForTestSuite(testSuite) {
  switch (testSuite) {
    case 'unit':
      return '/unit/**/*-test.js';
    case 'acceptance':
      return '/acceptance/*-test.js';
    case 'slow':
      return '/acceptance/*-slow.js';
    case 'addon':
      return '/acceptance/addon/*.js';
    case 'help':
      return '/acceptance/help/*.js';
    case 'default':
      var files = glob.sync(root + '/{unit,acceptance}/**/*-test.js');
      var jshintPosition = files.indexOf('tests/unit/jshint-test.js');
      var jshint = files.splice(jshintPosition, 1);
      return jshint.concat(files);
    default:
      throw new Error('Unable to find what tests should be run. The test suite "' + testSuite+ '" is unknown');
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
