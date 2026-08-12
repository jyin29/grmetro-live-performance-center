"use strict";

const config = require("./presentation.json");
const PRESENTATION_DISPLAYS = Object.freeze(config.displays.map((display) => Object.freeze({ ...display })));
const PRESENTATION_COMMANDS = Object.freeze({ ...config.commands });

module.exports = Object.freeze({
  PRESENTATION_DISPLAYS,
  PRESENTATION_COMMANDS,
  PRESENTATION_SLIDE_COUNT: config.slideCount,
  PRESENTATION_ROTATION_MILLISECONDS: config.rotationMilliseconds,
});
