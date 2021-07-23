import {
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native'

export interface SpatialState {
  groups: { [groupId: string]: SpatialGroupObject }
  collection: { [spatialId: string]: SpatialObject }
  focusKey: SpatialId | null
  groupFocusKey: SpatialId | null
  nearestNeigborThreshold: number
  logStateChanges: boolean
  logEvents: boolean
}

export type SpatialId = string | number
export type SpatialRef = TouchableOpacity

export interface SpatialNavigationContextState {
  activeGroupId: SpatialId
  state: SpatialState
  dispatch: React.DispatchWithoutAction
  getNextFocusHandles: (props: GetNextFocusHandles) => void
  registerGroup: (props: SpatialGroupObject) => () => (key: SpatialId) => void
  register: (props: RegisterProps) => () => (key: SpatialId) => void
  setElementFocus: (id: SpatialId) => void
  updateLayout: (layout: UpdateLayoutProps) => void
}

export interface GetNextFocusHandles {
  id: SpatialId
  groupId: SpatialId
  ref: SpatialRef
}

export interface UpdateBlurProps {
  id: SpatialId
  groupId: SpatialId
}

export interface SpatialNavigationProps {
  children: React.ReactNode | React.ReactNode[]
  id: SpatialId
}

export interface SpatialGroupContextState {
  groupId: SpatialId
  isFocused: boolean
}

export interface SpatialGroupProps extends Partial<NextFocusGroup> {
  hasTVPreferredFocus?: boolean
  id: SpatialId
  onBlur?: () => void
  onFocus?: () => void
  preferredChildFocusIndex?: number
  preferredChildFocusId?: SpatialId
  shouldTrackChildren?: boolean
}

export interface SpatialGroupObject extends NextFocusGroup {
  lastChildFocusedId?: SpatialId
  id: SpatialId
  groupParentId: SpatialId | undefined
  groupChildIds: SpatialId[]
  onBlur: () => void
  onFocus: () => void
  preferredChildFocusIndex?: number
  preferredChildFocusId?: SpatialId
  shouldTrackChildren?: boolean
  spatialChildIds: SpatialId[]
}

export interface SpatialObject {
  id: SpatialId
  groupId: SpatialId
  ref: SpatialRef
  layout?: SpatialLayoutObject
  nodehandle: number | null
  nextFocusRestrictions: NextFocusRestrictions
}

export interface SpatialLayoutObject {
  height: number
  width: number
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface SpatialButtonProps
  extends TouchableOpacityProps,
    Partial<NextFocusRestrictions> {
  activeOpacity?: number
  children: React.ReactNode | React.ReactNode[]
  hasTVPreferredFocus?: boolean
  id?: string | number
  onBlur?: () => void
  onFocus?: () => void
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export interface NextFocusElements {
  nextFocusUp: SpatialObject
  nextFocusDown: SpatialObject
  nextFocusRight: SpatialObject
  nextFocusLeft: SpatialObject
}

export interface NextFocusGroup {
  nextFocusUpGroup: SpatialId | undefined
  nextFocusDownGroup: SpatialId | undefined
  nextFocusRightGroup: SpatialId | undefined
  nextFocusLeftGroup: SpatialId | undefined
}

export interface NextFocusProps {
  nextFocusUp: number
  nextFocusDown: number
  nextFocusRight: number
  nextFocusLeft: number
}

export interface NextFocusRestrictions {
  disableSecondaryUp: boolean
  disableSecondaryRight: boolean
  disableSecondaryDown: boolean
  disableSecondaryLeft: boolean
}

export interface RegisterProps {
  element: SpatialRef
  id: SpatialId
  groupId: SpatialId
}

export interface UpdateLayoutProps {
  id: SpatialId
  height: number
  width: number
  x: number
  y: number
}

export interface SetGroupFocusProps {
  index?: number
  id: SpatialId
}

export interface SpatialDirection {
  up: SpatialObject[]
  right: SpatialObject[]
  down: SpatialObject[]
  left: SpatialObject[]
}

export interface PrioritizedSpatialDirection {
  primary: SpatialDirection
  secondary: SpatialDirection
}
