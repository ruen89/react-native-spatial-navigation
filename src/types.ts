import {
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native'

export interface SpatialState {
  groups: SpatialGroupObject[]
  collection: SpatialObject[]
  focusKey: SpatialId | null
  groupFocusKey: SpatialId | null
  nearestNeigborThreshild: number
  logStateChanges: boolean
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
  callBack: (props: NextFocusProps) => void
  id: SpatialId
  groupId: SpatialId
  ref: SpatialRef
}

export interface SpatialNavigationProps {
  children: React.ReactNode | React.ReactNode[]
  id: SpatialId
}

export interface SpatialGroupContextState {
  groupId: SpatialId
  isFocused: boolean
  preferredChildFocusId?: SpatialId
}

export interface SpatialGroupProps extends NextFocusGroup {
  children: React.ReactNode | React.ReactNode[]
  hasTVPreferredFocus?: boolean
  id: SpatialId
  groupParentId: SpatialId | undefined
  groupChildIds: SpatialId[]
  preferredChildFocusIndex?: number
  preferredChildFocusId?: number
  shouldTrackChildren?: boolean
}

export interface SpatialGroupObject
  extends Omit<SpatialGroupProps, 'children' | 'hasTVPreferredFocus'> {
  lastChildFocusedId?: SpatialId
}

export interface SpatialObject {
  id: SpatialId
  groupId: SpatialId
  ref: SpatialRef
  layout?: SpatialLayoutObject
  nodehandle: number
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

export interface SpatialButtonProps extends Partial<NextFocusRestrictions> {
  activeOpacity?: number
  children: React.ReactNode | React.ReactNode[]
  hasTVPreferredFocus: boolean
  id: string | number
  onBlur?: () => void
  onFocus?: () => void
  onPress?: () => void
  style?: StyleProp<TouchableOpacityProps>
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
  onlyPrimaryTop: boolean
  onlyPrimaryRight: boolean
  onlyPrimaryDown: boolean
  onlyPrimaryLeft: boolean
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
