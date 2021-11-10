import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | legacy-link-to', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders an a tag', async function (assert) {
    await render(hbs`<LinkTo @route="index" />`);

    assert.dom('a').exists();
  });
});
