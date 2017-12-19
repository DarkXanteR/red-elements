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

var exclusion = ['config', 'unknown', 'deprecated'];
var coreCategories = ['subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'];

import {
  default as marked
} from 'marked'

import * as d3 from 'd3'

interface IChartSVG extends HTMLElement {
  getIntersectionList: Function
  createSVGRect: Function
}

export {
  PaletteEditor
} from './editor'

import { IRED, TYPES, lazyInject, Context, $ } from '../../common'

export class Palette extends Context {
  public categoryContainers: Object

  @lazyInject(TYPES.RED) RED: IRED;

  constructor() {
    super()
    this.categoryContainers = {};
    const RED = this.RED

    const {
      addNodeType,
      removeNodeType,
      showNodeType,
      hideNodeType,
      filterChange,
      categoryContainers
    } = this.rebind([
        'addNodeType',
        'removeNodeType',
        'showNodeType',
        'hideNodeType',
        'filterChange',
        'categoryContainers'
      ])

    RED.events.on('registry:node-type-added', function (nodeType) {
      var def = RED.nodes.getType(nodeType);
      addNodeType(nodeType, def);
      if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
        def.onpaletteadd.call(def);
      }
    });
    RED.events.on('registry:node-type-removed', function (nodeType) {
      removeNodeType(nodeType);
    });

    RED.events.on('registry:node-set-enabled', function (nodeSet) {
      for (var j = 0; j < nodeSet.types.length; j++) {
        showNodeType(nodeSet.types[j]);
        var def = RED.nodes.getType(nodeSet.types[j]);
        if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
          def.onpaletteadd.call(def);
        }
      }
    });
    RED.events.on('registry:node-set-disabled', function (nodeSet) {
      for (var j = 0; j < nodeSet.types.length; j++) {
        hideNodeType(nodeSet.types[j]);
        var def = RED.nodes.getType(nodeSet.types[j]);
        if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
          def.onpaletteremove.call(def);
        }
      }
    });
    RED.events.on('registry:node-set-removed', function (nodeSet) {
      if (nodeSet.added) {
        for (var j = 0; j < nodeSet.types.length; j++) {
          removeNodeType(nodeSet.types[j]);
          var def = RED.nodes.getType(nodeSet.types[j]);
          if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
            def.onpaletteremove.call(def);
          }
        }
      }
    });


    $("#palette > .palette-spinner").show();

    // create searchBox widget
    const widget = $("#palette-search input")
    widget['searchBox']({
      delay: 100,
      change: function () {
        filterChange($(this).val());
      }
    })

    var categoryList = coreCategories;
    if (RED.settings.paletteCategories) {
      categoryList = RED.settings.paletteCategories;
    } else if (RED.settings.theme('palette.categories')) {
      categoryList = RED.settings.theme('palette.categories');
    }
    if (!Array.isArray(categoryList)) {
      categoryList = coreCategories
    }
    categoryList.forEach((category) => {
      this.createCategoryContainer(category, RED._("palette.label." + category, {
        defaultValue: category
      }));
    });

    $("#palette-collapse-all").on("click", function (e) {
      e.preventDefault();
      for (var cat in categoryContainers) {
        if (categoryContainers.hasOwnProperty(cat)) {
          categoryContainers[cat].close();
        }
      }
    });
    $("#palette-expand-all").on("click", function (e) {
      e.preventDefault();
      for (var cat in categoryContainers) {
        if (categoryContainers.hasOwnProperty(cat)) {
          categoryContainers[cat].open();
        }
      }
    });
  }


  createCategoryContainer(category, label) {
    const {
      categoryContainers
    } = this
    let labelOrCat = label || category
    if (!labelOrCat) {
      this.handleError('createCategoryContainer: Must take a category and an optional label', {
        label,
        category
      })
    }

    // replace underscores with spaces
    label = labelOrCat.replace(/_/g, " ");

    const container = $('#palette-container')
    if (!container) {
      this.handleError('Page must have a #palette-container element to attach palette to')
    }

    // append palette to #palette-container
    var catDiv = $('<div id="palette-container-' + category + '" class="palette-category palette-close hide">' +
      '<div id="palette-header-' + category + '" class="palette-header"><i class="expanded fa fa-angle-down"></i><span>' + label + '</span></div>' +
      '<div class="palette-content" id="palette-base-category-' + category + '">' +
      '<div id="palette-' + category + '-input"></div>' +
      '<div id="palette-' + category + '-output"></div>' +
      '<div id="palette-' + category + '-function"></div>' +
      '</div>' +
      '</div>').appendTo(container);

    categoryContainers[category] = {
      container: catDiv,
      close: () => {
        catDiv.removeClass("palette-open");
        catDiv.addClass("palette-closed");
        $("#palette-base-category-" + category).slideUp();
        $("#palette-header-" + category + " i").removeClass("expanded");
      },
      open: () => {
        catDiv.addClass("palette-open");
        catDiv.removeClass("palette-closed");
        $("#palette-base-category-" + category).slideDown();
        $("#palette-header-" + category + " i").addClass("expanded");
      },
      toggle: () => {
        if (catDiv.hasClass("palette-open")) {
          categoryContainers[category].close();
        } else {
          categoryContainers[category].open();
        }
      }
    };

    $("#palette-header-" + category).on('click', function (e) {
      categoryContainers[category].toggle();
    })
    return this
  }

  setLabel(type, el, label, info) {
    const {
      RED
    } = this

    var nodeWidth = 82;
    var nodeHeight = 25;
    var lineHeight = 20;
    var portHeight = 10;

    var words = label.split(/[ -]/);

    var displayLines = [];

    var currentLine = words[0];
    var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

    for (var i = 1; i < words.length; i++) {
      var newWidth = RED.view.calculateTextWidth(currentLine + " " + words[i], "palette_label", 0);
      if (newWidth < nodeWidth) {
        currentLine += " " + words[i];
        currentLineWidth = newWidth;
      } else {
        displayLines.push(currentLine);
        currentLine = words[i];
        currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
      }
    }
    displayLines.push(currentLine);

    var lines = displayLines.join("<br/>");
    var multiLineNodeHeight = 8 + (lineHeight * displayLines.length);
    el.css({
      height: multiLineNodeHeight + "px"
    });

    var labelElement = el.find(".palette_label");
    labelElement.html(lines).attr('dir', RED.text.bidi.resolveBaseTextDir(lines));

    el.find(".palette_port").css({
      top: (multiLineNodeHeight / 2 - 5) + "px"
    });

    var popOverContent;
    try {
      var l = "<p><b>" + RED.text.bidi.enforceTextDirectionWithUCC(label) + "</b></p>";
      if (label != type) {
        l = "<p><b>" + RED.text.bidi.enforceTextDirectionWithUCC(label) + "</b><br/><i>" + type + "</i></p>";
      }
      popOverContent = $(l + (info ? info : $("script[data-help-name='" + type + "']").html() || "<p>" + RED._("palette.noInfo") + "</p>").trim())
        .filter(function (n) {
          return (this.nodeType == 1 && this.nodeName == "P") || (this.nodeType == 3 && this.textContent.trim().length > 0)
        }).slice(0, 2);
    } catch (err) {
      // Malformed HTML may cause errors. TODO: need to understand what can break
      // NON-NLS: internal debug
      console.log("Error generating pop-over label for ", type);
      console.log(err.toString());
      popOverContent = "<p><b>" + label + "</b></p><p>" + RED._("palette.noInfo") + "</p>";
    }

    // const popover = el.data('popover')
    // if (!popover) {
    //   this.handleError('setLabel: element el missing a data-popover property')
    // }

    el.data('popover', popOverContent)
    // popover.setContent(popOverContent);
    return this
  }

  marked(content) {
    return marked(content)
  }

  escapeNodeType(nt) {
    return nt.replace(" ", "_").replace(".", "_").replace(":", "_");
  }

  addNodeType(nt, def) {
    const {
      RED,
      categoryContainers,
      marked
    } = this

    let {
      escapeNodeType,
      createCategoryContainer
    } = this.rebind([
        'escapeNodeType',
        'createCategoryContainer'
      ])

    var nodeTypeId = escapeNodeType(nt);
    if ($("#palette_node_" + nodeTypeId).length) {
      return;
    }
    if (exclusion.indexOf(def.category) === -1) {

      var category = def.category.replace(/ /g, "_");
      var rootCategory = category.split("-")[0];

      var d = document.createElement("div");
      d.id = "palette_node_" + nodeTypeId;
      d['type'] = nt;

      var label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
      if (typeof def.paletteLabel !== "undefined") {
        try {
          label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel) || "";
        } catch (err) {
          console.log("Definition error: " + nt + ".paletteLabel", err);
        }
      }

      $('<div/>', {
        class: "palette_label" + (def.align == "right" ? " palette_label_right" : "")
      }).appendTo(d);

      d.className = "palette_node";


      if (def.icon) {
        var icon_url = RED.utils.getNodeIcon(def);
        var iconContainer = $('<div/>', {
          class: "palette_icon_container" + (def.align == "right" ? " palette_icon_container_right" : "")
        }).appendTo(d);
        $('<div/>', {
          class: "palette_icon",
          style: "background-image: url(" + icon_url + ")"
        }).appendTo(iconContainer);
      }

      d.style.backgroundColor = def.color;

      if (def.outputs > 0) {
        var portOut = document.createElement("div");
        portOut.className = "palette_port palette_port_output";
        d.appendChild(portOut);
      }

      if (def.inputs > 0) {
        var portIn = document.createElement("div");
        portIn.className = "palette_port palette_port_input";
        d.appendChild(portIn);
      }

      if ($("#palette-base-category-" + rootCategory).length === 0) {
        if (coreCategories.indexOf(rootCategory) !== -1) {
          createCategoryContainer(rootCategory, RED._("node-red:palette.label." + rootCategory, {
            defaultValue: rootCategory
          }));
        } else {
          var ns = def.set.id;
          createCategoryContainer(rootCategory, RED._(ns + ":palette.label." + rootCategory, {
            defaultValue: rootCategory
          }));
        }
      }
      $("#palette-container-" + rootCategory).show();

      if ($("#palette-" + category).length === 0) {
        $("#palette-base-category-" + rootCategory).append('<div id="palette-' + category + '"></div>');
      }

      $("#palette-" + category).append(d);
      d.onmousedown = function (e) {
        e.preventDefault();
      };

      var popover = RED.popover.create({
        target: $(d),
        trigger: "hover",
        width: "300px",
        content: "hi",
        delay: {
          show: 750,
          hide: 50
        }
      });
      $(d).data('popover', popover);

      // $(d).popover({
      //     title:d.type,
      //     placement:"right",
      //     trigger: "hover",
      //     delay: { show: 750, hide: 50 },
      //     html: true,
      //     container:'body'
      // });
      $(d).click(function () {
        RED.view.focus();
        var helpText;
        if (nt.indexOf("subflow:") === 0) {
          helpText = marked(RED.nodes.subflow(nt.substring(8)).info || "");
        } else {
          helpText = $("script[data-help-name='" + d['type'] + "']").html() || "";
        }
        RED.sidebar.info.set(helpText);
      });
      var chart = $("#chart");
      var chartOffset = chart.offset();

      // TODO: use IChartSVG interface
      const chartSVG: IChartSVG = <IChartSVG>$("#chart>svg").get(0);
      var activeSpliceLink;
      var mouseX;
      var mouseY;
      var spliceTimer;

      const dWidget = $(d)

      dWidget['draggable']({
        helper: 'clone',
        appendTo: 'body',
        revert: true,
        revertDuration: 50,
        containment: '#main-container',
        start: function () {
          RED.view.focus();
        },
        stop: function () {
          d3.select('.link_splice').classed('link_splice', false);
          if (spliceTimer) {
            clearTimeout(spliceTimer);
            spliceTimer = null;
          }
        },
        drag: function (e, ui) {

          // TODO: this is the margin-left of palette node. Hard coding
          // it here makes me sad
          //console.log(ui.helper.position());
          ui.position.left += 17.5;

          if (def.inputs > 0 && def.outputs > 0) {
            mouseX = ui.position.left + (ui.helper.width() / 2) - chartOffset.left + chart.scrollLeft();
            mouseY = ui.position.top + (ui.helper.height() / 2) - chartOffset.top + chart.scrollTop();

            const { getIntersectionList, createSVGRect } = chartSVG

            if (!spliceTimer) {
              spliceTimer = setTimeout(function () {
                var nodes = [];
                var bestDistance = Infinity;
                var bestLink = null;
                if (getIntersectionList) {
                  var svgRect = chartSVG.createSVGRect();
                  svgRect.x = mouseX;
                  svgRect.y = mouseY;
                  svgRect.width = 1;
                  svgRect.height = 1;
                  nodes = getIntersectionList(svgRect, chartSVG);
                  mouseX /= RED.view.scale();
                  mouseY /= RED.view.scale();
                } else {
                  // Firefox doesn't do getIntersectionList and that
                  // makes us sad
                  mouseX /= RED.view.scale();
                  mouseY /= RED.view.scale();
                  nodes = RED.view.getLinksAtPoint(mouseX, mouseY);
                }
                for (var i = 0; i < nodes.length; i++) {
                  if (d3.select(nodes[i]).classed('link_background')) {
                    var length = nodes[i].getTotalLength();
                    for (var j = 0; j < length; j += 10) {
                      var p = nodes[i].getPointAtLength(j);
                      var d2 = ((p.x - mouseX) * (p.x - mouseX)) + ((p.y - mouseY) * (p.y - mouseY));
                      if (d2 < 200 && d2 < bestDistance) {
                        bestDistance = d2;
                        bestLink = nodes[i];
                      }
                    }
                  }
                }
                if (activeSpliceLink && activeSpliceLink !== bestLink) {
                  d3.select(activeSpliceLink.parentNode).classed('link_splice', false);
                }
                if (bestLink) {
                  d3.select(bestLink.parentNode).classed('link_splice', true)
                } else {
                  d3.select('.link_splice').classed('link_splice', false);
                }
                if (activeSpliceLink !== bestLink) {
                  if (bestLink) {
                    $(ui.helper).data('splice', d3.select(bestLink).data()[0]);
                  } else {
                    $(ui.helper).removeData('splice');
                  }
                }
                activeSpliceLink = bestLink;
                spliceTimer = null;
              }, 200);
            }
          }
        }
      });

      var nodeInfo = null;
      if (def.category == "subflows") {
        $(d).dblclick(function (e) {
          RED.workspaces.show(nt.substring(8));
          e.preventDefault();
        });
        nodeInfo = marked(def.info || "");
      }
      this.setLabel(nt, $(d), label, nodeInfo);

      var categoryNode = $("#palette-container-" + category);
      if (categoryNode.find(".palette_node").length === 1) {
        categoryContainers[category].open();
      }

    }
    return this
  }

  removeNodeType(nt) {
    var nodeTypeId = this.escapeNodeType(nt);
    var paletteNode = $("#palette_node_" + nodeTypeId);
    var categoryNode = paletteNode.closest(".palette-category");
    paletteNode.remove();
    if (categoryNode.find(".palette_node").length === 0) {
      if (categoryNode.find("i").hasClass("expanded")) {
        categoryNode.find(".palette-content").slideToggle();
        categoryNode.find("i").toggleClass("expanded");
      }
    }
    return this
  }

  hideNodeType(nt) {
    var nodeTypeId = this.escapeNodeType(nt);
    $("#palette_node_" + nodeTypeId).hide();
    return this
  }

  showNodeType(nt) {
    var nodeTypeId = this.escapeNodeType(nt);
    $("#palette_node_" + nodeTypeId).show();
    return this
  }

  refreshNodeTypes() {
    const {
      RED,
      marked
    } = this

    RED.nodes.eachSubflow((sf) => {
      var paletteNode = $("#palette_node_subflow_" + sf.id.replace(".", "_"));

      if (!paletteNode) {
        this.handleError('refreshNodeTypes: No palette node for subflow ${sf.id} could be found on page', {
          sf
        })
      }

      var portInput = paletteNode.find(".palette_port_input");
      var portOutput = paletteNode.find(".palette_port_output");

      if (!portInput) {
        this.handleError('refreshNodeTypes: no port input element could be found .palette_port_input', {
          paletteNode
        })
      }
      if (!portOutput) {
        this.handleError('refreshNodeTypes: no port output element could be found .palette_port_output', {
          paletteNode
        })
      }

      const inPort = sf.in
      const outPort = sf.out

      if (portInput.length === 0 && inPort.length > 0) {
        var portIn = document.createElement("div");
        portIn.className = "palette_port palette_port_input";
        paletteNode.append(portIn);
      } else if (portInput.length !== 0 && inPort.length === 0) {
        portInput.remove();
      }

      if (portOutput.length === 0 && outPort.length > 0) {
        var portOut = document.createElement("div");
        portOut.className = "palette_port palette_port_output";
        paletteNode.append(portOut);
      } else if (portOutput.length !== 0 && outPort.length === 0) {
        portOutput.remove();
      }
      this.setLabel(sf.type + ":" + sf.id, paletteNode, sf.name, marked(sf.info || ""));
    });
    return this
  }

  filterChange(val) {
    const {
      categoryContainers
    } = this

    var re = new RegExp(val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    $("#palette-container .palette_node").each(function (i, el) {
      var currentLabel = $(el).find(".palette_label").text();
      if (val === "" || re.test(el.id) || re.test(currentLabel)) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });

    for (var category in categoryContainers) {
      if (categoryContainers.hasOwnProperty(category)) {
        if (categoryContainers[category].container
          .find(".palette_node")
          .filter(function () {
            return $(this).css('display') !== 'none'
          }).length === 0) {
          categoryContainers[category].close();
        } else {
          categoryContainers[category].open();
        }
      }
    }
    return this
  }
}
