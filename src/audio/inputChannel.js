// Which channel of the input device to listen to (Settings -> input).
// A 2-input audio interface (Scarlett 2i2, iRig Pro Duo …) delivers its
// inputs as a stereo stream: the guitar may be on input 1 (left) or input 2
// (right). 'mix' = the browser's default (what every listener did before).
import { getAudioInputSettings } from './audioInputSettingsStore';

const chosen = () => {
  const c = getAudioInputSettings().channel;
  return c === 1 || c === 2 ? c : null;
};

/** Extra getUserMedia audio constraints, or null when no channel is chosen. */
export function channelConstraint() {
  return chosen() ? { channelCount: { ideal: 2 } } : null;
}

/**
 * The stream as a Web Audio node: the MediaStreamSource itself, or — with a
 * channel chosen and a stereo stream — a mono node carrying just that input.
 */
export function inputNode(ctx, stream) {
  const source = ctx.createMediaStreamSource(stream);
  const c = chosen();
  if (!c) return source;
  let n = 0;
  try {
    n = stream.getAudioTracks()[0]?.getSettings?.().channelCount ?? 0;
  } catch {
    /* not reported */
  }
  if (n === 1) return source; // the device gave one channel: nothing to pick
  const split = ctx.createChannelSplitter(2);
  const pick = ctx.createGain();
  pick.channelCount = 1;
  pick.channelCountMode = 'explicit';
  source.connect(split);
  split.connect(pick, c - 1);
  return pick;
}
