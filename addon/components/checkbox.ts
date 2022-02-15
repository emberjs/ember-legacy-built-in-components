//@ts-check
/* eslint-disable ember/no-component-lifecycle-hooks */
/* eslint-disable ember/require-tagless-components */
/* eslint-disable ember/no-classic-classes */
/* eslint-disable ember/no-classic-components */
import { set } from '@ember/object';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import EmberComponent from '@ember/component';

/**
@module @ember/component
*/

/**
  The internal class used to create text inputs when the `{{input}}`
  helper is used with `type` of `checkbox`.

  See [Ember.Templates.helpers.input](/ember/release/classes/Ember.Templates.helpers/methods/input?anchor=input)  for usage details.

  ## Direct manipulation of `checked`

  The `checked` attribute of an `Checkbox` object should always be set
  through the Ember object or by interacting with its rendered element
  representation via the mouse, keyboard, or touch. Updating the value of the
  checkbox via jQuery will result in the checked value of the object and its
  element losing synchronization.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied.

  @class Checkbox
  @public
*/
const Checkbox = EmberComponent.extend({
  /**
    By default, this component will add the `ember-checkbox` class to the component's element.

    @property classNames
    @type Array<String> | String
    @default ['ember-checkbox']
    @public
   */
  classNames: ['ember-checkbox'],

  tagName: 'input',

  /**
    By default this component will forward a number of arguments to attributes on the the
    component's element:

    * indeterminate
    * disabled
    * tabindex
    * name
    * autofocus
    * required
    * form

    When invoked with curly braces, this is the exhaustive list of HTML attributes you can
    customize (i.e. `{{input type="checkbox" disabled=true}}`).

    When invoked with angle bracket invocation, this list is irrelevant, because you can use HTML
    attribute syntax to customize the element (i.e.
    `<Input @type="checkbox" disabled data-custom="custom value" />`). However, `@type` and
    `@checked` must be passed as named arguments, not attributes.

    @property attributeBindings
    @type Array<String> | String
    @default ['type', 'checked', 'indeterminate', 'disabled', 'tabindex', 'name', 'autofocus', 'required', 'form']
    @public
  */
  attributeBindings: [
    'type',
    'checked',
    'indeterminate',
    'disabled',
    'tabindex',
    'name',
    'autofocus',
    'required',
    'form',
  ],

  /**
    Sets the `type` attribute of the `Checkbox`'s element

    @property disabled
    @default false
    @private
   */
  type: 'checkbox',

  /**
    Sets the `disabled` attribute of the `Checkbox`'s element

    @property disabled
    @default false
    @public
   */
  disabled: false,

  /**
    Corresponds to the `indeterminate` property of the `Checkbox`'s element

    @property disabled
    @default false
    @public
   */
  indeterminate: false,

  /**
    @property checked
    @default false
    @private
   */
  checked: false,

  /**
    Whenever the checkbox is inserted into the DOM, perform initialization steps, which include
    setting the indeterminate property if needed.

    If this method is overridden, `super` must be called.

    @method
    @public
   */
  didInsertElement() {
    this._super(...arguments);
    (this.element as any).indeterminate = Boolean(this.indeterminate);
  },

  /**
    Whenever the `change` event is fired on the checkbox, update its `checked` property to reflect
    whether the checkbox is checked.

    If this method is overridden, `super` must be called.

    @method
    @public
   */
  change() {
    set(this, 'checked', ((this.element as any).checked as boolean));
  },
});

if (DEBUG) {
  const UNSET = {};

  (Checkbox.reopen as any)({
    value: UNSET,

    didReceiveAttrs() {
      this._super();

      assert(
        "`<Input @type='checkbox' @value={{...}} />` is not supported; " +
          "please use `<Input @type='checkbox' @checked={{...}} />` instead.",
        !(this.type === 'checkbox' && this.value !== UNSET)
      );
    },
  });
}

Checkbox.toString = () => '@ember/component/checkbox';

export default Checkbox;
