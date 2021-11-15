/* eslint-disable ember/new-module-imports */
import Ember from 'ember';
import {
  macroCondition,
  dependencySatisfies,
  importSync,
} from '@embroider/macros';

let Checkbox;
if (macroCondition(dependencySatisfies('ember-source', '>= v4.0.0-beta.9'))) {
  Checkbox = importSync(
    '@ember/legacy-built-in-components/components/checkbox'
  ).default;
} else if (
  macroCondition(dependencySatisfies('ember-source', '>= 3.27.0-beta.1'))
) {
  Checkbox = Ember._LegacyCheckbox.extend();
} else {
  Checkbox = Ember.Checkbox;
}

let LinkComponent;
if (macroCondition(dependencySatisfies('ember-source', '>= v4.0.0-beta.9'))) {
  LinkComponent = importSync(
    '@ember/legacy-built-in-components/components/link-to'
  ).default;
} else if (
  macroCondition(dependencySatisfies('ember-source', '>= 3.27.0-beta.1'))
) {
  LinkComponent = Ember._LegacyLinkComponent.extend();
} else {
  LinkComponent = Ember.LinkComponent;
}

let TextArea;
if (macroCondition(dependencySatisfies('ember-source', '>= v4.0.0-beta.9'))) {
  TextArea = importSync(
    '@ember/legacy-built-in-components/components/textarea'
  ).default;
} else if (
  macroCondition(dependencySatisfies('ember-source', '>= 3.27.0-beta.1'))
) {
  TextArea = Ember._LegacyTextArea.extend();
} else {
  TextArea = Ember.TextArea;
}

let TextField;
if (macroCondition(dependencySatisfies('ember-source', '>= v4.0.0-beta.9'))) {
  TextField = importSync(
    '@ember/legacy-built-in-components/components/text-field'
  ).default;
} else if (
  macroCondition(dependencySatisfies('ember-source', '>= 3.27.0-beta.1'))
) {
  TextField = Ember._LegacyTextField.extend();
} else {
  TextField = Ember.TextField;
}

export { Checkbox, LinkComponent, TextArea, TextField };
