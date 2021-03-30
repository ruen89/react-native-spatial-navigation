/* Dependencies
================================================================== */
import * as React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { SpatialApi, SpatialButton, SpatialNavigationGroupContext } from '../'

const { useCallback, useContext, useState } = React

/* Types
================================================================== */
interface BoxProps {
  hasTVPreferredFocus?: boolean
  index: number
  onPress?: () => void
  totalCount: number
}

/* Box
================================================================== */
export default function ({
  hasTVPreferredFocus = false,
  index,
  totalCount,
  onPress,
}: BoxProps) {
  const [isFocused, setFocused] = useState<boolean>(false)
  const { groupId } = useContext(SpatialNavigationGroupContext)
  const idPrefix = `${groupId}-Box-`
  const id = `${idPrefix}${index}`

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setFocused(false)
  }, [])

  const handlePress = useCallback(() => {
    const reverseIndex = totalCount - 1 - index
    SpatialApi.setFocusToElement(`${idPrefix}${reverseIndex}`)
  }, [idPrefix, index, totalCount])

  return (
    <SpatialButton
      hasTVPreferredFocus={hasTVPreferredFocus}
      id={id}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPress={onPress || handlePress}
      style={styles.boxRoot}
    >
      <View style={[styles.boxContent, isFocused && styles.focus]}>
        <Text style={styles[isFocused ? 'focusText' : 'text']}>{index}</Text>
      </View>
    </SpatialButton>
  )
}

const styles = StyleSheet.create({
  boxRoot: {
    marginHorizontal: 20,
  },
  boxContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(250,250, 250, 0.6)',
    height: 150,
    justifyContent: 'center',
    width: 150,
  },
  focus: {
    backgroundColor: 'rgba(0,0,0, 0.2)',
  },
  text: {
    color: '#242424',
  },
  focusText: {
    color: '#fff',
  },
})
