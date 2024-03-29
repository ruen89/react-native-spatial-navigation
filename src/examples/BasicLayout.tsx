/* Dependencies
================================================================== */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { SpatialNavigationProvider } from '../';

/* Components
================================================================== */
import Box from './Box';

const data = [
  Array(5).fill(0),
  Array(5).fill(0),
  Array(5).fill(0),
  Array(5).fill(0),
];

export function ExampleBasicLayout() {
  return (
    <SpatialNavigationProvider>
      <View style={styles.root}>
        {data.map((row: undefined[], i) => {
          return (
            <View key={`row-${i}`} style={styles.row}>
              {row.map((_, x) => {
                const boxIndex = x + i * row.length;
                return (
                  <Box
                    hasTVPreferredFocus={boxIndex === 12}
                    index={boxIndex}
                    key={`box-${x}`}
                    totalCount={data.flat().length}
                  />
                );
              })}
            </View>
          );
        })}
      </View>
    </SpatialNavigationProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: '#1e5e9b',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 10,
  },
});
