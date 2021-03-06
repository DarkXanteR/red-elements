import {
  readPage,
  ctx,
  RED,
  // controllers
} from '../../imports'

// const {
//     Validators
// } = controllers

import {
  Validators
} from '../../../controllers/utils'

function create(ctx) {
  return new Validators()
}

test('validators: create', () => {
  let v = create(ctx)
  expect(typeof v).toBe('object')
})

test('validators: number', () => {
  let v = create(ctx)
  let withBlanks = v.number(true)
  expect(withBlanks('2')).toBe(true)
  expect(withBlanks('5')).toBe(true)

  let noBlanks = v.number(false)
  expect(noBlanks('2')).toBe(true)
  expect(noBlanks('5')).toBe(true)
})

test('validators: regex', () => {
  let v = create(ctx)
  let exp = /\d+/
  let re = v.regex(exp)
  expect(re('2')).toBe(true)
  expect(re('5')).toBe(true)
})
test('validators: typedInput - number', () => {
  let v = create(ctx)
  let num = v.typedInput('num', false);
  var numTest = num(2);
  expect(numTest).toBe(true);
})

test('validators: typedInput - flow', () => {
  let v = create(ctx)
  let flow = v.typedInput('flow', false)
  var flowTest = flow('2');
  expect(flowTest).toBe(true)
})

test('validators: typedInput - json', () => {
  let v = create(ctx)
  let json = v.typedInput('json', false);
  const jsonVal = { 'value': 2 };
  var jsonTest = json(jsonVal);
  expect(jsonTest).toBe(true)
})
