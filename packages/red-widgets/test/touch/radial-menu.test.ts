import {
  $,
  widgets,
  readPage
} from '../_infra'

const {
  RadialMenu
} = widgets

// Note: Used for mobile devices only.
// Extract from node-red project!

function create() {
  return new RadialMenu()
}

let menu
beforeEach(() => {
  menu = create()
})

test('RadialMenu: create', () => {
  expect(menu).toBeDefined()
})
