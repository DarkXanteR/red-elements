import {
  NodeManager
} from '../../../../src/nodes/list/node-manager'

import {
  Nodes
} from '../../../..'

import {
  fakeNode
} from '../../../_infra'

function create() {
  const nodes = new Nodes()
  return new NodeManager(nodes)
}

let nodes
beforeEach(() => {
  nodes = create()
})

const { log } = console

const FAKE_RED = {}

test.only('Nodes: updateConfigNodeUsers', () => {
  let node = fakeNode({
    id: 'a',
    type: 'x',
    _def: {
      set: {},
      defaults: {
        custom: {
          // registry.getNodeType(property.type) must be able to find the node type
          type: 'age',
          category: 'config'
        }
      }
    }
  })

  // TODO: Fix and also add Type interface for it!?
  const ns = {
    id: 'basic',
    types: [{
      age: {}
    }],
    module: 'demo',
    version: 1,
    local: true,
    pending_version: 2
  }

  nodes.nodes.registry.addNodeSet(ns)

  // Note: the node type is looked up in the node sets registered in registry
  nodes.nodes.registry.registerNodeType('age', {
    category: 'config'
  })

  nodes.updateConfigNodeUsers(node)
  log({
    users: nodes.nodes.configNodes.users
  })
  
  // TODO: not sure this is correct approach. users might be keyed by ID?
  let user: any;
  if (nodes.nodes.configNodes.users.length) {
    user = nodes.nodes.configNodes.users[0];
  }
  else {
    user = {}
  }
  let expectedUser = {}
  expect(user).toEqual(expectedUser)
})