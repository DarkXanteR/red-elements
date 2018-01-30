import { SidebarTabInfo } from '../../../';

import {
  marked
} from '../../../../_libs'

import { read } from 'fs';
import { INode } from '../../../../_interfaces';

import {
  Context,
  $,
  Tabs,
  container,
  delegateTarget
} from '../_base'

@delegateTarget({
  container,
})
export class TabInfoRefresher extends Context {
  constructor(public sidebarTabInfo: SidebarTabInfo) {
    super()
  }

  refresh(node?: INode) {
    const {
      RED,
      rebind,
      sidebarTabInfo
    } = this

    const {
      sections,
      nodeSection,
      infoSection,
      expandedSections,
    } = sidebarTabInfo

    const {
      setInfoText
    } = rebind([
        'setInfoText'
      ], sidebarTabInfo)

    sections.show();

    $(nodeSection.contents).empty();
    $(infoSection.contents).empty();

    var table = $('<table class="node-info"></table>');
    var tableBody = $('<tbody>').appendTo(table);
    var propRow;
    var subflowNode;
    if (node.type === "tab") {

      nodeSection.title.html(RED._("sidebar.info.flow"));
      propRow = $('<tr class="node-info-node-row"><td>' + RED._("sidebar.info.tabName") + '</td><td></td></tr>').appendTo(tableBody);
      $(propRow.children()[1]).html('&nbsp;' + (node.label || ""))
      propRow = $('<tr class="node-info-node-row"><td>' + RED._("sidebar.info.id") + "</td><td></td></tr>").appendTo(tableBody);
      RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);
      propRow = $('<tr class="node-info-node-row"><td>' + RED._("sidebar.info.status") + '</td><td></td></tr>').appendTo(tableBody);
      $(propRow.children()[1]).html((!!!node.disabled) ? RED._("sidebar.info.enabled") : RED._("sidebar.info.disabled"))
    } else {

      nodeSection.title.html(RED._("sidebar.info.node"));

      if (node.type !== "subflow" && node.name) {
        $('<tr class="node-info-node-row"><td>' + RED._("common.label.name") + '</td><td>&nbsp;<span class="bidiAware" dir="' + RED.text.bidi.resolveBaseTextDir(node.name) + '">' + node.name + '</span></td></tr>').appendTo(tableBody);
      }
      $('<tr class="node-info-node-row"><td>' + RED._("sidebar.info.type") + "</td><td>&nbsp;" + node.type + "</td></tr>").appendTo(tableBody);
      propRow = $('<tr class="node-info-node-row"><td>' + RED._("sidebar.info.id") + "</td><td></td></tr>").appendTo(tableBody);
      RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);

      var m = /^subflow(:(.+))?$/.exec(node.type);

      if (!m && node.type != "subflow" && node.type != "comment") {
        if (node._def) {
          var count = 0;
          var defaults = node._def.defaults;
          for (var n in defaults) {
            if (n != "name" && defaults.hasOwnProperty(n)) {
              var val = node[n];
              var type = typeof val;
              count++;
              propRow = $('<tr class="node-info-property-row' + (expandedSections.property ? "" : " hide") + '"><td>' + n + "</td><td></td></tr>").appendTo(tableBody);
              if (defaults[n].type) {
                var configNode = RED.nodes.node(val);
                if (!configNode) {
                  RED.utils.createObjectElement(undefined).appendTo(propRow.children()[1]);
                } else {
                  var configLabel = RED.utils.getNodeLabel(configNode, val);
                  var container = propRow.children()[1];

                  var div = $('<span>', {
                    class: ""
                  }).appendTo(container);
                  var nodeDiv = $('<div>', {
                    class: "palette_node palette_node_small"
                  }).appendTo(div);
                  var colour = configNode._def.color;
                  var icon_url = RED.utils.getNodeIcon(configNode._def);
                  nodeDiv.css({
                    'backgroundColor': colour,
                    "cursor": "pointer"
                  });
                  var iconContainer = $('<div/>', {
                    class: "palette_icon_container"
                  }).appendTo(nodeDiv);
                  $('<div/>', {
                    class: "palette_icon",
                    style: "background-image: url(" + icon_url + ")"
                  }).appendTo(iconContainer);
                  var nodeContainer = $('<span></span>').css({
                    "verticalAlign": "top",
                    "marginLeft": "6px"
                  }).html(configLabel).appendTo(container);

                  nodeDiv.on('dblclick', function () {
                    RED.editor.editConfig("", configNode.type, configNode.id);
                  })

                }
              } else {
                RED.utils.createObjectElement(val).appendTo(propRow.children()[1]);
              }
            }
          }
          if (count > 0) {
            $('<tr class="node-info-property-expand blank"><td colspan="2"><a href="#" class=" node-info-property-header' + (expandedSections.property ? " expanded" : "") + '"><span class="node-info-property-show-more">' + RED._("sidebar.info.showMore") + '</span><span class="node-info-property-show-less">' + RED._("sidebar.info.showLess") + '</span> <i class="fa fa-caret-down"></i></a></td></tr>').appendTo(tableBody);
          }
        }
      }

      if (m) {
        if (m[2]) {
          subflowNode = RED.nodes.subflow(m[2]);
        } else {
          subflowNode = node;
        }

        $('<tr class="blank"><th colspan="2">' + RED._("sidebar.info.subflow") + '</th></tr>').appendTo(tableBody);

        var userCount = 0;
        var subflowType = "subflow:" + subflowNode.id;
        RED.nodes.eachNode(function (n) {
          if (n.type === subflowType) {
            userCount++;
          }
        });
        $('<tr class="node-info-subflow-row"><td>' + RED._("common.label.name") + '</td><td><span class="bidiAware" dir=\"' + RED.text.bidi.resolveBaseTextDir(subflowNode.name) + '">' + subflowNode.name + '</span></td></tr>').appendTo(tableBody);
        $('<tr class="node-info-subflow-row"><td>' + RED._("sidebar.info.instances") + "</td><td>" + userCount + '</td></tr>').appendTo(tableBody);
      }
    }
    $(table).appendTo(nodeSection.content);

    var infoText = "";

    if (!subflowNode && node.type !== "comment" && node.type !== "tab") {
      var helpText = $("script[data-help-name='" + node.type + "']").html() || "";
      infoText = helpText;
    } else if (node.type === "tab") {
      infoText = marked(node.info || "");
    }

    if (subflowNode) {
      infoText = infoText + marked(subflowNode.info || "");
    } else if (node._def && node._def.info) {
      var info = node._def.info;
      var textInfo = (typeof info === "function" ? info.call(node) : info);
      // TODO: help
      infoText = infoText + marked(textInfo);
    }
    if (infoText) {
      setInfoText(infoText);
    }


    $(".node-info-property-header").click(function (e) {
      e.preventDefault();
      expandedSections["property"] = !expandedSections["property"];
      $(this).toggleClass("expanded", expandedSections["property"]);
      $(".node-info-property-row").toggle(expandedSections["property"]);
    });
    return this
  }
}
