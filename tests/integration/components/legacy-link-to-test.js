import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, setupOnerror } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import LinkComponent from '@ember/legacy-built-in-components/components/link-to';

module('Integration | Component | legacy-link-to', function (hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function () {
    // This will reset the error handler.
    setupOnerror();
  });

  test('it renders an a tag', async function (assert) {
    await render(hbs`<LinkTo @route="index" />`);

    assert.dom('a').exists();
  });

  test('assertLinkToOrigin is present and overridable', async function (assert) {
    assert.expect(1);

    const assertionString =
      'assertLinkToOrigin was overridden (which is good!)';

    class ExtendedLinkTo extends LinkComponent {
      assertLinkToOrigin = () => {
        throw new Error(assertionString);
      };
    }

    setupOnerror((error) => {
      assert.strictEqual(
        error.message,
        assertionString,
        'error is correctly throw'
      );
    });

    this.owner.register('component:extended-link-to', ExtendedLinkTo);

    await render(hbs`<ExtendedLinkTo @route="index" />`);
  });
});
