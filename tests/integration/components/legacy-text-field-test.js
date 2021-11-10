import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | legacy-text-field', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders an input', async function (assert) {
    await render(hbs`<LegacyTextField />`);

    assert.dom('input').exists();
    assert.dom('input').hasAttribute('type', 'text');
  });
});
