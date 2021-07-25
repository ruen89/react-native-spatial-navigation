import { Platform } from 'react-native';

const { SpatialNavigationApi } = Platform.select({
  ios: require('./coreJS'),
  android: require('./coreNative'),
});

export const SpatialApi = new SpatialNavigationApi();
