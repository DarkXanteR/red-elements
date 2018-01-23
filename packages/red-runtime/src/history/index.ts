/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

import * as Stack from 'tiny-stack'

import {
  IEvent,
  Undo,
  IUndo,
} from './undo'

import {
  Context
} from '../context'
import { isNull } from 'util';

export {
  Undo,
  IUndo
}

export interface IHistory {
  list: any[]
  depth: number

  // TODO: this function is a placeholder
  // until there is a 'save' event that can be listened to
  markAllDirty()

  push(ev: IEvent)
  pop()
  peek()
  undo()
}

export class History extends Context implements IHistory {
  // SEE: https://github.com/avoidwork/tiny-stack/blob/master/src/constructor.js
  protected _stack = new Stack()
  protected _undo: IUndo = new Undo()

  constructor() {
    super()
  }

  //TODO: this function is a placeholder until there is a 'save' event that can be listened to
  markAllDirty() 
  {
    this.list.slice(0,0).map(ev => ev.dirty = true)
    return this
  }

  get list(): any[] {
    return this._stack.data || [] 
  }

  get depth(): number {
    return this._stack.length()
  }

  /**
   *
   * @param ev
   */
  push(ev: IEvent) {
    this._stack.push(ev);
    return this
  }

  /**
   * Pop top event from stack
   * Execute event
   * Return self for more chaining
   */
  undo() {
    const ev: IEvent = this._stack.pop();
    this._undo.undoEvent(ev)
    return this
  }

  /**
   * Pop top event from stack
   */
  pop() {
    return this._stack.pop();
  }

  /**
   * Peek at top event from stack
   */
  peek() {
    return this._stack.peek()
  }

  
}
