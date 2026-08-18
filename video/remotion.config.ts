import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// The deck and the product both render text as the primary subject, so quality
// here is about legibility of small monospace glyphs rather than gradients.
Config.setJpegQuality(94);
Config.setChromiumOpenGlRenderer('angle');
