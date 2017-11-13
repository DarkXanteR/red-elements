import {
  Context
} from './context'
import {
  default as $
} from 'jquery'

export class TypeSearch extends Context {
  constructor(ctx = {}) {
    super(ctx)
    this.RED = ctx
    this.disabled = false;
    this.dialog = null;
    //  searchInput;
    //  searchResults;
    //  searchResultsDiv;
    // addCallback;
    this.selected = -1;
    this.visible = false;
    this.activeFilter = "";
    this.typesUsed = {};
  }

  search(val) {
    let {
      searchResults,
      selected
    } = this
    const activeFilter = val.toLowerCase();
    var visible = searchResults.editableList('filter');
    setTimeout(() => {
      selected = 0;
      searchResults.children().removeClass('selected');
      searchResults.children(":visible:first").addClass('selected');
    }, 100);
  }

  ensureSelectedIsVisible() {
    let {
      searchResults
    } = this

    const selectedEntry = searchResults.find("li.selected");
    if (selectedEntry.length === 1) {
      const scrollWindow = searchResults.parent();
      const scrollHeight = scrollWindow.height();
      const scrollOffset = scrollWindow.scrollTop();
      const y = selectedEntry.position().top;
      const h = selectedEntry.height();
      if (y + h > scrollHeight) {
        scrollWindow.animate({
          scrollTop: '-=' + (scrollHeight - (y + h) - 10)
        }, 50);
      } else if (y < 0) {
        scrollWindow.animate({
          scrollTop: '+=' + (y - 10)
        }, 50);
      }
    }
  }

  createDialog() {
    let {
      searchResults,
      selected,
      searchResultsDiv,
      dialog,
      confirm,
      RED
    } = this
    confirm = confirm.bind(this)

    //shade = $('<div>',{class:"red-ui-type-search-shade"}).appendTo("#main-container");
    dialog = $("<div>", {
      id: "red-ui-type-search",
      class: "red-ui-search red-ui-type-search"
    }).appendTo("#main-container");
    const searchDiv = $("<div>", {
      class: "red-ui-search-container"
    }).appendTo(dialog);
    const searchInput = $('<input type="text">').attr("placeholder", RED._("search.addNode")).appendTo(searchDiv).searchBox({
      delay: 50,
      change: () => {
        search($(this).val());
      }
    });
    searchInput.on('keydown', (evt) => {
      const children = searchResults.children(":visible");
      if (children.length > 0) {
        if (evt.keyCode === 40) {
          // Down
          if (selected < children.length - 1) {
            if (selected > -1) {
              $(children[selected]).removeClass('selected');
            }
            selected++;
          }
          $(children[selected]).addClass('selected');
          ensureSelectedIsVisible();
          evt.preventDefault();
        } else if (evt.keyCode === 38) {
          // Up
          if (selected > 0) {
            if (selected < children.length) {
              $(children[selected]).removeClass('selected');
            }
            selected--;
          }
          $(children[selected]).addClass('selected');
          ensureSelectedIsVisible();
          evt.preventDefault();
        } else if (evt.keyCode === 13) {
          // Enter
          var index = Math.max(0, selected);
          if (index < children.length) {
            // TODO: dips into editableList impl details
            confirm($(children[index]).find(".red-ui-editableList-item-content").data('data'));
          }
        }
      }
    });

    searchResultsDiv = $("<div>", {
      class: "red-ui-search-results-container"
    }).appendTo(dialog);
    searchResults = $('<ol>', {
      id: "search-result-list",
      style: "position: absolute;top: 0;bottom: 0;left: 0;right: 0;"
    }).appendTo(searchResultsDiv).editableList({
      addButton: false,
      filter: (data) => {
        if (activeFilter === "") {
          return true;
        }
        if (data.recent || data.common) {
          return false;
        }
        return (activeFilter === "") || (data.index.indexOf(activeFilter) > -1);
      },
      addItem: (container, i, object) => {
        var def = object.def;
        object.index = object.type.toLowerCase();
        if (object.separator) {
          container.addClass("red-ui-search-result-separator")
        }
        var div = $('<a>', {
          href: '#',
          class: "red-ui-search-result"
        }).appendTo(container);

        var nodeDiv = $('<div>', {
          class: "red-ui-search-result-node"
        }).appendTo(div);
        var colour = def.color;
        var icon_url = RED.utils.getNodeIcon(def);
        nodeDiv.css('backgroundColor', colour);

        var iconContainer = $('<div/>', {
          class: "palette_icon_container"
        }).appendTo(nodeDiv);
        $('<div/>', {
          class: "palette_icon",
          style: "background-image: url(" + icon_url + ")"
        }).appendTo(iconContainer);

        if (def.inputs > 0) {
          $('<div/>', {
            class: "red-ui-search-result-node-port"
          }).appendTo(nodeDiv);
        }
        if (def.outputs > 0) {
          $('<div/>', {
            class: "red-ui-search-result-node-port red-ui-search-result-node-output"
          }).appendTo(nodeDiv);
        }

        var contentDiv = $('<div>', {
          class: "red-ui-search-result-description"
        }).appendTo(div);

        var label = object.label;
        object.index += "|" + label.toLowerCase();

        $('<div>', {
          class: "red-ui-search-result-node-label"
        }).html(label).appendTo(contentDiv);

        div.click((evt) => {
          evt.preventDefault();
          confirm(object);
        });
      },
      scrollOnAdd: false
    });

  }

  confirm(def) {
    let {
      typesUsed,
      hide,
      addCallback
    } = this
    hide = hide.bind(this)
    hide();
    typesUsed[def.type] = Date.now();
    addCallback(def.type);
  }

  handleMouseActivity(evt) {
    let {
      visible
    } = this
    if (visible) {
      var t = $(evt.target);
      while (t.prop('nodeName').toLowerCase() !== 'body') {
        if (t.attr('id') === 'red-ui-type-search') {
          return;
        }
        t = t.parent();
      }
      hide(true);
    }
  }

  show(opts) {
    let {
      visible,
      searchResultsDiv,
      searchInput,
      dialog,
      createDialog,
      addCallback,
      RED
    } = this
    createDialog = createDialog.bind(this)
    if (!visible) {
      RED.keyboard.add("*", "escape", () => {
        hide()
      });
      if (dialog === null) {
        createDialog();
      }
      visible = true;
      setTimeout(() => {
        $(document).on('mousedown.type-search', handleMouseActivity);
        $(document).on('mouseup.type-search', handleMouseActivity);
        $(document).on('click.type-search', handleMouseActivity);
      }, 200);
    } else {
      dialog.hide();
      searchResultsDiv.hide();
    }
    refreshTypeList();
    addCallback = opts.add;
    RED.events.emit("type-search:open");
    //shade.show();
    dialog.css({
      left: opts.x + "px",
      top: opts.y + "px"
    }).show();
    searchResultsDiv.slideDown(300);
    setTimeout(() => {
      searchResultsDiv.find(".red-ui-editableList-container").scrollTop(0);
      searchInput.focus();
    }, 100);
  }

  hide(fast) {
    let {
      visible,
      searchResultsDiv,
      searchInput,
      RED
    } = this

    if (visible) {
      RED.keyboard.remove("escape");
      visible = false;
      if (dialog !== null) {
        searchResultsDiv.slideUp(fast ? 50 : 200, () => {
          dialog.hide();
          searchInput.searchBox('value', '');
        });
        //shade.hide();
      }
      RED.events.emit("type-search:close");
      RED.view.focus();
      $(document).off('mousedown.type-search');
      $(document).off('mouseup.type-search');
      $(document).off('click.type-search');
    }
  }

  getTypeLabel(type, def) {
    var label = type;
    if (typeof def.paletteLabel !== "undefined") {
      try {
        label = (typeof def.paletteLabel === "" ? def.paletteLabel.call(def) : def.paletteLabel) || "";
        label += " (" + type + ")";
      } catch (err) {
        console.log("Definition error: " + type + ".paletteLabel", err);
      }
    }
    return label;
  }

  refreshTypeList() {
    let {
      visible,
      searchResultsDiv,
      searchResults,
      searchInput,
      selected,
      RED
    } = this

    var i;
    searchResults.editableList('empty');
    searchInput.searchBox('value', '');
    selected = -1;
    var common = [
      'inject', 'debug', '', 'change', 'switch'
    ];

    var recentlyUsed = Object.keys(typesUsed);
    recentlyUsed.sort((a, b) => {
      return typesUsed[b] - typesUsed[a];
    });
    recentlyUsed = recentlyUsed.filter((t) => {
      return common.indexOf(t) === -1;
    });

    var items = [];
    RED.nodes.registry.getNodeTypes().forEach((t) => {
      var def = RED.nodes.getType(t);
      if (def.category !== 'config' && t !== 'unknown' && t !== 'tab') {
        items.push({
          type: t,
          def: def,
          label: getTypeLabel(t, def)
        });
      }
    });
    items.sort((a, b) => {
      var al = a.label.toLowerCase();
      var bl = b.label.toLowerCase();
      if (al < bl) {
        return -1;
      } else if (al === bl) {
        return 0;
      } else {
        return 1;
      }
    })

    var commonCount = 0;
    var item;
    for (i = 0; i < common.length; i++) {
      var itemDef = RED.nodes.getType(common[i]);
      if (itemDef) {
        item = {
          type: common[i],
          common: true,
          def: itemDef
        };
        item.label = getTypeLabel(item.type, item.def);
        if (i === common.length - 1) {
          item.separator = true;
        }
        searchResults.editableList('addItem', item);
      }
    }
    for (i = 0; i < Math.min(5, recentlyUsed.length); i++) {
      item = {
        type: recentlyUsed[i],
        def: RED.nodes.getType(recentlyUsed[i]),
        recent: true
      };
      item.label = getTypeLabel(item.type, item.def);
      if (i === recentlyUsed.length - 1) {
        item.separator = true;
      }
      searchResults.editableList('addItem', item);
    }
    for (i = 0; i < items.length; i++) {
      searchResults.editableList('addItem', items[i]);
    }
    setTimeout(() => {
      selected = 0;
      searchResults.children(":first").addClass('selected');
    }, 100);
  }
}
