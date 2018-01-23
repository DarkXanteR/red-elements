import {
  Context
} from '../../context'
import { Canvas } from '../../';

export class CanvasEventManager extends Context {
  constructor(protected canvas: Canvas) {
    super()
  }

  /**
   * disable Quick Join Event Handler
   * @param evt
   */
  disableQuickJoinEventHandler(evt) {
    const {
      disableQuickJoinEventHandler
    } = this
    const {
      resetMouseVars,
      hideDragLines,
      redraw
    } = rebind([
        'resetMouseVars',
        'hideDragLines',
        'redraw'
      ])

    // Check for ctrl (all browsers), 'Meta' (Chrome/FF), keyCode 91 (Safari)
    if (evt.keyCode === 17 || evt.key === 'Meta' || evt.keyCode === 91) {
      resetMouseVars();
      hideDragLines();
      redraw();
      $(window).off('keyup', disableQuickJoinEventHandler);
    }
  }

  /**
   * handle WorkSpace Change Event
   * @param event
   * @param workspaceScrollPositions
   */
  handleWorkSpaceChangeEvent(event, workspaceScrollPositions) {
    {
      var chart = $('#chart');
      if (event.old !== 0) {
        workspaceScrollPositions[event.old] = {
          left: chart.scrollLeft(),
          top: chart.scrollTop()
        };
      }
      var scrollStartLeft = chart.scrollLeft();
      var scrollStartTop = chart.scrollTop();

      activeSubflow = RED.nodes.subflow(event.workspace);

      RED.menu.setDisabled('menu-item-workspace-edit', activeSubflow);
      RED.menu.setDisabled('menu-item-workspace-delete', RED.workspaces.count() == 1 || activeSubflow);

      if (workspaceScrollPositions[event.workspace]) {
        chart.scrollLeft(workspaceScrollPositions[event.workspace].left);
        chart.scrollTop(workspaceScrollPositions[event.workspace].top);
      } else {
        chart.scrollLeft(0);
        chart.scrollTop(0);
      }
      var scrollDeltaLeft = chart.scrollLeft() - scrollStartLeft;
      var scrollDeltaTop = chart.scrollTop() - scrollStartTop;
      if (mouse_position != null) {
        mouse_position[0] += scrollDeltaLeft;
        mouse_position[1] += scrollDeltaTop;
      }
      clearSelection();
      RED.nodes.eachNode(function (n) {
        n.dirty = true;
      });
      updateSelection();
      updateActiveNodes();
      redraw();
    }
  }
}