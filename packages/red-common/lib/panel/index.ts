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
import { Context, $ } from '../context';

import {
  IPanel
} from './interface'

export class Panel extends Context implements IPanel {
  protected children: any
  protected container: any
  protected panelRatio: any
  protected modifiedHeights: boolean = false
  protected startPosition: any
  protected panelHeights = []

  constructor(protected options) {
    super()

    let {
      container,
      children,
      panelRatio,
      modifiedHeights,
      startPosition,
      panelHeights
    } = this

    container = options.container || $("#" + options.id);
    children = container.children();

    if (children.length !== 2) {
      throw new Error("Container must have exactly two children");
    }

    container.addClass("red-ui-panels");

    // make into instance vars
    var separator: any = $('<div class="red-ui-panels-separator"></div>').insertAfter(children[0]);
    modifiedHeights = false;

    separator.draggable({
      axis: 'y',
      containment: container,
      scroll: false,
      start: function (event, ui) {
        var height = container.height();
        startPosition = ui.position.top;
        panelHeights = [$(children[0]).height(), $(children[1]).height()];
      },
      drag: function (event, ui) {
        var height = container.height();
        var delta = ui.position.top - startPosition;
        var newHeights = [panelHeights[0] + delta, panelHeights[1] - delta];
        $(children[0]).height(newHeights[0]);
        $(children[1]).height(newHeights[1]);
        if (options.resize) {
          options.resize(newHeights[0], newHeights[1]);
        }
        ui.position.top -= delta;
        panelRatio = newHeights[0] / height;
      },
      stop: function (event, ui) {
        return this.modifiedHeights = true;
      }
    });
  }

  resize(height: number) {
    const {
      children,
      container,
      panelRatio,
      options
    } = this

    var panelHeights = [$(children[0]).height(), $(children[1]).height()];
    container.height(height);
    if (this.modifiedHeights) {
      var topPanelHeight = panelRatio * height;
      var bottomPanelHeight = height - topPanelHeight - 48;
      panelHeights = [topPanelHeight, bottomPanelHeight];
      $(children[0]).height(panelHeights[0]);
      $(children[1]).height(panelHeights[1]);
    }
    if (options.resize) {
      options.resize(panelHeights[0], panelHeights[1]);
    }
  }
}
