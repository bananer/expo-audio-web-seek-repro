import { AudioStatus, useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

// 30 s, 440 Hz sine tone.
const source = require('./assets/tone.wav');

type LogLine = { text: string; wrong: boolean; marker: boolean };

export default function App() {
  const player = useAudioPlayer(source);
  const [log, setLog] = useState<LogLine[]>([]);

  const append = (line: LogLine) => setLog((previous) => [line, ...previous].slice(0, 40));

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      // `media` is the internal <audio> element of the web player. It is read only to show
      // the real state of the element next to the reported status.
      const media: HTMLMediaElement | undefined = (player as any).media;
      const wrong = status.playing === false && media?.paused === false && !media.ended;
      const text =
        `playing=${status.playing} currentTime=${status.currentTime}` +
        ` | <audio>.paused=${media?.paused} readyState=${media?.readyState}` +
        (wrong ? '   <-- WRONG: reports not playing, but the audio plays' : '');
      console.log(text);
      append({ text, wrong, marker: false });
    });
    return () => subscription.remove();
  }, [player]);

  const mark = (label: string) => {
    console.log(`--- ${label}`);
    append({ text: `--- ${label}`, wrong: false, marker: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>expo-audio web: seekTo(0) during playback reports playing: false</Text>
        <Text style={styles.text}>To reproduce:</Text>
        <Text style={styles.text}>1. Press "Play". A 440 Hz tone plays.</Text>
        <Text style={styles.text}>2. Wait one or two seconds.</Text>
        <Text style={styles.text}>3. Press "Seek to 0". Repeat it a few times, the result depends on timing.</Text>
        <Text style={styles.text}>4. For comparison, press "Seek to 5".</Text>
        <Text style={styles.text}>
          Each line below is one playbackStatusUpdate event, newest first. It shows the reported
          status and the real state of the internal {'<audio>'} element.
        </Text>
        <Text style={styles.text}>
          Expected: after a seek during playback, every event reports playing=true.
        </Text>
        <Text style={styles.text}>
          Unexpected: directly after "Seek to 0", one event reports playing=false with
          currentTime=0, although {'<audio>'}.paused=false and you still hear the tone. These lines
          are red. The next event reports playing=true again. "Seek to 5" never shows this.
        </Text>
      </View>
      <View style={styles.buttons}>
        <Button title="Play" onPress={() => { mark('play()'); player.play(); }} />
        <Button title="Pause" onPress={() => { mark('pause()'); player.pause(); }} />
        <Button title="Seek to 5" onPress={() => { mark('seekTo(5)'); player.seekTo(5); }} />
        <Button title="Seek to 0" onPress={() => { mark('seekTo(0)'); player.seekTo(0); }} />
        <Button title="Clear log" onPress={() => setLog([])} />
      </View>
      <ScrollView style={styles.log}>
        {log.map((line, index) => (
          <Text
            key={index}
            style={[styles.line, line.marker && styles.marker, line.wrong && styles.wrong]}>
            {line.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  instructions: { gap: 4, maxWidth: 800 },
  heading: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  text: { fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  log: { flex: 1 },
  line: { fontFamily: 'monospace', fontSize: 12 },
  marker: { fontWeight: 'bold', marginTop: 6 },
  wrong: { color: '#c00000', fontWeight: 'bold' },
});
