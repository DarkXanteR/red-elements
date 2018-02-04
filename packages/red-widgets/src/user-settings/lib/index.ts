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

const allSettings = {};

import {
  Context
} from '../../common'
import { UserSettingsConfiguration } from './configuration';

import {
  delegator,
  container,
  lazyInject,
  $TYPES
} from './container'
import { ISettings } from '../../../../red-runtime/src/settings/index';
import { IActions } from '../../actions/lib/index';

const TYPES = $TYPES.all

export interface IUserSettings {
  configure()
  setSelected(id, value)
  toggle(id)
  add: Function
  show(name: string)
}

@delegator({
  container,
  map: {
    configuration: UserSettingsConfiguration,
  }
})
export class UserSettings extends Context {
  allSettings: any;
  settingsVisible: any;
  trayWidth: any;
  panes: any;

  protected configuration: UserSettingsConfiguration // = new UserSettingsConfiguration(this)

  @lazyInject(TYPES.settings) $settings: ISettings
  @lazyInject(TYPES.actions) $actions: IActions


  constructor() {
    super()
    this.configure()
  }

  configure() {
    this.configuration.configure()
    return this
  }

  setSelected(id, value) {
    const {
      allSettings,
      $settings,
      $actions
    } = this
    var opt = allSettings[id];
    if (!opt) {
      this.handleError(`setSelected: No setting for ${id}`, {
        allSettings,
        id
      })
    }

    $settings.set(opt.setting, value);
    var callback = opt.onchange;
    if (typeof callback === 'string') {
      callback = $actions.get(callback);
    }
    if (typeof callback === 'function') {
      callback.call(opt, value);
    }
  }

  toggle(id) {
    const {
      $settings,
      allSettings
    } = this
    var opt = allSettings[id];
    if (!opt) {
      this.handleError(`toggle: No setting for ${id}`, {
        allSettings,
        id
      })
    }
    var state = $settings.get(opt.setting);
    this.setSelected(id, !state);
  }
}
