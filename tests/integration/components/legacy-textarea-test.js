import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | legacy-textarea', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders a textarea', async function (assert) {
    await render(hbs`<LegacyTextarea />`);

    assert.dom('textarea').exists();
  });
});
