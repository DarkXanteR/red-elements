import { Component, Prop, Element } from '@stencil/core'
import { library } from '../_widgets'
const { controllers } = library

@Component({
  tag: 'lib-save',
  // styleUrl: 'red-menu.scss'
})
export class LibSave {
  componentDidLoad() {
    // use dialog widget?
    controllers
  }

  @Element() me: HTMLElement;
  // @Prop() library: any;
  @Prop() id: string;

  // reuse Header.vue template from red-vue
  render() {
    return (
      <div id="node-dialog-library-save" class="hide">
        <form class="form-horizontal">
          <div class="form-row">
            <label for="node-dialog-library-save-folder" data-i18n="[append]library.folder"><i class="fa fa-folder-open"></i> </label>
            <input type="text" id="node-dialog-library-save-folder" data-i18n="[placeholder]library.folderPlaceholder" />
          </div>
          <div class="form-row">
            <label for="node-dialog-library-save-filename" data-i18n="[append]library.filename"><i class="fa fa-file"></i> </label>
            <input type="text" id="node-dialog-library-save-filename" data-i18n="[placeholder]library.filenamePlaceholder" />
          </div>
        </form>
      </div>
    );
  }
}
