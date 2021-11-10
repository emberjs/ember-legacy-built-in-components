import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | legacy-checkbox', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders input with checkbox type', async function (assert) {
    await render(hbs`<LegacyCheckbox />`);

    assert.dom('input').exists();
    assert.dom('input').hasAttribute('type', 'checkbox');
  });
});
