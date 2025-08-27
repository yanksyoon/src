import Constants from "expo-constants";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Button, Easing, StyleSheet, TextInput, View } from "react-native";
import { AudioContext } from "react-native-audio-api";
import { Animated, AnimatedRegion } from "react-native-maps";

export default function HomeScreen() {
  const [searchAddress, setSearchAddress] = useState("");
  const [region, setRegion] = useState(
    new AnimatedRegion({
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    })
  );
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      region.setValue({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    };

    getLocation();
  }, [region]);

  // Effect to watch for location updates
  useEffect(() => {
    const watchLocation = async () => {
      const id = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1, // Update every meter
          timeInterval: 1000, // Update every second
        },
        (newLocation) => {
          const newRegion = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            easing: Easing.bezier(0.44, 0.66, 0, 0.99),
            timing: 600,
            toValue: 1,
            useNativeDriver: false,
          };
          region.timing(newRegion).start(); // Animate to new location
        }
      );

      setWatchId(id);
    };

    watchLocation();

    // Cleanup function to stop watching location
    return () => {
      if (watchId) {
        watchId.remove();
      }
    };
  }, [region, watchId]);

  const handlePlay = async () => {
    const audioContext = new AudioContext();

    const audioBuffer = await fetch(
      "https://software-mansion.github.io/react-native-audio-api/audio/music/example-music-02.mp3"
    )
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer));

    const playerNode = audioContext.createBufferSource();
    playerNode.buffer = audioBuffer;

    playerNode.connect(audioContext.destination);
    playerNode.start(audioContext.currentTime);
    playerNode.stop(audioContext.currentTime + 10);
  };

  return (
    <View style={styles.container}>
      <Animated
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {/* <Marker coordinate={region} pinColor="blue" /> */}
      </Animated>
      <View style={styles.buttonsContainer}>
        <TextInput value={searchAddress} style={styles.searchAddressInput} />
        <Button onPress={handlePlay} title={"play audio"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  searchAddressInput: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    flex: 1,
  },
  buttonsContainer: {
    position: "absolute",
    marginTop: Constants.statusBarHeight,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    borderColor: "#fff",
    borderWidth: 3,
  },
});
