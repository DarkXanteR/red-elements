import {
  readPage,
  widgets
} from '../imports';

const {
  EditableList
} = widgets

import options from '../utility/helper'
import { optional } from 'inversify/dts/annotation/optional';

const clazz = EditableList

const {
  log
} = console

beforeAll(() => {
  // create jquery UI widget via factory (ie. make available on jQuery elements)
  new EditableList();
  // load document with placeholder elements to create widgets (for testing)
  document.documentElement.innerHTML = readPage('simple');
})

function getElement() {
  return $('<div><div class="red-ui-editableList-item-content"></div><div class="red-ui-editableList-item-content"></div></div>');
}

test('EditableList: is a class', () => {
  expect(typeof clazz).toBe('function');
});

test('EditableList: widget can be created', () => {
  let elem: any = $('<div style="position:absolute;top:0;width:20%"></div>');
  let widgetElem = elem.editableList(options);
  expect(widgetElem).toBeDefined();
});

test('EditableList: widget header created', () => {
  let elem: any = getElement();
  options.addButton = "Add Button";
  options.sortable = true;
  let widgetElem = elem.editableList(options);
  expect(widgetElem).toBeDefined()
});


test('EditableList: widget addItem with empty object', () => {
  let elem: any = getElement();
  let addItem = elem.editableList(options);
  addItem.editableList('items');
  addItem.editableList('addItem', {});
  expect(addItem).toBeDefined();
})

jest.useFakeTimers();
test('EditableList: widget addItem without data', () => {
  let elem: any = getElement();
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});


test('EditableList: widget addItem without sort', () => {
  let elem: any = getElement();
  options["sort"] = undefined;
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});

test('EditableList: widget addItem with sort', () => {
  let elem: any = getElement();
  options["sort"] = function () { return 1; };
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});

test('EditableList: widget addItem with sort false', () => {
  let elem: any = getElement();
  options["sortable"] = false;
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});

test('EditableList: widget addItem without removable option', () => {
  let elem: any = getElement();
  options["removable"] = false;
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});

test('EditableList: widget addItem without passing function', () => {
  let elem: any = getElement();
  options["addItem"] = undefined;
  let addItem = elem.editableList(options).editableList('addItem');
  expect(setTimeout.mock.calls.length).toBeGreaterThan(0);
  expect(addItem).toBeDefined();
});

test('EditableList: widget addItems with array of items', () => {
  let elem: any = getElement();
  let items = [];
  items.push($("<div data-id='item1' data-class='item'>"));
  items.push($("<div data-id='item2' data-class='item'>"));
  items.push($("<div data-id='item3' data-class='item'>"));
  let addItem = elem.editableList(options).editableList('addItems', items);
  expect(addItem).toBeDefined();
});

test('EditableList: widget removeItems', () => {
  let elem: any = getElement();
  let addItem = elem.editableList(options).editableList('removeItem');
  expect(addItem).toBeDefined();
});

test('EditableList: widget removeItems without passing function', () => {
  let elem: any = getElement();
  options.removeItem = undefined;
  let addItem = elem.editableList(options).editableList('removeItem');
  expect(addItem).toBeDefined();
});

test('EditableList: widget get Items', () => {
  let elem: any = getElement();
  let addItem = elem.editableList(options).editableList('items');
  expect(addItem).toBeDefined();
});

test('EditableList: empty element', () => {
  let elem: any = getElement();
  let addItem = elem.editableList().editableList('empty');
  expect(addItem).toBeDefined();
});


test('EditableList: get element length', () => {
  let elem: any = getElement();
  let length = elem.editableList().editableList('length');
  expect(length).toBeGreaterThan(0);
});

test('EditableList: set element height', () => {
  let elem: any = getElement();
  var options = {
    resizeItem: function (element, size) { }
  };
  let editableList = elem.editableList(options);
  editableList.editableList('height', 150);
});

test('EditableList: sort elements', () => {
  let elem: any = getElement();
  elem.editableList().editableList('sort', function (A, B) { });
});

test('EditableList: sort elements without function', () => {
  let elem: any = getElement();
  elem.editableList().editableList('sort');
});

test('EditableList: filter without argument', () => {
  let elem: any = getElement();
  let editableList = elem.editableList()
  editableList.editableList('items')
  editableList.editableList('filter');
});

test('EditableList: filter with argument returning true', () => {
  let elem: any = getElement();
  let editableList = elem.editableList()
  editableList.editableList('items')
  editableList.editableList('filter', function (data) {
    return true;
  });
});


test('EditableList: filter with argument returning false', () => {
  let elem: any = getElement();
  let editableList = elem.editableList()
  editableList.editableList('items')
  editableList.editableList('filter', function (data) {
    return false;
  });
});

test('EditableList: filter with argument to execute catch block', () => {
  let elem: any = getElement();
  let editableList = elem.editableList()
  editableList.editableList('items')
  editableList.editableList('filter', function (data) {
    let c = 0 / 1;
  });
});

test('EditableList: destroy editable list', () => {
  let elem: any = getElement();
  let editableList = elem.editableList().editableList('destroy');
});

test('EditableList: set width', () => {
  let elem: any = getElement();
  let editableList = elem.editableList().editableList('width', 150);
});

test('EditableList: create element with auto height', () => {
  let elem: any = getElement();
  options["height"] = 'auto';
  let editableList = elem.editableList();
  expect(editableList).toBeDefined();
});

test('EditableList: create element with minHeight to 0', () => {
  let elem: any = getElement();
  options["height"] = 'auto';
  let editableList = elem.editableList();
  expect(editableList).toBeDefined();
});

test('EditableList: create element with add button to false', () => {
  let elem: any = getElement();
  options["addButton"] = false;
  let editableList = elem.editableList();
  expect(editableList).toBeDefined();
});
test('EditableList: with RED null', () => {
  new EditableList();
  let elem: any = getElement();
  options["addButton"] = true;
  let editableList = elem.editableList();
  expect(editableList).toBeDefined();
});

test('EditableList: with RED null', () => {
  let elem: any = getElement();
  options["addButton"] = true;
  let editableList = elem.editableList();
  let deleteButton = $(".red-ui-editableList-item-remove");

  expect(editableList).toBeDefined();
});

test('EditableList: create widget without connect width', () => {
  let elem: any = getElement();
  options.connectWith = undefined;
  let widgetElem = elem.editableList(options);
  expect(widgetElem).toBeDefined()
});
// * options:
// *   - addButton : boolean|string - text for add label, default 'add'
// *   - height : number|'auto'
// *   - resize : function - called when list as a whole is resized
// *   - resizeItem : function(item) - called to resize individual item
// *   - sortable : boolean|string - string is the css selector for handle
// *   - sortItems : function(items) - when order of items changes
// *   - connectWith : css selector of other sortables
// *   - removable : boolean - whether to display delete button on items
// *   - addItem : function(row,index,itemData) - when an item is added
// *   - removeItem : function(itemData) - called when an item is removed
// *   - filter : function(itemData) - called for each item to determine if it should be shown
// *   - sort : function(itemDataA,itemDataB) - called to sort items
// *   - scrollOnAdd : boolean - whether to scroll to newly added items
// * methods:
// *   - addItem(itemData)
// *   - removeItem(itemData)
  // *   - width(width)
  // *   - height(height)
  // *   - items()
  // *   - empty()
  // *   - filter(filter)
  // *   - sort(sort)
  // *   - length()
