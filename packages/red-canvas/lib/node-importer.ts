import {
  Canvas,
  Context,
  container,
  delegateTarget,
  lazyInject,
  $TYPES,
} from './_base'

import {
  INodes,
  IWorkspaces,
  ISubflow,
  IKeyboard,
  IState,
  IHistory
} from '../../_interfaces'

const TYPES = $TYPES.all

export interface ICanvasNodeImporter {
  importNodes(newNodesStr, addNewFlow?, touchImport?)
}

@delegateTarget()
export class CanvasNodeImporter extends Context implements ICanvasNodeImporter {

  @lazyInject(TYPES.nodes) $nodes: INodes
  @lazyInject(TYPES.workspaces) $workspaces: IWorkspaces
  @lazyInject(TYPES.history) $history: IHistory
  @lazyInject(TYPES.subflow) $subflow: ISubflow
  @lazyInject(TYPES.keyboard) $keyboard: IKeyboard
  @lazyInject(TYPES.state) $state: IState

  constructor(protected canvas: Canvas) {
    super()
  }

  /**
   * Imports a new collection of nodes from a JSON String.
   *  - all get new IDs assigned
   *  - all 'selected'
   *  - attached to mouse for placing - 'IMPORT_DRAGGING'
   */
  importNodes(newNodesStr, addNewFlow?, touchImport?) {
    const {
      // RED,
      canvas,
      rebind,

      $nodes,
      $workspaces,
      $history,
      $subflow,
      $keyboard,
      $state
    } = this
    const {
      activeSubflow,
      node_width,
      node_height
    } = canvas
    let {
      mouse_position,
      mouse_mode,
      spliceActive,
      moving_set,
    } = canvas
    const {
      clearSelection,
      updateActiveNodes,
      redraw,
    } = rebind([
        'clearSelection',
        'updateActiveNodes',
        'redraw',
      ])

    try {
      var activeSubflowChanged;
      if (activeSubflow) {
        activeSubflowChanged = activeSubflow.changed;
      }
      var result = $nodes.import(newNodesStr, true, addNewFlow);
      if (result) {
        var new_nodes = result[0];
        var new_links = result[1];
        var new_workspaces = result[2];
        var new_subflows = result[3];
        var new_default_workspace = result[4];
        if (addNewFlow && new_default_workspace) {
          $workspaces.show(new_default_workspace.id);
        }
        var new_ms = new_nodes.filter(function (n) {
          return n.hasOwnProperty('x') && n.hasOwnProperty('y') && n.z == $workspaces.active
        }).map(function (n) {
          return {
            n: n
          };
        });
        var new_node_ids = new_nodes.map(function (n) {
          return n.id;
        });

        // TODO: pick a more sensible root node
        if (new_ms.length > 0) {
          var root_node = new_ms[0].n;
          var dx = root_node.x;
          var dy = root_node.y;

          if (mouse_position == null) {
            mouse_position = [0, 0];
          }

          var minX = 0;
          var minY = 0;
          var i;
          var node;

          for (i = 0; i < new_ms.length; i++) {
            node = new_ms[i];
            node.n.selected = true;
            node.n.changed = true;
            node.n.moved = true;
            node.n.x -= dx - mouse_position[0];
            node.n.y -= dy - mouse_position[1];
            node.dx = node.n.x - mouse_position[0];
            node.dy = node.n.y - mouse_position[1];
            minX = Math.min(node.n.x - node_width / 2 - 5, minX);
            minY = Math.min(node.n.y - node_height / 2 - 5, minY);
          }
          for (i = 0; i < new_ms.length; i++) {
            node = new_ms[i];
            node.n.x -= minX;
            node.n.y -= minY;
            node.dx -= minX;
            node.dy -= minY;
            if (node.n._def.onadd) {
              try {
                node.n._def.onadd.call(node.n);
              } catch (err) {
                console.log('Definition error: ' + node.n.type + '.onadd:', err);
              }
            }

          }
          if (!touchImport) {
            mouse_mode = $state.IMPORT_DRAGGING;
            spliceActive = false;
            if (new_ms.length === 1) {
              node = new_ms[0];
              spliceActive = node.n.hasOwnProperty('_def') &&
                node.n._def.inputs > 0 &&
                node.n._def.outputs > 0;
            }
          }
          $keyboard.add('*', 'escape', function () {
            $keyboard.remove('escape');
            clearSelection();
            $history.pop();
            mouse_mode = 0;
          });
          clearSelection();
          moving_set = new_ms;
        }

        var historyEvent: any = {
          t: 'add',
          nodes: new_node_ids,
          links: new_links,
          workspaces: new_workspaces,
          subflows: new_subflows,
          dirty: nodes.dirty()
        };
        if (new_ms.length === 0) {
          $nodes.dirty(true);
        }
        if (activeSubflow) {
          var subflowRefresh = $subflow.refresh(true);
          if (subflowRefresh) {
            historyEvent.subflow = {
              id: activeSubflow.id,
              changed: activeSubflowChanged,
              instances: subflowRefresh.instances
            }
          }
        }
        $history.push(historyEvent);

        updateActiveNodes();
        redraw();
      }
    } catch (error) {
      // if (error.code != 'NODE_RED') {
      //   console.log(error.stack);
      //   RED.notify(RED._('notification.error', {
      //     message: error.toString()
      //   }), 'error');
      // } else {
      //   RED.notify(RED._('notification.error', {
      //     message: error.message
      //   }), 'error');
      // }
    }
    return this
  }
}
