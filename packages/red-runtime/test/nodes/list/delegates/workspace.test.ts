import {
  Nodes,
} from '../../../..'

import {
  WorkspaceManager
} from '../../../../src/nodes/list/workspace-manager'

import {
  fakeNode
} from '../../../_infra'

import { expectObj } from '../../../_infra/helpers';

const $nodes = new Nodes()

function create() {
  return new WorkspaceManager($nodes)
}

let workspaceManager
beforeEach(() => {
  workspaceManager = create()
})

const { log } = console

const FAKE_RED = {}

test('WorkspaceManager: create', () => {
  expectObj(workspaceManager)
})

// TODO: more tests
