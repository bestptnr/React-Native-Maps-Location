import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import * as geolib from 'geolib';
import * as Location from "expo-location";
import MapView, { Polyline } from 'react-native-maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as TaskManager from 'expo-task-manager';


TaskManager.defineTask('updateLocation', ({ data: { locations }, error }) => {
  if (error) {
    console.log('Error updating location:', error);
    return;
  }
  DeviceEventEmitter.emit('updateLocationEvent', { locations, error });

});

export default function App() {
  const mapRef = useRef(null)
  const [currentLocation, setCurrentLocation] = useState({});
  const [polyLinePosition, setPolyLinePosition] = useState([])
  const [distance, setDistance] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const distanceBetween = async (from, to) => {
    const geo = geolib.getDistance(
      { latitude: from.coords.latitude, longitude: from.coords.longitude },
      { latitude: to.coords.latitude, longitude: to.coords.longitude }
    );
    return geo
  };

  useEffect(() => {
    async function requestLocationPermission() {
      const { status } = await Location.requestForegroundPermissionsAsync({})
      if (status === Location.PermissionStatus.GRANTED) {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status === Location.PermissionStatus.GRANTED) {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation(location);
          setIsLoading(true);
        }
      }
    }
    requestLocationPermission()
  }, [])

  useEffect(() => {
    async function getCurrentLocation() {
      try {
        await Location.startLocationUpdatesAsync("updateLocation", {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
          deferredUpdatesInterval: 1000,
          deferredUpdatesDistance: 0,
          foregroundService: {
            notificationTitle: 'Tracking your location',
            notificationBody: 'We are tracking your location in the background',
          },
        });
      } catch (error) {
        console.log("error >>> ", error);
      }
    }

    getCurrentLocation();
    
  }, []);

  const handleDistance = useCallback(async (locations) => {
    console.log('info >>> location', JSON.stringify({
      latitude: locations.locations[0].coords.latitude,
      longitude: locations.locations[0].coords.longitude
    }))
    const location = locations.locations[0];
    setPolyLinePosition((prev) => [...prev, location]);

    if (polyLinePosition.length > 1) {
      const d = await distanceBetween(polyLinePosition[polyLinePosition.length - 2], location);
      setDistance(prev=>prev+d);
    }
  }, [polyLinePosition]);

  useEffect(() => {
    DeviceEventEmitter.addListener('updateLocationEvent', handleDistance);
    return () => {
      DeviceEventEmitter.removeAllListeners('updateLocationEvent', handleDistance);
    };
  }, [handleDistance]);


  const asyncSetPolyLinePosition = async (location) => {

    await setPolyLinePosition(prev => {
      const newPolyLinePosition = [...prev, location];
      return newPolyLinePosition;
    });


  };

  if (!isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size={'large'} color={'black'} />
      </View>
    )
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View >
          <Text style={{ textAlign: 'center', fontSize: 30 }}>Running</Text>
        </View>
        <View >
          <MapView
            initialRegion={{
              latitude: currentLocation.coords?.latitude,
              longitude: currentLocation.coords?.longitude,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            }}
            minZoomLevel={10}
            followsUserLocation={true}
            showsMyLocationButton={true}
            showsUserLocation={true}
            loadingEnabled={true}
            ref={mapRef}
            style={{
              height: '100%',
            }}
          >
            <View style={styles.monitor}>
              <Text style={{ color: "white", fontWeight: 'bold', fontSize: 20 }}>DISTANCE : {distance / 1000} km</Text>
            </View>
            {polyLinePosition.length > 1 && (
              <Polyline
                coordinates={polyLinePosition.map((position) => {
                  const lat = position.coords.latitude
                  const lon = position.coords.longitude
                  return { latitude: lat, longitude: lon }
                })}
                strokeWidth={3}
                strokeColor="blue"
              />
            )}
          </MapView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitor: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: 50,
    width: '100%',
    padding: 10,
    justifyContent: 'center'

  },
  btnToggle: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    width: 100,
    height: 100,
    borderRadius: 60,
    zIndex: 9,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
