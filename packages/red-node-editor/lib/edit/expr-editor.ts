import {
  NodeEditor,
  Context,
  $,
  container,
  delegateTarget,
  lazyInject,
  $TYPES
} from './_base'
import { ICanvas, INodeEditor, IPanels, ITabs } from '../../../../../red-runtime/src/interfaces/index';
import { II18n } from '../../../../../red-runtime/src/i18n/interface';
import { ITray } from '../../../tray/lib/interface';
import { IState } from '../../../_interfaces/index';
import { ISidebar } from '../../../sidebar/lib/sidebar/interface';

const TYPES = $TYPES.all

import {
  jsonata,
  marked
} from '../../../_libs'

export interface IExpressionEditor {
  editExpression(options)
}

/**
 * Node Validator for NodeEditor
 */
@delegateTarget({
  container,
})
export class ExpressionEditor extends Context implements IExpressionEditor {
  @lazyInject(TYPES.canvas) $view: ICanvas
  @lazyInject(TYPES.i18n) $i18n: II18n
  @lazyInject(TYPES.tray) $tray: ITray
  @lazyInject(TYPES.state) $state: IState

  @lazyInject(TYPES.editor) $editor: INodeEditor
  @lazyInject(TYPES.common.panel) $panels: IPanels // from common widgets
  @lazyInject(TYPES.sidebar.main) $sidebar: ISidebar
  @lazyInject(TYPES.common.tabs) $tabs: ITabs // from common widgets


  constructor(public editor: NodeEditor) {
    super()
  }

  editExpression(options) {
    const {
      editor,
      rebind,

      // services
      $view,
      $state,
      $tray,
      $i18n,
      $editor,
      $tabs,
      $sidebar,
      $panels
    } = this

    const {
      editStack,
      editTrayWidthCache,
    } = editor

    const {
      getEditStackTitle,
      buildEditForm,
      expressionTestCache
    } = rebind([
        'getEditStackTitle',
        'buildEditForm',
        'expressionTestCache'
      ], editor)

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
    $view.state($state.EDITING);
    var expressionEditor;
    var testDataEditor;
    var testResultEditor
    var panels;

    var trayOptions = {
      width: null,
      title: getEditStackTitle(),
      buttons: [{
        id: "node-dialog-cancel",
        text: $i18n.t("common.label.cancel"),
        click: function () {
          $tray.close();
        }
      },
      {
        id: "node-dialog-ok",
        text: $i18n.t("common.label.done"),
        class: "primary",
        click: function () {
          $("#node-input-expression-help").html("");
          onComplete(expressionEditor.getValue());
          $tray.close();
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
          var args = $i18n.t('jsonata:' + f + ".args", {
            defaultValue: ''
          });
          var title = "<h5>" + f + "(" + args + ")</h5>";
          var body = marked($i18n.t('jsonata:' + f + '.desc', {
            defaultValue: ''
          }));
          $("#node-input-expression-help").html(title + "<p>" + body + "</p>");

        })
        expressionEditor = $editor.createEditor({
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

        var tabs = $tabs.create({
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
        testDataEditor = $editor.createEditor({
          id: 'node-input-expression-test-data',
          value: expressionTestCache[expressionTestCacheId] || '{\n    "payload": "hello world"\n}',
          mode: "ace/mode/json",
          lineNumbers: false
        });
        var changeTimer;
        $(".node-input-expression-legacy").click(function (e) {
          e.preventDefault();
          $sidebar.info.set($i18n.t("expressionEditor.compatModeDesc"));
          $sidebar.info.show();
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
            testResultEditor.setValue($i18n.t("expressionEditor.errors.invalid-expr", {
              message: err.message
            }), -1);
            return;
          }
          try {
            parsedData = JSON.parse(value);
          } catch (err) {
            testResultEditor.setValue($i18n.t("expressionEditor.errors.invalid-msg", {
              message: err.toString()
            }))
            return;
          }

          try {
            var result = expr.evaluate(legacyMode ? {
              msg: parsedData
            } : parsedData);
            if (usesContext) {
              testResultEditor.setValue($i18n.t("expressionEditor.errors.context-unsupported"), -1);
              return;
            }

            var formattedResult;
            if (result !== undefined) {
              formattedResult = JSON.stringify(result, null, 4);
            } else {
              formattedResult = $i18n.t("expressionEditor.noMatch");
            }
            testResultEditor.setValue(formattedResult, -1);
          } catch (err) {
            testResultEditor.setValue($i18n.t("expressionEditor.errors.eval", {
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

        testResultEditor = $editor.createEditor({
          id: 'node-input-expression-test-result',
          value: "",
          mode: "ace/mode/json",
          lineNumbers: false,
          readOnly: true
        });
        panels = $panels.create({
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
    $tray.show(trayOptions);
    return this
  }
}
