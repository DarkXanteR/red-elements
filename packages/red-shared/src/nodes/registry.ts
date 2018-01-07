import {
  Context,
  $
} from '../context'

const { log } = console
export class NodesRegistry extends Context {
  public moduleList = {};
  public nodeList = [];
  public nodeSets = {};
  public typeToId = {};
  public nodeDefinitions = {};

  constructor() {
    super()

    this.nodeDefinitions['tab'] = {
      defaults: {
        label: {
          value: ""
        },
        disabled: {
          value: false
        },
        info: {
          value: ""
        }
      }
    };
  }

  setModulePendingUpdated(moduleId, version) {
    const {
      RED,
      moduleList
    } = this

    let $module = this.getModule(moduleId)
    $module.pending_version = version;
    RED.events.emit("registry:module-updated", {
      module: moduleId,
      version: version
    });
  }

  getModule(moduleId: string) {
    const {
      moduleList
    } = this

    this._validateStr(moduleId, 'moduleId', 'getModule')

    let $module = moduleList[moduleId]
    if (!$module) {
      this.handleError(`no such module registered: ${moduleId}`, {
        moduleId,
        module: $module
      })
      return this
    }

    return $module
  }

  getNodeSetForType(nodeType: string) {
    const {
      typeToId
    } = this

    this._validateStr(nodeType, 'nodeType', 'getNodeSetForType')

    const {
      getNodeSet,
    } = this.rebind([
        'getNodeSet'
      ])

    return getNodeSet(typeToId[nodeType]);
  }

  getModuleList() {
    return this.moduleList;
  }

  getNodeList() {
    return this.nodeList;
  }

  getNodeTypes() {
    return Object.keys(this.nodeDefinitions);
  }

  setNodeList(list) {
    let {
      nodeList,
      addNodeSet
    } = this.rebind([
        'addNodeSet'
      ])

    nodeList = [];
    for (var i = 0; i < list.length; i++) {
      var ns = list[i];
      addNodeSet(ns);
    }
  }

  addNodeSet(ns) {
    let {
      RED,
      moduleList,
      nodeSets,
      typeToId,
      nodeList
    } = this

    const id = ns.id
    ns.added = false;
    nodeSets[id] = ns;

    this._validateNodeSet(ns, 'ns', 'addNodeSet')

    log('addNodeSet: populate typeToId with type map for node set ids')
    for (var j = 0; j < ns.types.length; j++) {
      const type = ns.types[j]
      log({
        id,
        type,
        typeToId
      })
      typeToId[type] = ns.id;
    }

    nodeList.push(ns);
    log('pushed ns to nodeList', {
      typeToId,
      nodeList,
      ns
    })

    moduleList[ns.module] = moduleList[ns.module] || {
      name: ns.module,
      version: ns.version,
      local: ns.local,
      sets: {}
    };
    if (ns.pending_version) {
      moduleList[ns.module].pending_version = ns.pending_version;
    }
    moduleList[ns.module].sets[ns.name] = ns;
    RED.events.emit("registry:node-set-added", ns);

    this.setInstanceVars({
      typeToId,
      nodeList,
      moduleList
    })
    return this
  }

  removeNodeSet(id) {
    let {
      RED,
      nodeSets,
      typeToId,
      nodeList,
      moduleList
    } = this

    var ns = nodeSets[id];
    for (var j = 0; j < ns.types.length; j++) {
      delete typeToId[ns.types[j]];
    }
    delete nodeSets[id];
    for (var i = 0; i < this.nodeList.length; i++) {
      if (nodeList[i].id === id) {
        nodeList.splice(i, 1);
        break;
      }
    }
    delete moduleList[ns.module].sets[ns.name];
    if (Object.keys(moduleList[ns.module].sets).length === 0) {
      delete moduleList[ns.module];
    }
    RED.events.emit("registry:node-set-removed", ns);
    return ns;
  }

  getNodeSet(id) {
    const {
      nodeSets
    } = this
    return nodeSets[id];
  }

  enableNodeSet(id) {
    const {
      RED,
      nodeSets
    } = this

    var ns = nodeSets[id];
    ns.enabled = true;
    RED.events.emit("registry:node-set-enabled", ns);
  }

  disableNodeSet(id) {
    const {
      RED,
      nodeSets
    } = this

    var ns = nodeSets[id];
    ns.enabled = false;
    RED.events.emit("registry:node-set-disabled", ns);
  }

  registerNodeType(nt, def) {
    const {
      RED,
      typeToId
    } = this
    let {
      nodeSets,
      nodeDefinitions
    } = this

    this._validateObj(def, 'def', 'registerNodeType')

    nodeDefinitions = nodeDefinitions || {}
    nodeDefinitions[nt] = def;
    def.type = nt;
    if (def.category != "subflows") {
      const id = typeToId[nt]

      log({
        id,
        nt,
        typeToId,
        nodeSets,
      })

      let nodeSet = nodeSets[id]

      log({
        nodeSet
      })

      def.set = nodeSet
      this._validateObj(def.set, 'def.set', 'registerNodeType')

      if (nodeSet) {
        nodeSet.added = true;
        nodeSet.enabled = true;
      } else {
        this.logWarning(`no nodeSet found for: ${id}`, {
          id,
          nodeSets
        })
      }

      var ns;

      if (def.set.module === "node-red") {
        ns = "node-red";
      } else {
        ns = def.set.id;
      }

      this._validateStr(ns, 'ns', 'registerNodeType', {
        set: def.set
      })

      def["_"] = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var original = args[0];
        if (args[0].indexOf(":") === -1) {
          args[0] = ns + ":" + args[0];
        }
        var result = RED._.apply(null, args);
        if (result === args[0]) {
          result = original;
        }
        return result;
      }

      // TODO: too tightly coupled into palette UI
    }
    RED.events.emit("registry:node-type-added", nt);
    return this
  }

  removeNodeType(nt) {
    let {
      RED,
      nodeDefinitions
    } = this

    if (nt.substring(0, 8) != "subflow:") {
      // NON-NLS - internal debug message
      throw new Error(`this api is subflow only (ie. 'subflow:xyz'). called with: ${nt}`);
    }
    delete nodeDefinitions[nt];
    RED.events.emit("registry:node-type-removed", nt);
  }

  getNodeType(nt) {
    let {
      nodeDefinitions
    } = this
    return nodeDefinitions[nt];
  }
}
