import {
  Registry
} from '../../../..'
import { expectObj } from '../../../_infra/helpers';

function create() {
  return new Registry()
}

let registry
beforeEach(() => {
  registry = create()
})

test('Registry: create', () => {
  expectObj(registry)
})
