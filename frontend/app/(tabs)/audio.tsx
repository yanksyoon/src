import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  Points,
  Canvas as SKCanvas,
  SkPoint,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
} from "react-native-audio-api";

interface Size {
  width: number;
  height: number;
}

interface ChartProps {
  data: Uint8Array;
  dataSize: number;
}

const TimeChart: React.FC<ChartProps> = (props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const { data, dataSize } = props;

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setSize({ width, height });
  };

  const points = useMemo(() => {
    const startWidth = 20;
    const maxWidth = size.width - 2 * startWidth;
    const maxHeight = size.height;

    const p: SkPoint[] = [];

    data.forEach((value, index) => {
      const x = startWidth + (index * maxWidth) / dataSize;
      const y = maxHeight - (value / 255) * maxHeight;

      p.push(vec(x, y));
    });

    return p;
  }, [size, data, dataSize]);

  return (
    <SKCanvas style={{ flex: 1 }} onLayout={onCanvasLayout}>
      <Points points={points} mode="polygon" color="#B5E1F1" strokeWidth={5} />
    </SKCanvas>
  );
};

const FFT_SIZE = 512;

const AudioVisualizer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [times, setTimes] = useState<Uint8Array>(
    new Uint8Array(FFT_SIZE).fill(127)
  );
  const [freqs, setFreqs] = useState<Uint8Array>(
    new Uint8Array(FFT_SIZE / 2).fill(0)
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const handlePlayPause = () => {
    if (
      !audioBufferRef.current ||
      !audioContextRef.current ||
      !analyserRef.current
    )
      return;
    setIsPlaying((prev) => !prev);
    switch (audioContextRef.current.state) {
      case "running":
        audioContextRef.current.suspend();
        return;
      case "closed":
        console.log("CLOSED");
        return;
      case "suspended":
        audioContextRef.current.resume();
        requestAnimationFrame(draw);
    }
  };

  const draw = () => {
    if (!analyserRef.current || isEnded) {
      return;
    }

    const timesArrayLength = analyserRef.current.fftSize;
    const frequencyArrayLength = analyserRef.current.frequencyBinCount;

    const timesArray = new Uint8Array(timesArrayLength);
    analyserRef.current.getByteTimeDomainData(timesArray);
    setTimes(timesArray);

    const freqsArray = new Uint8Array(frequencyArrayLength);
    analyserRef.current.getByteFrequencyData(freqsArray);
    setFreqs(freqsArray);

    if (
      audioContextRef.current?.currentTime >= audioBufferRef.current?.duration
    ) {
      onAudioEnded();
      return;
    }
    setCurrentTime(Math.floor(audioContextRef.current?.currentTime || 0));
    requestAnimationFrame(draw);
  };

  const onAudioEnded = () => {
    setIsEnded(true);
  };

  const fetchBuffer = async (url: string) => {
    setIsLoading(true);
    audioBufferRef.current = await fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) =>
        audioContextRef.current!.decodeAudioData(arrayBuffer)
      );
    bufferSourceRef.current = audioContextRef.current?.createBufferSource();
    bufferSourceRef.current.buffer = audioBufferRef.current;
    bufferSourceRef.current?.connect(audioContextRef.current?.destination);
    bufferSourceRef.current?.connect(analyserRef.current);
    bufferSourceRef.current?.start();
    audioContextRef.current?.suspend();
    setDuration(Math.floor(audioBufferRef.current?.duration || 0));
    setIsLoading(false);
  };

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = 0.8;

      analyserRef.current.connect(audioContextRef.current.destination);
    }

    fetchBuffer(
      "https://software-mansion.github.io/react-native-audio-api/audio/music/example-music-02.mp3"
    );

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 0.2 }} />
      <TimeChart data={times} dataSize={FFT_SIZE} />
      <View
        style={{ flex: 0.5, justifyContent: "center", alignItems: "center" }}
      >
        {isLoading && <ActivityIndicator color="#FFFFFF" />}
        <View>
          <Text>
            {currentTime}/{duration}
          </Text>
        </View>
        <View style={styles.playControlsContainer}>
          <TouchableOpacity>
            <IconSymbol
              style={styles.playIcon}
              name="backward.fill"
              color={"#000"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayPause}>
            <IconSymbol
              style={styles.playIcon}
              name={isPlaying ? "pause.fill" : "play.fill"}
              color={"#000"}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <IconSymbol
              style={styles.playIcon}
              name="forward.fill"
              color={"#000"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playControlsContainer: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
  },
  playIcon: {
    marginLeft: 16,
    marginRight: 16,
  },
});

export default AudioVisualizer;
