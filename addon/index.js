/* eslint-disable ember/new-module-imports */
import Ember from 'ember';
import { macroCondition, dependencySatisfies } from '@embroider/macros';

export const Checkbox = macroCondition(
  dependencySatisfies('ember-source', '>= 3.27.0-beta.1')
)
  ? Ember._LegacyCheckbox.extend()
  : Ember.Checkbox;

export const TextField = macroCondition(
  dependencySatisfies('ember-source', '>= 3.27.0-beta.1')
)
  ? Ember._LegacyTextField.extend()
  : Ember.TextField;

export const TextArea = macroCondition(
  dependencySatisfies('ember-source', '>= 3.27.0-beta.1')
)
  ? Ember._LegacyTextArea.extend()
  : Ember.TextArea;

export const LinkComponent = macroCondition(
  dependencySatisfies('ember-source', '>= 3.27.0-beta.1')
)
  ? Ember._LegacyLinkComponent.extend()
  : Ember.LinkComponent;
