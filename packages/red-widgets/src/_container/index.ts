// holds all Inversify bindings for red-widget classes

import {
  Container
} from 'inversify'

const widgetContainer = new Container()

import getDecorators from 'inversify-inject-decorators';
const { lazyInject } = getDecorators(widgetContainer)

import {
  Deploy
} from '../'


import {
  runtimeContainer,
  TYPES as RUNTIME_TYPES
} from '@tecla5/red-runtime'

const WIDGET_TYPES = {
  canvas: 'ICanvas',
  clipboard: 'IClipboard',
  common: {
    checkboxSet: 'ICheckboxSet',
    editableList: 'IEditableList',
    menu: 'IMenu',
    // ...
  },
  deploy: 'IDeploy',
  keyboard: 'IKeyboard',
  library: 'ILibrary',
  main: 'IMain',
  nodeDiff: 'INodeDiff',
  nodeEditor: 'INodeEditor',
  notifications: 'INotifications',
  palette: 'IPalette',
  paletteEditor: 'IPaletteEditor',
  search: 'ISearch',
  tray: 'ITray',
  user: 'IUser',
  userSettings: 'IUserSettings',
  workspaces: 'IWorkspaces',
  // .. TODO: more const to type name bindings, one for each class to be bound
}

const $TYPES = {
  widgets: WIDGET_TYPES,
  runtime: RUNTIME_TYPES
}

// TODO: do all widget bindings to widget classes
widgetContainer.bind(WIDGET_TYPES.deploy).to(Deploy)

// merge container with runtime container here?
// see /docs on Service injection
// Container.merge(a: Container, b: Container)

const container = Container.merge(widgetContainer, runtimeContainer)

// might be easier to use
const containers = {
  widget: widgetContainer,
  runtime: runtimeContainer
}

// export both the app container (simply named container) from merge
// and the widget only container named widgetContainer
export {
  lazyInject,
  WIDGET_TYPES,
  $TYPES,
  containers,
  container,
  widgetContainer
}
