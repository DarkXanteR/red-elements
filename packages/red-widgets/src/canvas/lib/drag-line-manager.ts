import {
  Context
} from '../../context'
import { Canvas } from '../../';

export class CanvasDragLineManager extends Context {
  constructor(protected canvas: Canvas) {
    super()
  }

  /**
   * show Drag Lines
   * @param nodes
   */
  showDragLines(nodes) {
    const {
    drag_lines
  } = this.canvas

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      node.el = this.dragGroup.append('svg:path').attr('class', 'drag_line');
      drag_lines.push(node);
    }

  }

  /**
   * hide Drag Lines
   */
  hideDragLines() {
    const {
    drag_lines
  } = this.canvas

    while (drag_lines.length) {
      var line = drag_lines.pop();
      if (line.el) {
        line.el.remove();
      }
    }
  }
}
