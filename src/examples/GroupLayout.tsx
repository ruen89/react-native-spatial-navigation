/* Dependencies
================================================================== */
import * as React from 'react'
import { StyleSheet, View } from 'react-native'

import { SpatialApi, SpatialGroup, SpatialNavigation } from '../'
import Box from './Box'

const groups = [
  {
    data: [Array(4).fill(0), Array(4).fill(0)],
    groupProps: {
      id: 'Group-1',
      preferredChildFocusIndex: 1,
      preferredChildFocusId: 'Group-1-Box-4',
    },
    onPress: () => {
      SpatialApi.setFocusToGroup('Group-3')
    },
  },
  {
    data: [Array(4).fill(0)],
    groupProps: {
      hasTVPreferredFocus: true,
      id: 'Group-2',
      // preferredChildFocusIndex: 3,
      // preferredChildFocusId: 'Group-2-Box-2',
    },
    onPress: () => {
      SpatialApi.setFocusToGroup('Group-4')
    },
  },
  {
    data: [Array(4).fill(0), Array(4).fill(0)],
    groupProps: {
      id: 'Group-3',
      preferredChildFocusIndex: 2,
      preferredChildFocusId: 'Group-3-Box-6',
      shouldTrackChildren: true,
    },
    onPress: () => {
      SpatialApi.setFocusToGroup('Group-1')
    },
  },
  {
    data: [Array(4).fill(0), Array(4).fill(0)],
    groupProps: {
      id: 'Group-4',
      preferredChildFocusIndex: 3,
      preferredChildFocusId: 'Group-4-Box-7',
    },
    onPress: () => {
      SpatialApi.setFocusToGroup('Group-2')
    },
  },
]

const colors = [
  'rgba(132, 169, 140, 0.7)',
  'rgba(161, 130, 118, 0.7)',
  'rgba(138, 196, 255, 0.7)',
  'rgba(127, 106, 147, 0.7)',
]

export function ExampleGroupLayout() {
  return (
    <SpatialNavigation>
      <View style={styles.root}>
        {groups.map(({ data, groupProps, onPress }, index) => {
          return (
            <View
              key={groupProps.id}
              style={[styles.group, { backgroundColor: colors[index] }]}
            >
              <SpatialGroup {...groupProps}>
                {data.map((column, i) => {
                  return (
                    <View key={`column-${i}`}>
                      {column.map((item, x) => {
                        const boxIndex = x + i * column.length
                        return (
                          <Box
                            //hasTVPreferredFocus={boxIndex === 0}
                            index={boxIndex}
                            key={`box-${x}`}
                            onPress={onPress}
                            totalCount={data.flat().length}
                          />
                        )
                      })}
                    </View>
                  )
                })}
              </SpatialGroup>
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
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'column',
    marginVertical: 10,
  },
  group: {
    flexDirection: 'row',
    paddingVertical: 20,
    marginRight: 40,
  },
})
