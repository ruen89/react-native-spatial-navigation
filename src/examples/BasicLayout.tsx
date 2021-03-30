/* Dependencies
================================================================== */
import * as React from 'react'
import { StyleSheet, View } from 'react-native'

import { SpatialNavigation } from '../'
/* Components
================================================================== */
import Box from './Box'

const data = [
  Array(5).fill(0),
  Array(5).fill(0),
  Array(5).fill(0),
  Array(5).fill(0),
]

export function ExampleBasicLayout() {
  return (
    <SpatialNavigation>
      <View style={styles.root}>
        {data.map((row, i) => {
          return (
            <View key={`row-${i}`} style={styles.row}>
              {row.map((item, x) => {
                const boxIndex = x + i * row.length
                return (
                  <Box
                    hasTVPreferredFocus={boxIndex === 12}
                    index={boxIndex}
                    key={`box-${x}`}
                    totalCount={data.flat().length}
                  />
                )
              })}
            </View>
          )
        })}
      </View>
    </SpatialNavigation>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: '#4e6377',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 20,
  },
})
