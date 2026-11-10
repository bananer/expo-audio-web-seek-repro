# expo-audio web: seekTo(0) during playback reports playing: false

Minimal reproduction for expo-audio 58.0.11 (Expo SDK 58) on web.

Live version: https://bananer.github.io/expo-audio-web-seek-repro/

## Steps

1. Open the live version. To run it locally instead, run `npm install` and then `npx expo start --web`.
2. Press "Play".
3. Wait one or two seconds, then press "Seek to 0". The result depends on timing, so do this a few times.
4. Read the status log on the page or in the browser console. The page shows each wrong event in red.

## Expected

The `playbackStatusUpdate` event after the seek reports `playing: true`, because the audio continues to play.

## Actual

The event after the seek reports `playing: false`. The `<audio>` element is not paused, and the audio continues to play. The next `timeupdate` event reports `playing: true` again.

```
--- seekTo(0)
playing=false currentTime=0 | <audio>.paused=false readyState=4
playing=true currentTime=0.705632 | <audio>.paused=false readyState=4
--- seekTo(5)
playing=true currentTime=5 | <audio>.paused=false readyState=4
```

In one test run, 7 of 8 seeks to 0 gave this result (headless Chromium). The other seek fired `seeked` at `currentTime=0.001098` and reported `playing: true`. A seek to 5 always reports `playing: true`.

Some apps copy `playing` into their own state, for example for a play/pause button. Such an app takes the wrong value as a pause by the user. If that app then calls `pause()`, playback really stops.

## Cause

`getStatusFromMedia` in `src/AudioUtils.web.ts` computes `playing` as follows:

```ts
const isPlaying = !!(
  media.currentTime > 0 && !media.paused && !media.ended && media.readyState > 2
);
```

The `onplay` and `onpause` handlers in `src/AudioPlayer.web.ts` override this value with `this.isPlaying`. The `onseeked` and `ontimeupdate` handlers emit it as is. Directly after a seek to 0, `currentTime` is exactly 0, so `playing` is false. A seek into a range that is not buffered (`readyState <= 2`) can give the same result.

## Possible fix

Derive `playing` from the paused and ended state only, or use `this.isPlaying` in `onseeked` the same way as `onplay` and `onpause` do:

```ts
const isPlaying = !media.paused && !media.ended;
```

The status log reads the internal `media` property of the web player only to show the real state of the `<audio>` element. The bug does not depend on it.
