import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import TextSupportMixin from '@ember/legacy-built-in-components/mixins/text-support';
import { module, test } from 'qunit';

module('Unit | Mixin | TextSupport', function () {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let TextSupportObject = EmberObject.extend(Evented, TextSupportMixin);
    let subject = TextSupportObject.create();
    assert.ok(subject);
  });
});
