import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// The capture is 1920x1080; keep it pixel-for-pixel. Rendering at 0.5 is
// 27% faster but puts the app's own UI text at 960x540, and these clips
// exist to show that text being used.
Config.setScale(1);

// Measured on this machine (8 cores): 4 renderers take a 23-second clip in
// 77s against 85s at the default, and already pull ~700% of 800% CPU. The
// machine is saturated by one render, which is also why running two batches
// side by side does not help — it splits the same throughput.
Config.setConcurrency(4);
