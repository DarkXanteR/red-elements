import { PaletteEditor } from './';

import {
  Context,
  container,
  delegator,
  lazyInject,
  $TYPES
} from './_base'

import {
  ISettings
} from '../../../_interfaces'

const TYPES = $TYPES.all

export interface IInstallTab {
  initInstallTab()
}

@delegator(container)
export class InstallTab extends Context implements IInstallTab {
  @lazyInject(TYPES.settings) settings: ISettings

  constructor(public editor: PaletteEditor) {
    super()
  }

  /**
   * init install tab
   */
  initInstallTab() {
    let {
      searchInput,
      loadedList,
      loadedIndex,
      packageList,
      catalogueLoadStatus,
      catalogueLoadErrors,
      catalogueLoadStart,
      catalogueCount,
    } = this.editor

    const { settings } = this

    const {
    handleCatalogResponse,
      refreshNodeModuleList,
  } = this.rebind([
        'handleCatalogResponse',
        'refreshNodeModuleList'
      ], this.editor)

    if (loadedList.length === 0) {
      loadedList = [];
      loadedIndex = {};
      if (!packageList) {
        // TODO: perhaps call createSettingsPane if packageList is not defined

        this.handleError('initInstallTab: packageList missing. Created in createSettingsPane', {
          instance: this
        })
      }

      if (!packageList.editableList) {
        this.handleError('initInstallTab: packageList missing editableList', {
          packageList
        })
      }

      packageList.editableList('empty');

      $(".palette-module-shade-status").html(this.RED._('palette.editor.loading'));
      var catalogues = settings.theme('palette.catalogues') || ['https://catalogue.nodered.org/catalogue.json'];
      catalogueLoadStatus = [];
      catalogueLoadErrors = false;
      catalogueCount = catalogues.length;
      if (catalogues.length > 1) {
        $(".palette-module-shade-status").html(this.RED._('palette.editor.loading') + "<br>0/" + catalogues.length);
      }
      $("#palette-module-install-shade").show();
      catalogueLoadStart = Date.now();
      var handled = 0;
      catalogues.forEach((catalog, index) => {
        $.getJSON(catalog, {
          _: new Date().getTime()
        }, (v) => {
          handleCatalogResponse(null, catalog, index, v);
          refreshNodeModuleList();
        }).fail((jqxhr, textStatus, error) => {
          handleCatalogResponse(jqxhr, catalog, index);
        }).always(() => {
          handled++;
          if (handled === catalogueCount) {
            searchInput.searchBox('change');
          }
        })
      });
    }
    return this
  }
}
