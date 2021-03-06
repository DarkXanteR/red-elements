import {
  Diff,
  Context,
  container,
  delegateTarget
} from './_base'

export interface IDiffGenerator {
  generateDiff(currentNodes, newNodes)
}

@delegateTarget()
export class DiffGenerator extends Context implements IDiffGenerator {
  constructor(public diff: Diff) {
    super()
  }

  generateDiff(currentNodes, newNodes) {
    const {
      rebind,
      diff
    } = this
    const {
      parseNodes
    } = rebind([
        'parseNodes'
      ], diff)

    var currentConfig = parseNodes(currentNodes);
    var newConfig = parseNodes(newNodes);
    var added = {};
    var deleted = {};
    var changed = {};
    var moved = {};

    Object.keys(currentConfig.all).forEach((id) => {
      var node = this.RED.nodes.workspace(id) || this.RED.nodes.subflow(id) || this.RED.nodes.node(id);
      if (!newConfig.all.hasOwnProperty(id)) {
        deleted[id] = true;
      } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
        changed[id] = true;

        if (currentConfig.all[id].z !== newConfig.all[id].z) {
          moved[id] = true;
        }
      }
    });
    Object.keys(newConfig.all).forEach((id) => {
      if (!currentConfig.all.hasOwnProperty(id)) {
        added[id] = true;
      }
    });

    return {
      currentConfig: currentConfig,
      newConfig: newConfig,
      added: added,
      deleted: deleted,
      changed: changed,
      moved: moved
    }
  }

}
