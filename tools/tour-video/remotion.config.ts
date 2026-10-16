import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// The capture is 1920x1080; keep it pixel-for-pixel.
Config.setScale(1);
