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
import {
  Tray
} from '../../../tray'

import marked from 'marked'

// TODO: alternatively, load from red-runtime/vendor/jsonata
import { jsonata } from './jsonata/formatter'
import * as ace from 'brace'

const { log } = console
import { Context } from '../../../context'
import { NodeEditorConfiguration } from './configuration';
import { NodeValidator } from './validator';

interface ITabSelect extends JQuery<HTMLElement> {
  i18n: Function
}

export class NodeEditor extends Context {
  public editStack: any[] = []
  public expressionTestCache = {}
  public editTrayWidthCache = {}
  public editing_node: any = null
  public editing_config_node: any = null
  subflowEditor: any

  protected configuration: NodeEditorConfiguration = new NodeEditorConfiguration(this)
  protected validator: NodeValidator = new NodeValidator(this)

  constructor() {
    super()
    this.configure()
  }

  configure() {
    this.configuration.configure()
    return this
  }

  getCredentialsURL(nodeType, nodeID) {
    const dashedType = nodeType.replace(/\s+/g, '-');
    return 'credentials/' + dashedType + "/" + nodeID;
  }

  /**
   * Called when the node's properties have changed.
   * Marks the node as dirty and needing a size check.
   * Removes any links to non-existant outputs.
   * @param node - the node that has been updated
   * @param outputMap - (optional) a map of old->new port numbers if wires should be moved
   * @returns {array} the links that were removed due to this update
   */
  updateNodeProperties(node, outputMap) {
    const {
      ctx
    } = this

    node.resize = true;
    node.dirty = true;
    var removedLinks = [];
    if (node.ports) {
      if (outputMap) {
        ctx.nodes.eachLink(function (l) {
          if (l.source === node && outputMap.hasOwnProperty(l.sourcePort)) {
            if (outputMap[l.sourcePort] === "-1") {
              removedLinks.push(l);
            } else {
              l.sourcePort = outputMap[l.sourcePort];
            }
          }
        });
      }
      if (node.outputs < node.ports.length) {
        while (node.outputs < node.ports.length) {
          node.ports.pop();
        }
        ctx.nodes.eachLink(function (l) {
          if (l.source === node && l.sourcePort >= node.outputs && removedLinks.indexOf(l) === -1) {
            removedLinks.push(l);
          }
        });
      } else if (node.outputs > node.ports.length) {
        while (node.outputs > node.ports.length) {
          node.ports.push(node.ports.length);
        }
      }
    }
    if (node.inputs === 0) {
      removedLinks.concat(ctx.nodes.filterLinks({
        target: node
      }));
    }
    for (var l = 0; l < removedLinks.length; l++) {
      ctx.nodes.removeLink(removedLinks[l]);
    }
    return removedLinks;
  }

  /**
   * Create a config-node select box for this property
   * @param node - the node being edited
   * @param property - the name of the field
   * @param type - the type of the config-node
   */
  prepareConfigNodeSelect(node, property, type, prefix) {
    const {
      ctx
    } = this

    const {
      updateConfigNodeSelect,
      showEditConfigNodeDialog,
    } = this.rebind([
        'updateConfigNodeSelect',
        'showEditConfigNodeDialog'
      ])

    this._validateStr(prefix, 'prefix', 'prepareConfigNodeSelect')
    this._validateStr(property, 'property', 'prepareConfigNodeSelect')

    var selector = "#" + prefix + "-" + property
    var input = $(selector);
    if (input.length === 0) {
      this.logWarning('prepareConfigNodeSelect: no such input found', {
        selector
      })
      return this;
    }
    var newWidth: string | number = input.width();
    var attrStyle = input.attr('style');
    var m;
    if ((m = /width\s*:\s*(\d+(%|[a-z]+))/i.exec(attrStyle)) !== null) {
      newWidth = m[1];
    } else {
      newWidth = "70%";
    }
    var outerWrap = $("<div></div>").css({
      display: 'inline-block',
      position: 'relative'
    });
    var selectWrap = $("<div></div>").css({
      position: 'absolute',
      left: 0,
      right: '40px'
    }).appendTo(outerWrap);
    var select = $('<select id="' + prefix + '-' + property + '"></select>').appendTo(selectWrap);

    outerWrap.width(newWidth).height(input.height());
    if (outerWrap.width() === 0) {
      outerWrap.width("70%");
    }
    input.replaceWith(outerWrap);
    // set the style attr directly - using width() on FF causes a value of 114%...
    select.attr('style', "width:100%");
    updateConfigNodeSelect(property, type, node[property], prefix);
    $('<a id="' + prefix + '-lookup-' + property + '" class="editor-button"><i class="fa fa-pencil"></i></a>')
      .css({
        position: 'absolute',
        right: 0,
        top: 0
      })
      .appendTo(outerWrap);
    $('#' + prefix + '-lookup-' + property).click(function (e) {
      showEditConfigNodeDialog(property, type, select.find(":selected").val(), prefix);
      e.preventDefault();
    });
    var label = "";
    var configNode = ctx.nodes.node(node[property]);
    var node_def = ctx.nodes.getType(type);

    if (configNode) {
      label = ctx.utils.getNodeLabel(configNode, configNode.id);
    }
    input.val(label);

    return this
  }

  /**
   * Create a config-node button for this property
   * @param node - the node being edited
   * @param property - the name of the field
   * @param type - the type of the config-node
   */
  prepareConfigNodeButton(node, property, type, prefix) {
    const {
      ctx,
    } = this

    const {
      showEditConfigNodeDialog
    } = this.rebind([
        'showEditConfigNodeDialog'
      ])

    this._validateStr(prefix, 'prefix', 'prepareConfigNodeButton')
    this._validateStr(property, 'property', 'prepareConfigNodeButton')

    var input = $("#" + prefix + "-" + property);
    var selector = "#" + prefix + "-" + property
    var input = $(selector);
    if (input.length === 0) {
      this.logWarning('prepareConfigNodeButton: no such input', {
        selector
      })
      return this;
    }

    input.val(node[property]);
    input.attr("type", "hidden");

    var button = $("<a>", {
      id: prefix + "-edit-" + property,
      class: "editor-button"
    });
    input.after(button);

    if (node[property]) {
      button.text(ctx._("editor.configEdit"));
    } else {
      button.text(ctx._("editor.configAdd"));
    }

    button.click(function (e) {
      showEditConfigNodeDialog(property, type, input.val() || "_ADD_", prefix);
      e.preventDefault();
    });
    return this
  }

  /**
   * Populate the editor dialog input field for this property
   * @param node - the node being edited
   * @param property - the name of the field
   * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
   * @param definition - the definition of the field
   */
  preparePropertyEditor(node, property, prefix, definition) {
    const {
      ctx
    } = this

    this._validateStr(prefix, 'prefix', 'preparePropertyEditor')
    this._validateStr(property, 'property', 'preparePropertyEditor')
    this._validateObj(definition, 'definition', 'preparePropertyEditor')

    var selector = "#" + prefix + "-" + property
    var input = $(selector);
    if (input.length === 0) {
      this.logWarning('preparePropertyEditor: no such element', {
        selector
      })
      return this;
    }
    if (input.attr('type') === "checkbox") {
      input.prop('checked', node[property]);
    } else {
      var val = node[property];
      if (val == null) {
        val = "";
      }
      if (definition !== undefined && definition[property].hasOwnProperty("format") && definition[property].format !== "" && input[0].nodeName === "DIV") {
        input.html(ctx.text.format.getHtml(val, definition[property].format, {}, false, "en"));
        ctx.text.format.attach(input[0], definition[property].format, {}, false, "en");
      } else {
        input.val(val);
        if (input[0].nodeName === 'INPUT' || input[0].nodeName === 'TEXTAREA') {
          ctx.text.bidi.prepareInput(input);
        }
      }
    }
    return this
  }

  /**
   * Add an on-change handler to revalidate a node field
   * @param node - the node being edited
   * @param definition - the definition of the node
   * @param property - the name of the field
   * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
   */
  attachPropertyChangeHandler(node, definition, property, prefix) {
    const {
      validateNodeEditor
    } = this.rebind([
        'validateNodeEditor'
      ])

    this._validateStr(prefix, 'prefix', 'attachPropertyChangeHandler')
    this._validateStr(property, 'property', 'attachPropertyChangeHandler')

    this._validateObj(definition, 'definition', 'attachPropertyChangeHandler')

    var input = $("#" + prefix + "-" + property);

    var selector = "#" + prefix + "-" + property
    var input = $(selector);
    if (input.length === 0) {
      this.logWarning('attachPropertyChangeHandler: no such input', {
        selector
      })
      return this;
    }

    if (definition !== undefined && "format" in definition[property] && definition[property].format !== "" && input[0].nodeName === "DIV") {
      $("#" + prefix + "-" + property).on('change keyup', function (event, skipValidation) {
        if (!skipValidation) {
          validateNodeEditor(node, prefix);
        }
      });
    } else {
      $("#" + prefix + "-" + property).change(function (event, skipValidation) {
        if (!skipValidation) {
          validateNodeEditor(node, prefix);
        }
      });
    }
    return this
  }

  /**
   * Assign the value to each credential field
   * @param node
   * @param credDef
   * @param credData
   * @param prefix
   */
  populateCredentialsInputs(node, credDef, credData, prefix) {
    this._validateStr(prefix, 'prefix', 'populateCredentialsInputs')

    for (let cred in credDef) {
      if (credDef.hasOwnProperty(cred)) {
        if (credDef[cred].type == 'password') {
          if (credData[cred]) {
            $('#' + prefix + '-' + cred).val(credData[cred]);
          } else if (credData['has_' + cred]) {
            $('#' + prefix + '-' + cred).val('__PWRD__');
          } else {
            $('#' + prefix + '-' + cred).val('');
          }
        } else {
          this.preparePropertyEditor(credData, cred, prefix, credDef);
        }
        this.attachPropertyChangeHandler(node, credDef, cred, prefix);
      }
    }
  }

  /**
   * Update the node credentials from the edit form
   * @param node - the node containing the credentials
   * @param credDefinition - definition of the credentials
   * @param prefix - prefix of the input fields
   * @return {boolean} whether anything has changed
   */
  updateNodeCredentials(node, credDefinition, prefix) {
    var changed = false;
    this._validateStr(prefix, 'prefix', 'updateNodeCredentials')

    if (!node.credentials) {
      node.credentials = {
        _: {}
      };
    }

    for (var cred in credDefinition) {
      if (credDefinition.hasOwnProperty(cred)) {
        var input = $("#" + prefix + '-' + cred);
        var value = input.val();
        if (credDefinition[cred].type == 'password') {
          node.credentials['has_' + cred] = (value !== "");
          if (value == '__PWRD__') {
            continue;
          }
          changed = true;

        }
        node.credentials[cred] = value;
        if (value != node.credentials._[cred]) {
          changed = true;
        }
      }
    }
    return changed;
  }

  /**
   * Prepare all of the editor dialog fields
   * @param node - the node being edited
   * @param definition - the node definition
   * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
   */
  prepareEditDialog(node, definition, prefix, done) {
    const {
      ctx
    } = this

    const {
      prepareConfigNodeButton,
      prepareConfigNodeSelect,
      preparePropertyEditor,
      attachPropertyChangeHandler,
      validateNodeEditor,
      populateCredentialsInputs,
      getCredentialsURL
    } = this.rebind([
        'prepareConfigNodeButton',
        'prepareConfigNodeSelect',
        'preparePropertyEditor',
        'attachPropertyChangeHandler',
        'validateNodeEditor',
        'populateCredentialsInputs',
        'getCredentialsURL'
      ])

    this._validateStr(prefix, 'prefix', 'prepareEditDialog')
    this._validateNodeDef(definition, 'definition', 'prepareEditDialog')

    for (var d in definition.defaults) {
      if (definition.defaults.hasOwnProperty(d)) {
        if (definition.defaults[d].type) {
          var configTypeDef = ctx.nodes.getType(definition.defaults[d].type);
          if (configTypeDef) {
            if (configTypeDef.exclusive) {
              prepareConfigNodeButton(node, d, definition.defaults[d].type, prefix);
            } else {
              prepareConfigNodeSelect(node, d, definition.defaults[d].type, prefix);
            }
          } else {
            log("Unknown type:", definition.defaults[d].type);
            preparePropertyEditor(node, d, prefix, definition.defaults);
          }
        } else {
          preparePropertyEditor(node, d, prefix, definition.defaults);
        }
        attachPropertyChangeHandler(node, definition.defaults, d, prefix);
      }
    }
    var completePrepare = function () {
      if (definition.oneditprepare) {
        try {
          definition.oneditprepare.call(node);
        } catch (err) {
          log("oneditprepare", node.id, node.type, err.toString());
        }
      }
      // Now invoke any change handlers added to the fields - passing true
      // to prevent full node validation from being triggered each time
      for (var d in definition.defaults) {
        if (definition.defaults.hasOwnProperty(d)) {
          $("#" + prefix + "-" + d).trigger("change", [true]);
        }
      }
      if (definition.credentials) {
        for (d in definition.credentials) {
          if (definition.credentials.hasOwnProperty(d)) {
            $("#" + prefix + "-" + d).trigger("change", [true]);
          }
        }
      }
      validateNodeEditor(node, prefix);
      if (done) {
        done(true);
      }
      return this
    }

    if (definition.credentials) {
      if (node.credentials) {
        populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
      } else {
        $.getJSON(getCredentialsURL(node.type, node.id), function (data) {
          node.credentials = data;
          node.credentials._ = $.extend(true, {}, data);
          populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
        });
      }
    }
    return completePrepare();
  }

  getEditStackTitle() {
    const {
      ctx,
      editStack
    } = this

    var title = '<ul class="editor-tray-breadcrumbs">';
    for (var i = 0; i < editStack.length; i++) {
      var node = editStack[i];
      this._validateNode(node, 'node', 'getEditStackTitle:iterate')

      var label = node.type;
      if (node.type === '_expression') {
        label = ctx._("expressionEditor.title");
      } else if (node.type === '_json') {
        label = ctx._("jsonEditor.title");
      } else if (node.type === '_buffer') {
        label = ctx._("bufferEditor.title");
      } else if (node.type === 'subflow') {
        label = ctx._("subflow.editSubflow", {
          name: node.name
        })
      } else if (node.type.indexOf("subflow:") === 0) {
        var subflow = ctx.nodes.subflow(node.type.substring(8));
        label = ctx._("subflow.editSubflow", {
          name: subflow.name
        })
      } else {
        if (typeof node._def.paletteLabel !== "undefined") {
          try {
            label = (typeof node._def.paletteLabel === "function" ? node._def.paletteLabel.call(node._def) : node._def.paletteLabel) || "";
          } catch (err) {
            log("Definition error: " + node.type + ".paletteLabel", err);
          }
        }
        if (i === editStack.length - 1) {
          if (ctx.nodes.node(node.id)) {
            label = ctx._("editor.editNode", {
              type: label
            });
          } else {
            label = ctx._("editor.addNewConfig", {
              type: label
            });
          }
        }
      }
      title += '<li>' + label + '</li>';
    }
    title += '</ul>';
    return title;
  }

  buildEditForm(container, formId, type, ns) {
    let form = $('<form id="' + formId + '" class="form-horizontal" autocomplete="off"></form>')
    this._validateJQ(container, 'container', 'buildEditForm')

    var dialogForm = form.appendTo(container);

    dialogForm.html($("script[data-template-name='" + type + "']").html());
    ns = ns || "node-red";
    let i18nFields = dialogForm.find('[data-i18n]')
    i18nFields.each(function () {
      var current = $(this).attr("data-i18n");
      var keys = current.split(";");
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.indexOf(":") === -1) {
          var prefix = "";
          if (key.indexOf("[") === 0) {
            var parts = key.split("]");
            prefix = parts[0] + "]";
            key = parts[1];
          }
          keys[i] = prefix + ns + ":" + key;
        }
      }
      $(this).attr("data-i18n", keys.join(";"));
    });
    // Add dummy fields to prevent 'Enter' submitting the form in some
    // cases, and also prevent browser auto-fill of password
    // Add in reverse order as they are prepended...
    $('<input type="password" style="display: none;" />').prependTo(dialogForm);
    $('<input type="text" style="display: none;" />').prependTo(dialogForm);
    dialogForm.submit(function (e) {
      e.preventDefault();
    });
    return dialogForm;
  }

  refreshLabelForm(container, node) {
    let {
      ctx,
    } = this

    const {
      buildLabelRow,
      updateNodeProperties
    } = this.rebind([
        'buildLabelRow',
        'updateNodeProperties'
      ])

    this._validateNode(node, 'node', 'refreshLabelForm')

    var inputPlaceholder = node._def.inputLabels ? ctx._("editor.defaultLabel") : ctx._("editor.noDefaultLabel");
    var outputPlaceholder = node._def.outputLabels ? ctx._("editor.defaultLabel") : ctx._("editor.noDefaultLabel");

    var inputsDiv = $("#node-label-form-inputs");
    var outputsDiv = $("#node-label-form-outputs");

    var inputCount = node.inputs || node._def.inputs || 0;
    var children = inputsDiv.children();
    var childCount = children.length;
    if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
      childCount--;
    }

    if (childCount < inputCount) {
      if (childCount === 0) {
        // remove the 'none' placeholder
        $(children[0]).remove();
      }
      for (i = childCount; i < inputCount; i++) {
        buildLabelRow("input", i, "", inputPlaceholder).appendTo(inputsDiv);
      }
    } else if (childCount > inputCount) {
      for (i = inputCount; i < childCount; i++) {
        $(children[i]).remove();
      }
      if (outputCount === 0) {
        buildLabelRow().appendTo(inputsDiv);
      }
    }

    var outputCount;
    var i;
    var formOutputs: any = $("#node-input-outputs").val();

    if (formOutputs === undefined) {
      outputCount = node.outputs || node._def.outputs || 0;
    } else if (isNaN(formOutputs)) {
      var outputMap = JSON.parse(formOutputs);
      var keys = Object.keys(outputMap);
      children = outputsDiv.children();
      childCount = children.length;
      if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
        childCount--;
      }

      outputCount = 0;
      var rows = [];
      keys.forEach(function (p) {
        var row = $("#node-label-form-output-" + p).parent();
        if (row.length === 0 && outputMap[p] !== -1) {
          if (childCount === 0) {
            $(children[0]).remove();
            childCount = -1;
          }
          row = buildLabelRow("output", p, "", outputPlaceholder);
        } else {
          row.detach();
        }
        if (outputMap[p] !== -1) {
          outputCount++;
          rows.push({
            i: parseInt(outputMap[p]),
            r: row
          });
        }
      });
      rows.sort(function (A, B) {
        return A.i - B.i;
      })
      rows.forEach(function (r, i) {
        r.r.find("label").html((i + 1) + ".");
        r.r.appendTo(outputsDiv);
      })
      if (rows.length === 0) {
        buildLabelRow("output", i, "").appendTo(outputsDiv);
      } else {

      }
    } else {
      outputCount = Math.max(0, parseInt(formOutputs));
    }
    children = outputsDiv.children();
    childCount = children.length;
    if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
      childCount--;
    }
    if (childCount < outputCount) {
      if (childCount === 0) {
        // remove the 'none' placeholder
        $(children[0]).remove();
      }
      for (i = childCount; i < outputCount; i++) {
        buildLabelRow("output", i, "").appendTo(outputsDiv);
      }
    } else if (childCount > outputCount) {
      for (i = outputCount; i < childCount; i++) {
        $(children[i]).remove();
      }
      if (outputCount === 0) {
        buildLabelRow().appendTo(outputsDiv);
      }
    }
    return this
  }

  buildLabelRow(type, index, value, placeHolder) {
    const {
      ctx
    } = this

    var result = $('<div>', {
      class: "node-label-form-row"
    });

    if (type === undefined) {
      $('<span>').html(ctx._("editor.noDefaultLabel")).appendTo(result);
      result.addClass("node-label-form-none");
    } else {
      this._validateStr(type, 'type', 'buildLabelRow')
      this._validateStrOrNum(index, 'index', 'buildLabelRow')

      result.addClass("");
      var id = "node-label-form-" + type + "-" + index;
      $('<label>', {
        for: id
      }).html((index + 1) + ".").appendTo(result);
      var input = $('<input>', {
        type: "text",
        id: id,
        placeholder: placeHolder
      }).val(value).appendTo(result);
      var clear = $('<button class="editor-button editor-button-small"><i class="fa fa-times"></i></button>').appendTo(result);
      clear.click(function (evt) {
        evt.preventDefault();
        input.val("");
      })
    }
    return result;
  }

  buildLabelForm(container, node) {
    const {
      ctx
    } = this

    const {
      buildLabelRow
    } = this.rebind([
        'buildLabelRow'
      ])

    var dialogForm = $('<form class="dialog-form form-horizontal" autocomplete="off"></form>').appendTo(container);

    this._validateJQ(container, 'container', 'buildLabelForm')
    this._validateNode(node, 'node', 'buildLabelForm')

    var inputCount = node.inputs || node._def.inputs || 0;
    var outputCount = node.outputs || node._def.outputs || 0;
    if (node.type === 'subflow') {
      inputCount = node.in.length;
      outputCount = node.out.length;
    }

    var inputLabels = node.inputLabels || [];
    var outputLabels = node.outputLabels || [];

    var inputPlaceholder = node._def.inputLabels ? ctx._("editor.defaultLabel") : ctx._("editor.noDefaultLabel");
    var outputPlaceholder = node._def.outputLabels ? ctx._("editor.defaultLabel") : ctx._("editor.noDefaultLabel");

    var i, row;
    $('<div class="form-row"><span data-i18n="editor.labelInputs"></span><div id="node-label-form-inputs"></div></div>').appendTo(dialogForm);
    var inputsDiv = $("#node-label-form-inputs");
    if (inputCount > 0) {
      for (i = 0; i < inputCount; i++) {
        buildLabelRow("input", i, inputLabels[i], inputPlaceholder).appendTo(inputsDiv);
      }
    } else {
      buildLabelRow().appendTo(inputsDiv);
    }
    $('<div class="form-row"><span data-i18n="editor.labelOutputs"></span><div id="node-label-form-outputs"></div></div>').appendTo(dialogForm);
    var outputsDiv = $("#node-label-form-outputs");
    if (outputCount > 0) {
      for (i = 0; i < outputCount; i++) {
        buildLabelRow("output", i, outputLabels[i], outputPlaceholder).appendTo(outputsDiv);
      }
    } else {
      buildLabelRow().appendTo(outputsDiv);
    }
  }

  showEditDialog(node) {
    let {
      ctx,
      editStack,
    } = this

    let {
      getEditStackTitle,
      updateNodeCredentials,
      updateNodeProperties,
      validateNode,
      editTrayWidthCache,
      refreshLabelForm,
      buildEditForm,
      buildLabelForm,
      prepareEditDialog,
    } = this.rebind([
        'getEditStackTitle',
        'updateNodeCredentials',
        'updateNodeProperties',
        'validateNode',
        'editTrayWidthCache',
        'refreshLabelForm',
        'buildEditForm',
        'buildLabelForm',
        'prepareEditDialog'
      ])

    var editing_node = node;
    editStack.push(node);
    ctx.view.state(ctx.state.EDITING);

    let type = node.type;
    this._validateStr(type, 'node.type', 'showEditDialog')

    if (type.substring(0, 8) === "subflow:") {
      type = "subflow";
    }
    var trayOptions = {
      width: null,
      title: getEditStackTitle(),
      buttons: [{
        id: "node-dialog-delete",
        class: 'leftButton',
        text: ctx._("common.label.delete"),
        click: () => {
          var startDirty = ctx.nodes.dirty();
          var removedNodes = [];
          var removedLinks = [];
          var removedEntities = ctx.nodes.remove(editing_node.id);
          removedNodes.push(editing_node);
          removedNodes = removedNodes.concat(removedEntities.nodes);
          removedLinks = removedLinks.concat(removedEntities.links);

          var historyEvent = {
            t: 'delete',
            nodes: removedNodes,
            links: removedLinks,
            changes: {},
            dirty: startDirty
          }

          ctx.nodes.dirty(true);
          ctx.view.redraw(true);
          ctx.history.push(historyEvent);
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-cancel",
        text: ctx._("common.label.cancel"),
        click: () => {
          if (editing_node._def) {
            if (editing_node._def.oneditcancel) {
              try {
                editing_node._def.oneditcancel.call(editing_node);
              } catch (err) {
                log("oneditcancel", editing_node.id, editing_node.type, err.toString());
              }
            }

            for (var d in editing_node._def.defaults) {
              if (editing_node._def.defaults.hasOwnProperty(d)) {
                var def = editing_node._def.defaults[d];
                if (def.type) {
                  var configTypeDef = ctx.nodes.getType(def.type);
                  if (configTypeDef && configTypeDef.exclusive) {
                    var input = $("#node-input-" + d).val() || "";
                    if (input !== "" && !editing_node[d]) {
                      // This node has an exclusive config node that
                      // has just been added. As the user is cancelling
                      // the edit, need to delete the just-added config
                      // node so that it doesn't get orphaned.
                      ctx.nodes.remove(input);
                    }
                  }
                }
              }

            }
          }
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        text: ctx._("common.label.done"),
        class: "primary",
        click: () => {
          var changes: any = {};
          var changed = false;
          var wasDirty = ctx.nodes.dirty();
          var d;
          var outputMap;

          if (editing_node._def.oneditsave) {
            var oldValues = {};
            for (d in editing_node._def.defaults) {
              if (editing_node._def.defaults.hasOwnProperty(d)) {
                if (typeof editing_node[d] === "string" || typeof editing_node[d] === "number") {
                  oldValues[d] = editing_node[d];
                } else {
                  oldValues[d] = $.extend(true, {}, {
                    v: editing_node[d]
                  }).v;
                }
              }
            }
            try {
              var rc = editing_node._def.oneditsave.call(editing_node);
              if (rc === true) {
                changed = true;
              }
            } catch (err) {
              log("oneditsave", editing_node.id, editing_node.type, err.toString());
            }

            for (d in editing_node._def.defaults) {
              if (editing_node._def.defaults.hasOwnProperty(d)) {
                if (oldValues[d] === null || typeof oldValues[d] === "string" || typeof oldValues[d] === "number") {
                  if (oldValues[d] !== editing_node[d]) {
                    changes[d] = oldValues[d];
                    changed = true;
                  }
                } else {
                  if (JSON.stringify(oldValues[d]) !== JSON.stringify(editing_node[d])) {
                    changes[d] = oldValues[d];
                    changed = true;
                  }
                }
              }
            }
          }

          var newValue;
          if (editing_node._def.defaults) {
            for (d in editing_node._def.defaults) {
              if (editing_node._def.defaults.hasOwnProperty(d)) {
                var input = $("#node-input-" + d);
                if (input.attr('type') === "checkbox") {
                  newValue = input.prop('checked');
                } else if ("format" in editing_node._def.defaults[d] && editing_node._def.defaults[d].format !== "" && input[0].nodeName === "DIV") {
                  newValue = input.text();
                } else {
                  newValue = input.val();
                }
                if (newValue != null) {
                  if (d === "outputs") {
                    if (newValue.trim() === "") {
                      continue;
                    }
                    if (isNaN(newValue)) {
                      outputMap = JSON.parse(newValue);
                      var outputCount = 0;
                      var outputsChanged = false;
                      var keys = Object.keys(outputMap);
                      keys.forEach((p: any) => {
                        if (isNaN(p)) {
                          // New output;
                          outputCount++;
                          delete outputMap[p];
                        } else {
                          outputMap[p] = outputMap[p] + "";
                          if (outputMap[p] !== "-1") {
                            outputCount++;
                            if (outputMap[p] !== p) {
                              // Output moved
                              outputsChanged = true;
                            } else {
                              delete outputMap[p];
                            }
                          } else {
                            // Output removed
                            outputsChanged = true;
                          }
                        }
                      });

                      newValue = outputCount;
                      if (outputsChanged) {
                        changed = true;
                      }
                    }
                  }
                  if (editing_node[d] != newValue) {
                    if (editing_node._def.defaults[d].type) {
                      if (newValue == "_ADD_") {
                        newValue = "";
                      }
                      // Change to a related config node
                      var configNode = ctx.nodes.node(editing_node[d]);
                      if (configNode) {
                        var users = configNode.users;
                        users.splice(users.indexOf(editing_node), 1);
                      }
                      configNode = ctx.nodes.node(newValue);
                      if (configNode) {
                        configNode.users.push(editing_node);
                      }
                    }
                    changes[d] = editing_node[d];
                    editing_node[d] = newValue;
                    changed = true;
                  }
                }
              }
            }
          }
          if (editing_node._def.credentials) {
            var prefix = 'node-input';
            var credDefinition = editing_node._def.credentials;
            var credsChanged = updateNodeCredentials(editing_node, credDefinition, prefix);
            changed = changed || credsChanged;
          }
          // if (editing_node.hasOwnProperty("_outputs")) {
          //     outputMap = editing_node._outputs;
          //     delete editing_node._outputs;
          //     if (Object.keys(outputMap).length > 0) {
          //         changed = true;
          //     }
          // }
          var removedLinks = updateNodeProperties(editing_node, outputMap);

          var inputLabels = $("#node-label-form-inputs").children().find("input");
          var outputLabels = $("#node-label-form-outputs").children().find("input");

          var hasNonBlankLabel = false;
          newValue = inputLabels.map(function () {
            var v = $(this).val();
            hasNonBlankLabel = hasNonBlankLabel || v !== "";
            return v;
          }).toArray().slice(0, editing_node.inputs);
          if ((editing_node.inputLabels === undefined && hasNonBlankLabel) ||
            (editing_node.inputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(editing_node.inputLabels))) {
            changes.inputLabels = editing_node.inputLabels;
            editing_node.inputLabels = newValue;
            changed = true;
          }
          hasNonBlankLabel = false;
          newValue = new Array(editing_node.outputs);
          outputLabels.each(function () {
            var index: any = $(this).attr('id').substring(23); // node-label-form-output-<index>
            if (outputMap && outputMap.hasOwnProperty(index)) {
              index = parseInt(outputMap[index]);
              if (index === -1) {
                return;
              }
            }
            var v = $(this).val();
            hasNonBlankLabel = hasNonBlankLabel || v !== "";
            newValue[index] = v;
          })

          if ((editing_node.outputLabels === undefined && hasNonBlankLabel) ||
            (editing_node.outputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(editing_node.outputLabels))) {
            changes.outputLabels = editing_node.outputLabels;
            editing_node.outputLabels = newValue;
            changed = true;
          }

          if (changed) {
            var wasChanged = editing_node.changed;
            editing_node.changed = true;
            ctx.nodes.dirty(true);

            var activeSubflow = ctx.nodes.subflow(ctx.workspaces.active());
            var subflowInstances = null;
            if (activeSubflow) {
              subflowInstances = [];
              ctx.nodes.eachNode(function (n) {
                if (n.type == "subflow:" + ctx.workspaces.active()) {
                  subflowInstances.push({
                    id: n.id,
                    changed: n.changed
                  });
                  n.changed = true;
                  n.dirty = true;
                  updateNodeProperties(n);
                }
              });
            }
            var historyEvent = {
              t: 'edit',
              node: editing_node,
              changes: changes,
              links: removedLinks,
              dirty: wasDirty,
              changed: wasChanged,
              outputMap: null,
              subflow: null
            };
            if (outputMap) {
              historyEvent.outputMap = outputMap;
            }
            if (subflowInstances) {
              historyEvent.subflow = {
                instances: subflowInstances
              }
            }
            ctx.history.push(historyEvent);
          }
          editing_node.dirty = true;
          validateNode(editing_node);
          ctx.events.emit("editor:save", editing_node);
          ctx.tray.close();
        }
      }
      ],
      missingDimensions: (dimensions?: any) => {
        // TODO
      },
      resize: (dimensions?: any) => {
        if (!dimensions) {
          dimensions = trayOptions.missingDimensions(dimensions)
        }

        editTrayWidthCache[type] = dimensions.width;
        $(".editor-tray-content").height(dimensions.height - 78);
        var form = $(".editor-tray-content form").height(dimensions.height - 78 - 40);
        if (editing_node && editing_node._def.oneditresize) {
          try {
            editing_node._def.oneditresize.call(editing_node, {
              width: form.width(),
              height: form.height()
            });
          } catch (err) {
            log("oneditresize", editing_node.id, editing_node.type, err.toString());
          }
        }
      },
      open: (tray, done) => {
        var trayFooter = tray.find(".editor-tray-footer");
        var trayBody = tray.find('.editor-tray-body');
        trayBody.parent().css('overflow', 'hidden');

        this._validateObj(ctx.stack, 'ctx.stack', 'showEditDialog trayOptions:open')

        var stack = ctx.stack.create({
          container: trayBody,
          singleExpanded: true
        });
        var nodeProperties = stack.add({
          title: ctx._("editor.nodeProperties"),
          expanded: true
        });
        nodeProperties.content.addClass("editor-tray-content");

        var portLabels = stack.add({
          title: ctx._("editor.portLabels"),
          onexpand: function () {
            refreshLabelForm(this.content, node);
          }
        });
        portLabels.content.addClass("editor-tray-content");

        if (editing_node) {
          ctx.sidebar.info.refresh(editing_node);
        }
        var ns;
        const { set } = node._def
        this._validateObj(set, 'node._def.set', 'showEditDialog trayOptions:open')

        if (!(set.module || set.id)) {
          this.handleError('showEditDialog trayOptions:open node._def.set must have a module or id property', {
            set
          })
        }

        if (set.module === "node-red") {
          ns = "node-red";
        } else {
          ns = set.id;
        }
        this._validateStr(ns, 'node._def.set', 'showEditDialog trayOptions:open')

        buildEditForm(nodeProperties.content, "dialog-form", type, ns);

        buildLabelForm(portLabels.content, node);

        prepareEditDialog(node, node._def, "node-input", function () {
          // TODO: i18n jQuery Widget must be instantiated
          // to have i18n factory function avail on all jQuery elements
          trayBody.i18n()
          done();
        });
      },
      close: () => {
        if (ctx.view.state() != ctx.state.IMPORT_DRAGGING) {
          ctx.view.state(ctx.state.DEFAULT);
        }
        if (editing_node) {
          ctx.sidebar.info.refresh(editing_node);
        }
        ctx.workspaces.refresh();
        ctx.view.redraw(true);
        editStack.pop();
      },
      show: () => {
        if (editing_node) {
          ctx.sidebar.info.refresh(editing_node);
        }
      }
    }
    if (editTrayWidthCache.hasOwnProperty(type)) {
      trayOptions.width = editTrayWidthCache[type];
    }

    if (type === 'subflow') {
      var id = editing_node.type.substring(8);
      trayOptions.buttons.unshift({
        id,
        class: 'leftButton',
        text: ctx._("subflow.edit"),
        click: () => {
          ctx.workspaces.show(id);
          $("#node-dialog-ok").click();
        }
      });
    }

    ctx.tray.show(trayOptions);
    return this
  }
  /**
   * name - name of the property that holds this config node
   * type - type of config node
   * id - id of config node to edit. _ADD_ for a new one
   * prefix - the input prefix of the parent property
   */
  showEditConfigNodeDialog(name, type, id, prefix) {
    const {
      ctx,
      editStack,
    } = this

    const {
      getEditStackTitle,
      buildEditForm,
      prepareEditDialog,
      validateNode,
      updateNodeCredentials,
      updateConfigNodeSelect
    } = this.rebind([
        'getEditStackTitle',
        'buildEditForm',
        'prepareEditDialog',
        'validateNode',
        'updateNodeCredentials',
        'updateConfigNodeSelect'
      ])

    this._validateStr(prefix, 'prefix', 'showEditConfigNodeDialog')

    var adding = (id == "_ADD_");
    var node_def = ctx.nodes.getType(type);
    var editing_config_node = ctx.nodes.node(id);

    this._validateNodeDef(node_def, 'node_def', 'showEditConfigNodeDialog')

    var ns;
    if (node_def.set.module === "node-red") {
      ns = "node-red";
    } else {
      ns = node_def.set.id;
    }
    var configNodeScope = ""; // default to global
    var activeSubflow = ctx.nodes.subflow(ctx.workspaces.active());
    if (activeSubflow) {
      configNodeScope = activeSubflow.id;
    }
    if (editing_config_node == null) {
      editing_config_node = {
        id: ctx.nodes.id(),
        _def: node_def,
        type: type,
        z: configNodeScope,
        users: []
      }
      for (var d in node_def.defaults) {
        if (node_def.defaults[d].value) {
          editing_config_node[d] = JSON.parse(JSON.stringify(node_def.defaults[d].value));
        }
      }
      editing_config_node["_"] = node_def._;
    }
    editStack.push(editing_config_node);

    ctx.view.state(ctx.state.EDITING);
    var trayOptions = {
      buttons: [],
      title: getEditStackTitle(), //(adding?ctx._("editor.addNewConfig", {type:type}):ctx._("editor.editConfig", {type:type})),
      resize: function () {
        if (editing_config_node && editing_config_node._def.oneditresize) {
          var form = $("#node-config-dialog-edit-form");
          try {
            editing_config_node._def.oneditresize.call(editing_config_node, {
              width: form.width(),
              height: form.height()
            });
          } catch (err) {
            log("oneditresize", editing_config_node.id, editing_config_node.type, err.toString());
          }
        }
      },
      open: function (tray, done) {
        var trayHeader = tray.find(".editor-tray-header");
        var trayFooter = tray.find(".editor-tray-footer");

        if (node_def.hasUsers !== false) {
          trayFooter.prepend('<div id="node-config-dialog-user-count"><i class="fa fa-info-circle"></i> <span></span></div>');
        }
        trayFooter.append('<span id="node-config-dialog-scope-container"><span id="node-config-dialog-scope-warning" data-i18n="[title]editor.errors.scopeChange"><i class="fa fa-warning"></i></span><select id="node-config-dialog-scope"></select></span>');

        var dialogForm = buildEditForm(tray.find('.editor-tray-body'), "node-config-dialog-edit-form", type, ns);

        prepareEditDialog(editing_config_node, node_def, "node-config-input", function () {
          if (editing_config_node._def.exclusive) {
            $("#node-config-dialog-scope").hide();
          } else {
            $("#node-config-dialog-scope").show();
          }
          $("#node-config-dialog-scope-warning").hide();

          var nodeUserFlows = {};
          editing_config_node.users.forEach(function (n) {
            nodeUserFlows[n.z] = true;
          });
          var flowCount = Object.keys(nodeUserFlows).length;
          var tabSelect = <ITabSelect>$("#node-config-dialog-scope").empty();
          tabSelect.off("change");
          tabSelect.append('<option value=""' + (!editing_config_node.z ? " selected" : "") + ' data-i18n="sidebar.config.global"></option>');
          tabSelect.append('<option disabled data-i18n="sidebar.config.flows"></option>');
          ctx.nodes.eachWorkspace(function (ws) {
            var workspaceLabel = ws.label;
            if (nodeUserFlows[ws.id]) {
              workspaceLabel = "* " + workspaceLabel;
            }
            tabSelect.append('<option value="' + ws.id + '"' + (ws.id == editing_config_node.z ? " selected" : "") + '>' + workspaceLabel + '</option>');
          });
          tabSelect.append('<option disabled data-i18n="sidebar.config.subflows"></option>');
          ctx.nodes.eachSubflow(function (ws) {
            var workspaceLabel = ws.name;
            if (nodeUserFlows[ws.id]) {
              workspaceLabel = "* " + workspaceLabel;
            }
            tabSelect.append('<option value="' + ws.id + '"' + (ws.id == editing_config_node.z ? " selected" : "") + '>' + workspaceLabel + '</option>');
          });
          if (flowCount > 0) {
            tabSelect.on('change', function () {
              var newScope: string = String($(this).val());
              if (newScope === '') {
                // global scope - everyone can use it
                $("#node-config-dialog-scope-warning").hide();
              } else if (!nodeUserFlows[parseInt(newScope)] || flowCount > 1) {
                // a user will loose access to it
                $("#node-config-dialog-scope-warning").show();
              } else {
                $("#node-config-dialog-scope-warning").hide();
              }
            });
          }

          tabSelect.i18n();
          dialogForm.i18n();

          if (node_def.hasUsers !== false) {
            $("#node-config-dialog-user-count").find("span").html(ctx._("editor.nodesUse", {
              count: editing_config_node.users.length
            })).parent().show();
          }
          done();
        });
      },
      close: function () {
        ctx.workspaces.refresh();
        editStack.pop();
      },
      show: function () {
        if (editing_config_node) {
          ctx.sidebar.info.refresh(editing_config_node);
        }
      }
    }
    trayOptions.buttons = [{
      id: "node-config-dialog-cancel",
      text: ctx._("common.label.cancel"),
      click: function () {
        var configType = type;
        var configId = editing_config_node.id;
        var configAdding = adding;
        var configTypeDef = ctx.nodes.getType(configType);

        if (configTypeDef.oneditcancel) {
          // TODO: what to pass as this to call
          if (configTypeDef.oneditcancel) {
            var cn = ctx.nodes.node(configId);
            if (cn) {
              try {
                configTypeDef.oneditcancel.call(cn, false);
              } catch (err) {
                log("oneditcancel", cn.id, cn.type, err.toString());
              }
            } else {
              try {
                configTypeDef.oneditcancel.call({
                  id: configId
                }, true);
              } catch (err) {
                log("oneditcancel", configId, configType, err.toString());
              }
            }
          }
        }
        ctx.tray.close();
      }
    },
    {
      id: "node-config-dialog-ok",
      text: adding ? ctx._("editor.configAdd") : ctx._("editor.configUpdate"),
      class: "primary",
      click: function () {
        var configProperty = name;
        var configId = editing_config_node.id;
        var configType = type;
        var configAdding = adding;
        var configTypeDef = ctx.nodes.getType(configType);
        var d;
        var input;
        var scope = $("#node-config-dialog-scope").val();

        if (configTypeDef.oneditsave) {
          try {
            configTypeDef.oneditsave.call(editing_config_node);
          } catch (err) {
            log("oneditsave", editing_config_node.id, editing_config_node.type, err.toString());
          }
        }

        for (d in configTypeDef.defaults) {
          if (configTypeDef.defaults.hasOwnProperty(d)) {
            var newValue;
            input = $("#node-config-input-" + d);
            if (input.attr('type') === "checkbox") {
              newValue = input.prop('checked');
            } else if ("format" in configTypeDef.defaults[d] && configTypeDef.defaults[d].format !== "" && input[0].nodeName === "DIV") {
              newValue = input.text();
            } else {
              newValue = input.val();
            }
            if (newValue != null && newValue !== editing_config_node[d]) {
              if (editing_config_node._def.defaults[d].type) {
                if (newValue == "_ADD_") {
                  newValue = "";
                }
                // Change to a related config node
                var configNode = ctx.nodes.node(editing_config_node[d]);
                if (configNode) {
                  var users = configNode.users;
                  users.splice(users.indexOf(editing_config_node), 1);
                }
                configNode = ctx.nodes.node(newValue);
                if (configNode) {
                  configNode.users.push(editing_config_node);
                }
              }
              editing_config_node[d] = newValue;
            }
          }
        }
        editing_config_node.label = configTypeDef.label;
        editing_config_node.z = scope;

        if (scope) {
          // Search for nodes that use this one that are no longer
          // in scope, so must be removed
          editing_config_node.users = editing_config_node.users.filter(function (n) {
            var keep = true;
            for (var d in n._def.defaults) {
              if (n._def.defaults.hasOwnProperty(d)) {
                if (n._def.defaults[d].type === editing_config_node.type &&
                  n[d] === editing_config_node.id &&
                  n.z !== scope) {
                  keep = false;
                  // Remove the reference to this node
                  // and revalidate
                  n[d] = null;
                  n.dirty = true;
                  n.changed = true;
                  validateNode(n);
                }
              }
            }
            return keep;
          });
        }

        if (configAdding) {
          ctx.nodes.add(editing_config_node);
        }

        if (configTypeDef.credentials) {
          updateNodeCredentials(editing_config_node, configTypeDef.credentials, "node-config-input");
        }
        validateNode(editing_config_node);
        var validatedNodes = {};
        validatedNodes[editing_config_node.id] = true;

        var userStack = editing_config_node.users.slice();
        while (userStack.length > 0) {
          var user = userStack.pop();
          if (!validatedNodes[user.id]) {
            validatedNodes[user.id] = true;
            if (user.users) {
              userStack = userStack.concat(user.users);
            }
            validateNode(user);
          }
        }
        ctx.nodes.dirty(true);
        ctx.view.redraw(true);
        if (!configAdding) {
          ctx.events.emit("editor:save", editing_config_node);
        }
        ctx.tray.close(function () {
          updateConfigNodeSelect(configProperty, configType, editing_config_node.id, prefix);
        });
      }
    }
    ];

    if (!adding) {
      trayOptions.buttons.unshift({
        class: 'leftButton',
        text: ctx._("editor.configDelete"), //'<i class="fa fa-trash"></i>',
        click: function () {
          var configProperty = name;
          var configId = editing_config_node.id;
          var configType = type;
          var configTypeDef = ctx.nodes.getType(configType);

          try {

            if (configTypeDef.ondelete) {
              // Deprecated: never documented but used by some early nodes
              log("Deprecated API warning: config node type ", configType, " has an ondelete function - should be oneditdelete");
              configTypeDef.ondelete.call(editing_config_node);
            }
            if (configTypeDef.oneditdelete) {
              configTypeDef.oneditdelete.call(editing_config_node);
            }
          } catch (err) {
            log("oneditdelete", editing_config_node.id, editing_config_node.type, err.toString());
          }

          var historyEvent = {
            t: 'delete',
            nodes: [editing_config_node],
            changes: {},
            dirty: ctx.nodes.dirty()
          }
          for (var i = 0; i < editing_config_node.users.length; i++) {
            var user = editing_config_node.users[i];
            historyEvent.changes[user.id] = {
              changed: user.changed,
              valid: user.valid
            };
            for (var d in user._def.defaults) {
              if (user._def.defaults.hasOwnProperty(d) && user[d] == configId) {
                historyEvent.changes[user.id][d] = configId
                user[d] = "";
                user.changed = true;
                user.dirty = true;
              }
            }
            validateNode(user);
          }
          ctx.nodes.remove(configId);
          ctx.nodes.dirty(true);
          ctx.view.redraw(true);
          ctx.history.push(historyEvent);
          ctx.tray.close(function () {
            updateConfigNodeSelect(configProperty, configType, "", prefix);
          });
        }
      });
    }

    ctx.tray.show(trayOptions);
    return this
  }

  defaultConfigNodeSort(A, B) {
    if (A.__label__ < B.__label__) {
      return -1;
    } else if (A.__label__ > B.__label__) {
      return 1;
    }
    return 0;
  }

  updateConfigNodeSelect(name, type, value, prefix) {
    const {
      ctx,
      defaultConfigNodeSort
    } = this
    // if prefix is null, there is no config select to update
    if (prefix) {
      var button = $("#" + prefix + "-edit-" + name);
      if (button.length) {
        if (value) {
          button.text(ctx._("editor.configEdit"));
        } else {
          button.text(ctx._("editor.configAdd"));
        }
        $("#" + prefix + "-" + name).val(value);
      } else {

        var select = $("#" + prefix + "-" + name);
        var node_def = ctx.nodes.getType(type);
        select.children().remove();

        var activeWorkspace = ctx.nodes.workspace(ctx.workspaces.active());
        if (!activeWorkspace) {
          activeWorkspace = ctx.nodes.subflow(ctx.workspaces.active());
        }

        var configNodes = [];

        ctx.nodes.eachConfig(function (config) {
          if (config.type == type && (!config.z || config.z === activeWorkspace.id)) {
            var label = ctx.utils.getNodeLabel(config, config.id);
            config.__label__ = label;
            configNodes.push(config);
          }
        });
        var configSortFn = defaultConfigNodeSort;
        if (typeof node_def.sort == "function") {
          configSortFn = node_def.sort;
        }
        try {
          configNodes.sort(configSortFn);
        } catch (err) {
          log("Definition error: " + node_def.type + ".sort", err);
        }

        configNodes.forEach(function (cn) {
          select.append('<option value="' + cn.id + '"' + (value == cn.id ? " selected" : "") + '>' + ctx.text.bidi.enforceTextDirectionWithUCC(cn.__label__) + '</option>');
          delete cn.__label__;
        });

        select.append('<option value="_ADD_"' + (value === "" ? " selected" : "") + '>' + ctx._("editor.addNewType", {
          type: type
        }) + '</option>');
        window.setTimeout(function () {
          select.change();
        }, 50);
      }
    }
    return this
  }

  showEditSubflowDialog(subflow) {
    let {
      ctx,
      editStack,
    } = this

    let {
      getEditStackTitle,
      buildEditForm,
      updateNodeProperties,
      buildLabelForm
    } = this.rebind([
        'getEditStackTitle',
        'buildEditForm',
        'updateNodeProperties',
        'buildLabelForm'
      ])


    var editing_node = subflow;

    this.validateArray(editStack, 'editStack', 'showEditSubflowDialog')

    editStack.push(subflow);
    ctx.view.state(ctx.state.EDITING);
    var subflowEditor;

    var title = getEditStackTitle()
    var trayOptions = {
      title,
      buttons: [{
        id: "node-dialog-cancel",
        text: ctx._("common.label.cancel"),
        click: function () {
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        class: "primary",
        text: ctx._("common.label.done"),
        click: function () {
          var i;
          var changes: any = {};
          var changed = false;
          var wasDirty = ctx.nodes.dirty();

          var newName = $("#subflow-input-name").val();

          if (newName != editing_node.name) {
            changes['name'] = editing_node.name;
            editing_node.name = newName;
            changed = true;
          }

          var newDescription = subflowEditor.getValue();

          if (newDescription != editing_node.info) {
            changes['info'] = editing_node.info;
            editing_node.info = newDescription;
            changed = true;
          }
          var inputLabels = $("#node-label-form-inputs").children().find("input");
          var outputLabels = $("#node-label-form-outputs").children().find("input");

          var newValue = inputLabels.map(function () {
            return $(this).val();
          }).toArray().slice(0, editing_node.inputs);
          if (JSON.stringify(newValue) !== JSON.stringify(editing_node.inputLabels)) {
            changes.inputLabels = editing_node.inputLabels;
            editing_node.inputLabels = newValue;
            changed = true;
          }
          newValue = outputLabels.map(function () {
            return $(this).val();
          }).toArray().slice(0, editing_node.outputs);
          if (JSON.stringify(newValue) !== JSON.stringify(editing_node.outputLabels)) {
            changes.outputLabels = editing_node.outputLabels;
            editing_node.outputLabels = newValue;
            changed = true;
          }

          ctx.palette.refresh();

          if (changed) {
            var subflowInstances = [];
            ctx.nodes.eachNode(function (n) {
              if (n.type == "subflow:" + editing_node.id) {
                subflowInstances.push({
                  id: n.id,
                  changed: n.changed
                })
                n.changed = true;
                n.dirty = true;
                updateNodeProperties(n);
              }
            });
            var wasChanged = editing_node.changed;
            editing_node.changed = true;
            ctx.nodes.dirty(true);
            var historyEvent = {
              t: 'edit',
              node: editing_node,
              changes: changes,
              dirty: wasDirty,
              changed: wasChanged,
              subflow: {
                instances: subflowInstances
              }
            };

            ctx.history.push(historyEvent);
          }
          editing_node.dirty = true;
          ctx.tray.close();
        }
      }
      ],
      resize: (dimensions) => {
        $(".editor-tray-content").height(dimensions.height - 78);
        var form = $(".editor-tray-content form").height(dimensions.height - 78 - 40);

        var rows = $("#dialog-form>div:not(.node-text-editor-row)");
        var editorRow = $("#dialog-form>div.node-text-editor-row");
        var height = $("#dialog-form").height();
        var rowCount = rows.length

        for (var i = 0; i < rowCount; i++) {
          height -= $(rows[i]).outerHeight(true);
        }
        height -= (parseInt($("#dialog-form").css("marginTop")) + parseInt($("#dialog-form").css("marginBottom")));
        $(".node-text-editor").css("height", height + "px");
        subflowEditor.resize();
      },
      open: function (tray) {
        var trayFooter = tray.find(".editor-tray-footer");
        var trayBody = tray.find('.editor-tray-body');
        trayBody.parent().css('overflow', 'hidden');

        var stack = ctx.stack.create({
          container: trayBody,
          singleExpanded: true
        });
        var nodeProperties = stack.add({
          title: ctx._("editor.nodeProperties"),
          expanded: true
        });
        nodeProperties.content.addClass("editor-tray-content");
        var portLabels = stack.add({
          title: ctx._("editor.portLabels")
        });
        portLabels.content.addClass("editor-tray-content");

        if (editing_node) {
          ctx.sidebar.info.refresh(editing_node);
        }
        var dialogForm = buildEditForm(nodeProperties.content, "dialog-form", "subflow-template");
        subflowEditor = ctx.editor.createEditor({
          id: 'subflow-input-info-editor',
          mode: 'ace/mode/markdown',
          value: ""
        });

        $("#subflow-input-name").val(subflow.name);
        ctx.text.bidi.prepareInput($("#subflow-input-name"));
        subflowEditor.getSession().setValue(subflow.info || "", -1);
        var userCount = 0;
        var subflowType = "subflow:" + editing_node.id;

        ctx.nodes.eachNode(function (n) {
          if (n.type === subflowType) {
            userCount++;
          }
        });
        $("#subflow-dialog-user-count").html(ctx._("subflow.subflowInstances", {
          count: userCount
        })).show();

        buildLabelForm(portLabels.content, subflow);
        trayBody.i18n();
      },
      close: function () {
        if (ctx.view.state() != ctx.state.IMPORT_DRAGGING) {
          ctx.view.state(ctx.state.DEFAULT);
        }
        ctx.sidebar.info.refresh(editing_node);
        ctx.workspaces.refresh();
        subflowEditor.destroy();
        editStack.pop();
        editing_node = null;
      },
      show: function () { }
    }
    ctx.tray.show(trayOptions);
    return this
  }

  editExpression(options) {
    const {
      ctx,
      editStack,
      editTrayWidthCache,
    } = this

    const {
      getEditStackTitle,
      buildEditForm,
      expressionTestCache
    } = this.rebind([
        'getEditStackTitle',
        'buildEditForm',
        'expressionTestCache'
      ])

    var expressionTestCacheId = "_";
    if (editStack.length > 0) {
      expressionTestCacheId = editStack[editStack.length - 1].id;
    }

    this._validateProps(options, ['value', 'complete'], 'editExpression')

    var value = options.value;
    var onComplete = options.complete;
    var type = "_expression"
    editStack.push({
      type: type
    });
    ctx.view.state(ctx.state.EDITING);
    var expressionEditor;
    var testDataEditor;
    var testResultEditor
    var panels;

    var trayOptions = {
      width: null,
      title: getEditStackTitle(),
      buttons: [{
        id: "node-dialog-cancel",
        text: ctx._("common.label.cancel"),
        click: function () {
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        text: ctx._("common.label.done"),
        class: "primary",
        click: function () {
          $("#node-input-expression-help").html("");
          onComplete(expressionEditor.getValue());
          ctx.tray.close();
        }
      }
      ],
      missingDimensions: (dimensions?: any) => {
        // TODO
      },
      resize: function (dimensions?: any) {
        if (!dimensions) {
          dimensions = trayOptions.missingDimensions(dimensions)
        }

        if (dimensions) {
          editTrayWidthCache[type] = dimensions.width;
        }
        var height = $("#dialog-form").height();
        if (panels) {
          panels.resize(height);
        }

      },
      open: function (tray) {
        var trayBody = tray.find('.editor-tray-body');
        trayBody.addClass("node-input-expression-editor")
        var dialogForm = buildEditForm(tray.find('.editor-tray-body'), 'dialog-form', '_expression', 'editor');
        var funcSelect = $("#node-input-expression-func");

        Object.keys(jsonata.functions).forEach(function (f) {
          funcSelect.append($("<option></option>").val(f).text(f));
        })

        funcSelect.change(function (e) {
          var f = $(this).val();
          var args = ctx._('jsonata:' + f + ".args", {
            defaultValue: ''
          });
          var title = "<h5>" + f + "(" + args + ")</h5>";
          var body = marked(ctx._('jsonata:' + f + '.desc', {
            defaultValue: ''
          }));
          $("#node-input-expression-help").html(title + "<p>" + body + "</p>");

        })
        expressionEditor = ctx.editor.createEditor({
          id: 'node-input-expression',
          value: "",
          mode: "ace/mode/jsonata",
          options: {
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true
          }
        });
        var currentToken = null;
        var currentTokenPos = -1;
        var currentFunctionMarker = null;

        expressionEditor.getSession().setValue(value || "", -1);
        expressionEditor.on("changeSelection", function () {
          var c = expressionEditor.getCursorPosition();
          var token = expressionEditor.getSession().getTokenAt(c.row, c.column);
          if (token !== currentToken || (token && /paren/.test(token.type) && c.column !== currentTokenPos)) {
            currentToken = token;
            var r, p;
            var scopedFunction = null;
            if (token && token.type === 'keyword') {
              r = c.row;
              scopedFunction = token;
            } else {
              var depth = 0;
              var next = false;
              if (token) {
                if (token.type === 'paren.rparen') {
                  // If this is a block of parens ')))', set
                  // depth to offset against the cursor position
                  // within the block
                  currentTokenPos = c.column;
                  depth = c.column - (token.start + token.value.length);
                }
                r = c.row;
                p = token.index;
              } else {
                r = c.row - 1;
                p = -1;
              }
              while (scopedFunction === null && r > -1) {
                var rowTokens = expressionEditor.getSession().getTokens(r);
                if (p === -1) {
                  p = rowTokens.length - 1;
                }
                while (p > -1) {
                  var type = rowTokens[p].type;
                  if (next) {
                    if (type === 'keyword') {
                      scopedFunction = rowTokens[p];
                      // log("HIT",scopedFunction);
                      break;
                    }
                    next = false;
                  }
                  if (type === 'paren.lparen') {
                    depth -= rowTokens[p].value.length;
                  } else if (type === 'paren.rparen') {
                    depth += rowTokens[p].value.length;
                  }
                  if (depth < 0) {
                    next = true;
                    depth = 0;
                  }
                  // log(r,p,depth,next,rowTokens[p]);
                  p--;
                }
                if (!scopedFunction) {
                  r--;
                }
              }
            }
            expressionEditor.session.removeMarker(currentFunctionMarker);
            if (scopedFunction) {
              //log(token,.map(function(t) { return t.type}));
              funcSelect.val(scopedFunction.value).change();
            }
          }
        });

        dialogForm.i18n();
        $("#node-input-expression-func-insert").click(function (e) {
          e.preventDefault();
          var pos = expressionEditor.getCursorPosition();
          var f = funcSelect.val();
          var snippet = jsonata.getFunctionSnippet(f);
          expressionEditor.insertSnippet(snippet);
          expressionEditor.focus();
        });
        $("#node-input-expression-reformat").click(function (evt) {
          evt.preventDefault();
          var v = expressionEditor.getValue() || "";
          try {
            v = jsonata.format(v);
          } catch (err) {
            // TODO: do an optimistic auto-format
          }
          expressionEditor.getSession().setValue(v || "", -1);
        });

        var tabs = ctx.tabs.create({
          element: $("#node-input-expression-tabs"),
          onchange: function (tab) {
            $(".node-input-expression-tab-content").hide();
            tab.content.show();
            trayOptions.resize();
          }
        })

        tabs.addTab({
          id: 'expression-help',
          label: 'Function reference',
          content: $("#node-input-expression-tab-help")
        });
        tabs.addTab({
          id: 'expression-tests',
          label: 'Test',
          content: $("#node-input-expression-tab-test")
        });
        testDataEditor = ctx.editor.createEditor({
          id: 'node-input-expression-test-data',
          value: expressionTestCache[expressionTestCacheId] || '{\n    "payload": "hello world"\n}',
          mode: "ace/mode/json",
          lineNumbers: false
        });
        var changeTimer;
        $(".node-input-expression-legacy").click(function (e) {
          e.preventDefault();
          ctx.sidebar.info.set(ctx._("expressionEditor.compatModeDesc"));
          ctx.sidebar.info.show();
        })
        var testExpression = function () {
          var value = testDataEditor.getValue();
          var parsedData;
          var currentExpression = expressionEditor.getValue();
          var expr;
          var usesContext = false;
          var legacyMode = /(^|[^a-zA-Z0-9_'"])msg([^a-zA-Z0-9_'"]|$)/.test(currentExpression);
          $(".node-input-expression-legacy").toggle(legacyMode);
          try {
            expr = jsonata(currentExpression);
            expr.assign('flowContext', function (val) {
              usesContext = true;
              return null;
            });
            expr.assign('globalContext', function (val) {
              usesContext = true;
              return null;
            });
          } catch (err) {
            testResultEditor.setValue(ctx._("expressionEditor.errors.invalid-expr", {
              message: err.message
            }), -1);
            return;
          }
          try {
            parsedData = JSON.parse(value);
          } catch (err) {
            testResultEditor.setValue(ctx._("expressionEditor.errors.invalid-msg", {
              message: err.toString()
            }))
            return;
          }

          try {
            var result = expr.evaluate(legacyMode ? {
              msg: parsedData
            } : parsedData);
            if (usesContext) {
              testResultEditor.setValue(ctx._("expressionEditor.errors.context-unsupported"), -1);
              return;
            }

            var formattedResult;
            if (result !== undefined) {
              formattedResult = JSON.stringify(result, null, 4);
            } else {
              formattedResult = ctx._("expressionEditor.noMatch");
            }
            testResultEditor.setValue(formattedResult, -1);
          } catch (err) {
            testResultEditor.setValue(ctx._("expressionEditor.errors.eval", {
              message: err.message
            }), -1);
          }
        }

        testDataEditor.getSession().on('change', function () {
          clearTimeout(changeTimer);
          changeTimer = setTimeout(testExpression, 200);
          expressionTestCache[expressionTestCacheId] = testDataEditor.getValue();
        });
        expressionEditor.getSession().on('change', function () {
          clearTimeout(changeTimer);
          changeTimer = setTimeout(testExpression, 200);
        });

        testResultEditor = ctx.editor.createEditor({
          id: 'node-input-expression-test-result',
          value: "",
          mode: "ace/mode/json",
          lineNumbers: false,
          readOnly: true
        });
        panels = ctx.panels.create({
          id: "node-input-expression-panels",
          resize: function (p1Height, p2Height) {
            var p1 = $("#node-input-expression-panel-expr");
            p1Height -= $(p1.children()[0]).outerHeight(true);
            var editorRow = $(p1.children()[1]);
            p1Height -= (parseInt(editorRow.css("marginTop")) + parseInt(editorRow.css("marginBottom")));
            $("#node-input-expression").css("height", (p1Height - 5) + "px");
            expressionEditor.resize();

            var p2 = $("#node-input-expression-panel-info > .form-row > div:first-child");
            p2Height -= p2.outerHeight(true) + 20;
            $(".node-input-expression-tab-content").height(p2Height);
            $("#node-input-expression-test-data").css("height", (p2Height - 5) + "px");
            testDataEditor.resize();
            $("#node-input-expression-test-result").css("height", (p2Height - 5) + "px");
            testResultEditor.resize();
          }
        });

        $("#node-input-example-reformat").click(function (evt) {
          evt.preventDefault();
          var v = testDataEditor.getValue() || "";
          try {
            v = JSON.stringify(JSON.parse(v), null, 4);
          } catch (err) {
            // TODO: do an optimistic auto-format
          }
          testDataEditor.getSession().setValue(v || "", -1);
        });

        testExpression();
      },
      close: function () {
        editStack.pop();
        expressionEditor.destroy();
        testDataEditor.destroy();
      },
      show: function () { }
    }

    if (editTrayWidthCache.hasOwnProperty(type)) {
      trayOptions.width = editTrayWidthCache[type];
    }
    ctx.tray.show(trayOptions);
    return this
  }


  editJSON(options) {
    const {
      ctx,
      editStack,
      editTrayWidthCache
    } = this

    const {
      getEditStackTitle,
      buildEditForm
    } = this.rebind([
        'getEditStackTitle',
        'buildEditForm'
      ])

    this._validateProps(options, ['value', 'complete'], 'editExpression')

    var value = options.value;
    var onComplete = options.complete;
    var type = "_json"
    editStack.push({
      type: type
    });
    ctx.view.state(ctx.state.EDITING);
    var expressionEditor;

    var trayOptions = {
      title: getEditStackTitle(),
      buttons: [{
        id: "node-dialog-cancel",
        text: ctx._("common.label.cancel"),
        click: function () {
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        text: ctx._("common.label.done"),
        class: "primary",
        click: function () {
          onComplete(expressionEditor.getValue());
          ctx.tray.close();
        }
      }
      ],
      resize: function (dimensions) {
        editTrayWidthCache[type] = dimensions.width;

        var rows = $("#dialog-form>div:not(.node-text-editor-row)");
        var editorRow = $("#dialog-form>div.node-text-editor-row");
        var height = $("#dialog-form").height();
        var rowCount = rows.length

        for (var i = 0; i < rowCount; i++) {
          height -= $(rows[i]).outerHeight(true);
        }
        height -= (parseInt($("#dialog-form").css("marginTop")) + parseInt($("#dialog-form").css("marginBottom")));
        $(".node-text-editor").css("height", height + "px");
        expressionEditor.resize();
      },
      open: function (tray) {
        var trayBody = tray.find('.editor-tray-body');
        var dialogForm = buildEditForm(tray.find('.editor-tray-body'), 'dialog-form', type, 'editor');
        expressionEditor = ctx.editor.createEditor({
          id: 'node-input-json',
          value: "",
          mode: "ace/mode/json"
        });
        expressionEditor.getSession().setValue(value || "", -1);
        $("#node-input-json-reformat").click(function (evt) {
          evt.preventDefault();
          var v = expressionEditor.getValue() || "";
          try {
            v = JSON.stringify(JSON.parse(v), null, 4);
          } catch (err) {
            // TODO: do an optimistic auto-format
          }
          expressionEditor.getSession().setValue(v || "", -1);
        });
        dialogForm.i18n();
      },
      close: function () {
        editStack.pop();
        expressionEditor.destroy();
      },
      show: function () { },
      width: null
    }
    if (editTrayWidthCache.hasOwnProperty(type)) {
      trayOptions.width = editTrayWidthCache[type];
    }
    ctx.tray.show(trayOptions);
    return this
  }

  stringToUTF8Array(str) {
    this._validateStr(str, 'str', 'stringToUTF8Array')
    var data = [];
    var i = 0,
      l = str.length;
    for (i = 0; i < l; i++) {
      var char = str.charCodeAt(i);
      if (char < 0x80) {
        data.push(char);
      } else if (char < 0x800) {
        data.push(0xc0 | (char >> 6));
        data.push(0x80 | (char & 0x3f));
      } else if (char < 0xd800 || char >= 0xe000) {
        data.push(0xe0 | (char >> 12));
        data.push(0x80 | ((char >> 6) & 0x3f));
        data.push(0x80 | (char & 0x3f));
      } else {
        i++;
        char = 0x10000 + (((char & 0x3ff) << 10) | (str.charAt(i) & 0x3ff));
        data.push(0xf0 | (char >> 18));
        data.push(0x80 | ((char >> 12) & 0x3f));
        data.push(0x80 | ((char >> 6) & 0x3f));
        data.push(0x80 | (char & 0x3f));
      }
    }
    return data;
  }

  editBuffer(options) {
    let {
      ctx,
      editStack,
      editTrayWidthCache,
    } = this

    const {
      buildEditForm,
      getEditStackTitle,
      stringToUTF8Array
    } = this.rebind([
        'buildEditForm',
        'getEditStackTitle',
        'stringToUTF8Array'
      ])

    this._validateProps(options, ['value', 'complete'], 'editExpression')

    var value = options.value;
    var onComplete = options.complete;
    var type = "_buffer"

    editStack.push({
      type: type
    });
    ctx.view.state(ctx.state.EDITING);
    var bufferStringEditor, bufferBinValue, bufferBinEditor;

    var panels;

    var trayOptions = {
      title: getEditStackTitle(),
      buttons: [{
        id: "node-dialog-cancel",
        text: ctx._("common.label.cancel"),
        click: function () {
          ctx.tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        text: ctx._("common.label.done"),
        class: "primary",
        click: function () {
          onComplete(JSON.stringify(bufferBinValue));
          ctx.tray.close();
        }
      }
      ],
      resize: function (dimensions) {
        if (dimensions) {
          editTrayWidthCache[type] = dimensions.width;
        }
        var height = $("#dialog-form").height();
        if (panels) {
          panels.resize(height);
        }
      },
      open: (tray) => {
        var trayBody = tray.find('.editor-tray-body');
        var dialogForm = buildEditForm(tray.find('.editor-tray-body'), 'dialog-form', type, 'editor');

        bufferStringEditor = ctx.editor.createEditor({
          id: 'node-input-buffer-str',
          value: "",
          mode: "ace/mode/text"
        });

        bufferStringEditor.getSession().setValue(value || "", -1);

        bufferBinEditor = ctx.editor.createEditor({
          id: 'node-input-buffer-bin',
          value: "",
          mode: "ace/mode/text",
          readOnly: true
        });

        var changeTimer;
        var buildBuffer = (data) => {
          if (!data) {
            this.handleError('editBuffer:trayOptions:buildBuffer(data) data is invalid', {
              data
            })
          }
          var valid = true;
          var isString = typeof data === 'string';
          var binBuffer = [];
          bufferBinValue = isString ? stringToUTF8Array(data) : data
          var i = 0,
            l = bufferBinValue.length;
          var c = 0;
          for (i = 0; i < l; i++) {
            var d = parseInt(bufferBinValue[i]);
            if (!isString && (isNaN(d) || d < 0 || d > 255)) {
              valid = false;
              break;
            }
            if (i > 0) {
              if (i % 8 === 0) {
                if (i % 16 === 0) {
                  binBuffer.push("\n");
                } else {
                  binBuffer.push("  ");
                }
              } else {
                binBuffer.push(" ");
              }
            }
            binBuffer.push((d < 16 ? "0" : "") + d.toString(16).toUpperCase());
          }
          if (valid) {
            $("#node-input-buffer-type-string").toggle(isString);
            $("#node-input-buffer-type-array").toggle(!isString);
            bufferBinEditor.setValue(binBuffer.join(""), 1);
          }
          return valid;
        }
        var bufferStringUpdate = function () {
          var value = bufferStringEditor.getValue();
          var isValidArray = false;
          if (/^[\s]*\[[\s\S]*\][\s]*$/.test(value)) {
            isValidArray = true;
            try {
              var data = JSON.parse(value);
              isValidArray = buildBuffer(data);
            } catch (err) {
              isValidArray = false;
            }
          }
          if (!isValidArray) {
            buildBuffer(value);
          }

        }
        bufferStringEditor.getSession().on('change', function () {
          clearTimeout(changeTimer);
          changeTimer = setTimeout(bufferStringUpdate, 200);
        });

        bufferStringUpdate();

        dialogForm.i18n();

        panels = ctx.panels.create({
          id: "node-input-buffer-panels",
          resize: function (p1Height, p2Height) {
            var p1 = $("#node-input-buffer-panel-str");
            p1Height -= $(p1.children()[0]).outerHeight(true);
            var editorRow = $(p1.children()[1]);
            p1Height -= (parseInt(editorRow.css("marginTop")) + parseInt(editorRow.css("marginBottom")));
            $("#node-input-buffer-str").css("height", (p1Height - 5) + "px");
            bufferStringEditor.resize();

            var p2 = $("#node-input-buffer-panel-bin");
            editorRow = $(p2.children()[0]);
            p2Height -= (parseInt(editorRow.css("marginTop")) + parseInt(editorRow.css("marginBottom")));
            $("#node-input-buffer-bin").css("height", (p2Height - 5) + "px");
            bufferBinEditor.resize();
          }
        });

        $(".node-input-buffer-type").click(function (e) {
          e.preventDefault();
          ctx.sidebar.info.set(ctx._("bufferEditor.modeDesc"));
          ctx.sidebar.info.show();
        })


      },
      close: function () {
        editStack.pop();
        bufferStringEditor.destroy();
        bufferBinEditor.destroy();
      },
      show: function () { },
      width: null
    }
    if (editTrayWidthCache.hasOwnProperty(type)) {
      trayOptions.width = editTrayWidthCache[type];
    }
    ctx.tray.show(trayOptions);
    return this
  }

  createEditor(options) {
    const { id } = options

    // validate that we provide ID option with name of ACE editor element
    this._validateStr(id, 'options.id', 'createEditor')

    // validate that an element with that ID exists on page
    let elem = $('#' + id)
    this._validateJQ(elem, 'ace.editor', 'createEditor', 'missing ace editor element on page')

    var editor = ace.edit(id);
    editor.setTheme("ace/theme/tomorrow");
    var session: any = editor.getSession();

    if (options.mode) {
      session.setMode(options.mode);
    }
    if (options.foldStyle) {
      session.setFoldStyle(options.foldStyle);
    } else {
      session.setFoldStyle('markbeginend');
    }
    if (options.options) {
      editor.setOptions(options.options);
    } else {
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true
      });
    }
    if (options.readOnly) {
      editor.setOption('readOnly', options.readOnly);
      editor.container.classList.add("ace_read-only");
    }
    if (options.hasOwnProperty('lineNumbers')) {
      const setOption = editor.renderer['setOption']
      if (!setOption) {
        this.handleError('createEditor: renderer missing method setOption', {
          renderer: editor.renderer
        })
      }

      setOption('showGutter', options.lineNumbers);
    }
    editor.$blockScrolling = Infinity;
    if (options.value) {
      // note: the ace editor needs to be linked
      // to an input field on the page where the editor session value
      // can be read from and written to

      // make sure value we are setting is a string (ie. some source code)
      this._validateStr(options.value, 'options.value', 'createEditor')

      session.setValue(options.value, -1);
    }
    if (options.globals) {
      setTimeout(function () {
        if (!!session.$worker) {
          session.$worker.send("setOptions", [{
            globals: options.globals,
            esversion: 6
          }]);
        }
      }, 100);
    }
    return editor;
  }
}