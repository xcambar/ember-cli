/*jshint quotmark: false*/

'use strict';

var assertFile = require('../../helpers/assert-file');
var conf       = require('../../helpers/conf');
var ember      = require('../../helpers/ember');
var tmp        = require('../../helpers/tmp');
var expect     = require('chai').expect;

describe('Acceptance: ember install', function() {
  this.timeout(60000);

  before(function() {
    conf.setup();
  });

  after(function() {
    conf.restore();
  });

  beforeEach(function() {
    return tmp.setup('./tmp')
      .then(function() {
        process.chdir('./tmp');
      });
  });

  afterEach(function() {
    return tmp.teardown('./tmp');
  });

  function initApp() {
    return ember([
      'init',
      '--name=my-app',
      '--skip-npm',
      '--skip-bower'
    ]);
  }

  function installAddon(args) {
    var generateArgs = ['install'].concat(args);

    return initApp().then(function() {
      return ember(generateArgs);
    });
  }

  it('installs addons via npm and runs generators', function() {
    return installAddon(['ember-cli-fastclick', 'ember-cli-photoswipe']).then(function(result) {
      assertFile('package.json', {
        contains: [
          /"ember-cli-fastclick": ".*"/,
          /"ember-cli-photoswipe": ".*"/
        ]
      });

      assertFile('bower.json', {
        contains: [
          /"fastclick": ".*"/,
          /"photoswipe": ".*"/
        ]
      });

      expect(result.ui.output).not.to.include('The `ember generate` command '+
                                              'requires an entity name to be specified. For more details, use `ember help`.');
    });
  });
});
