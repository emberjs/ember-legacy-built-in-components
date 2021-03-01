/* eslint-disable ember/no-jquery */
/* eslint-disable ember/require-tagless-components */
/* eslint-disable ember/no-classic-classes */
/* eslint-disable ember/no-test-module-for */
import {
  ApplicationTestCase,
  ModuleBasedTestResolver,
  moduleFor,
  runTask,
  expectDeprecation,
  expectDeprecationAsync,
  expectWarning,
} from '@ember/test-helpers';
import Controller, { inject as injectController } from '@ember/controller';
import { A as emberA, RSVP } from '@ember/-internals/runtime';
import { subscribe, reset } from '@ember/instrumentation';
import { Route, NoneLocation } from '@ember/-internals/routing';
import { EMBER_IMPROVED_INSTRUMENTATION } from '@ember/canary-features';
import Engine from '@ember/engine';
import { DEBUG } from '@glimmer/env';
import { compile } from '../../../utils/helpers';

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^/]+/, '');
}

function shouldNotBeActive(assert, element) {
  checkActive(assert, element, false);
}

function shouldBeActive(assert, element) {
  checkActive(assert, element, true);
}

function checkActive(assert, element, active) {
  let classList = element.attr('class');
  assert.equal(
    classList.indexOf('active') > -1,
    active,
    `${element} active should be ${active}`
  );
}

moduleFor(
  '{{link-to}} component (routing tests)',
  class extends ApplicationTestCase {
    constructor() {
      super();

      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index'}}Self{{/link-to}}</div>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <div id="home-link">{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
        `
      );
    }

    async ['@test it navigates into the named route'](assert) {
      await this.visit('/');

      assert.equal(
        this.$('h3.home').length,
        1,
        'The home template was rendered'
      );
      assert.equal(
        this.$('#self-link a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#about-link > a');

      assert.equal(
        this.$('h3.about').length,
        1,
        'The about template was rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test it doesn't add an href when the tagName isn't 'a'`](assert) {
      this.addTemplate(
        'index',
        `<div id='about-link'>{{#link-to route='about' tagName='div'}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.strictEqual(
        this.$('#about-link > div').attr('href'),
        null,
        'there is no href attribute'
      );
    }

    async [`@test it applies a 'disabled' class when disabled`](assert) {
      this.addTemplate(
        'index',
        `
        <div id="about-link-static">{{#link-to route="about" disabledWhen="shouldDisable"}}About{{/link-to}}</div>
        <div id="about-link-dynamic">{{#link-to route="about" disabledWhen=this.dynamicDisabledWhen}}About{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          shouldDisable = true;
          dynamicDisabledWhen = 'shouldDisable';
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link-static > a.disabled').length,
        1,
        'The static link is disabled when its disabledWhen is true'
      );
      assert.equal(
        this.$('#about-link-dynamic > a.disabled').length,
        1,
        'The dynamic link is disabled when its disabledWhen is true'
      );

      runTask(() => controller.set('dynamicDisabledWhen', false));

      assert.equal(
        this.$('#about-link-dynamic > a.disabled').length,
        0,
        'The dynamic link is re-enabled when its disabledWhen becomes false'
      );
    }

    async [`@test it doesn't apply a 'disabled' class if disabledWhen is not provided`](
      assert
    ) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about"}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.ok(
        !this.$('#about-link > a').hasClass('disabled'),
        'The link is not disabled if disabledWhen not provided'
      );
    }

    async [`@test it supports a custom disabledClass`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabledWhen=true disabledClass="do-not-want"}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link > a.do-not-want').length,
        1,
        'The link can apply a custom disabled class'
      );
    }

    async [`@test it supports a custom disabledClass set via bound param`](
      assert
    ) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabledWhen=true disabledClass=this.disabledClass}}About{{/link-to}}</div>`
      );

      this.add(
        'controller:index',
        class extends Controller {
          disabledClass = 'do-not-want';
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link > a.do-not-want').length,
        1,
        'The link can apply a custom disabled class via bound param'
      );
    }

    async [`@test it does not respond to clicks when disabledWhen`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabledWhen=true}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.$('h3.about').length,
        0,
        'Transitioning did not occur'
      );
    }

    async [`@test it does not respond to clicks when disabled`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabled=true}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.$('h3.about').length,
        0,
        'Transitioning did not occur'
      );
    }

    async [`@test it responds to clicks according to its disabledWhen bound param`](
      assert
    ) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabledWhen=this.disabledWhen}}About{{/link-to}}</div>`
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          disabledWhen = true;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.$('h3.about').length,
        0,
        'Transitioning did not occur'
      );

      runTask(() => controller.set('disabledWhen', false));

      await this.click('#about-link > a');

      assert.equal(
        this.$('h3.about').length,
        1,
        'Transitioning did occur when disabledWhen became false'
      );
    }

    async [`@test it supports a custom activeClass`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' activeClass='zomg-active'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index' activeClass='zomg-active'}}Self{{/link-to}}</div>
        `
      );

      await this.visit('/');

      assert.equal(
        this.$('h3.home').length,
        1,
        'The home template was rendered'
      );
      assert.equal(
        this.$('#self-link > a.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test it supports a custom activeClass from a bound param`](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' activeClass=this.activeClass}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index' activeClass=this.activeClass}}Self{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          activeClass = 'zomg-active';
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('h3.home').length,
        1,
        'The home template was rendered'
      );
      assert.equal(
        this.$('#self-link > a.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test [DEPRECATED] it supports 'classNameBindings' with custom values [GH #11699]`](
      assert
    ) {
      expectDeprecation(
        "Passing the `classNameBindings` property as an argument within templates has been deprecated. Instead, you can pass the class argument and use concatenation to produce the class value dynamically. ('my-app/templates/index.hbs' @ L3:C29) "
      );

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' classNameBindings='this.foo:foo-is-true:foo-is-false'}}About{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          foo = false;
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link > a.foo-is-false').length,
        1,
        'The about-link was rendered with the falsy class'
      );

      runTask(() => controller.set('foo', true));

      assert.equal(
        this.$('#about-link > a.foo-is-true').length,
        1,
        'The about-link was rendered with the truthy class after toggling the property'
      );
    }

    async ['@test Using {{link-to}} inside a non-routable engine errors'](
      assert
    ) {
      this.add(
        'engine:not-routable',
        class NotRoutableEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              compile(`{{#link-to route='about'}}About{{/link-to}}`, {
                moduleName: 'non-routable/templates/application.hbs',
              })
            );
          }
        }
      );

      this.addTemplate('index', `{{mount "not-routable"}}`);

      await assert.rejectsAssertion(
        this.visit('/'),
        'You attempted to use the <LinkTo> component within a routeless engine, this is not supported. ' +
          'If you are using the ember-engines addon, use the <LinkToExternal> component instead. ' +
          'See https://ember-engines.com/docs/links for more info.'
      );
    }

    async ['@test Using {{link-to}} inside a routable engine link within the engine'](
      assert
    ) {
      this.add(
        'engine:routable',
        class RoutableEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              compile(
                `
                <h2 id='engine-layout'>Routable Engine</h2>
                {{outlet}}
                <div id="engine-application-link">{{#link-to route='application'}}Engine Application{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/application.hbs',
                }
              )
            );
            this.register(
              'template:index',
              compile(
                `
                <h3 class='engine-home'>Engine Home</h3>
                <div id="engine-about-link">{{#link-to route='about'}}Engine About{{/link-to}}</div>
                <div id="engine-self-link">{{#link-to route='index'}}Engine Self{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/index.hbs',
                }
              )
            );
            this.register(
              'template:about',
              compile(
                `
                <h3 class='engine-about'>Engine About</h3>
                <div id="engine-home-link">{{#link-to route='index'}}Engine Home{{/link-to}}</div>
                <div id="engine-self-link">{{#link-to route='about'}}Engine Self{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/about.hbs',
                }
              )
            );
          }
        }
      );

      this.router.map(function () {
        this.mount('routable');
      });

      this.add('route-map:routable', function () {
        this.route('about');
      });

      this.addTemplate(
        'application',
        `
        <h1 id="application-layout">Application</h1>
        {{outlet}}
        <div id="application-link">{{#link-to route='application'}}Appliction{{/link-to}}</div>
        <div id="engine-link">{{#link-to route='routable'}}Engine{{/link-to}}</div>
        `
      );

      await this.visit('/');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.strictEqual(
        this.$('#engine-layout').length,
        0,
        'The engine layout was not rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(
        this.$('h3.home').length,
        1,
        'The application index page is rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application index link is active'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The application about link is not active'
      );

      await this.click('#about-link > a');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.strictEqual(
        this.$('#engine-layout').length,
        0,
        'The engine layout was not rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(
        this.$('h3.about').length,
        1,
        'The application about page is rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application about link is active'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The application home link is not active'
      );

      await this.click('#engine-link > a');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.equal(
        this.$('#engine-layout').length,
        1,
        'The engine layout was rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a.active').length,
        1,
        'The engine link is active'
      );
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(
        this.$('h3.engine-home').length,
        1,
        'The engine index page is rendered'
      );
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine index link is active'
      );
      assert.equal(
        this.$('#engine-about-link > a:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#engine-about-link > a');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.equal(
        this.$('#engine-layout').length,
        1,
        'The engine layout was rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a.active').length,
        1,
        'The engine link is active'
      );
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(
        this.$('h3.engine-about').length,
        1,
        'The engine about page is rendered'
      );
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine about link is active'
      );
      assert.equal(
        this.$('#engine-home-link > a:not(.active)').length,
        1,
        'The engine home link is not active'
      );

      await this.click('#engine-application-link > a');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.equal(
        this.$('#engine-layout').length,
        1,
        'The engine layout was rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a.active').length,
        1,
        'The engine link is active'
      );
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(
        this.$('h3.engine-home').length,
        1,
        'The engine index page is rendered'
      );
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine index link is active'
      );
      assert.equal(
        this.$('#engine-about-link > a:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#application-link > a');

      assert.equal(
        this.$('#application-layout').length,
        1,
        'The application layout was rendered'
      );
      assert.strictEqual(
        this.$('#engine-layout').length,
        0,
        'The engine layout was not rendered'
      );
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(
        this.$('h3.home').length,
        1,
        'The application index page is rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application index link is active'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The application about link is not active'
      );
    }
  }
);

moduleFor(
  '{{link-to}} component (routing tests - location hooks)',
  class extends ApplicationTestCase {
    constructor() {
      super();

      this.updateCount = 0;
      this.replaceCount = 0;

      let testContext = this;

      this.add(
        'location:none',
        class extends NoneLocation {
          setURL(...args) {
            testContext.updateCount++;
            return super.setURL(...args);
          }
          replaceURL(...args) {
            testContext.replaceCount++;
            return super.setURL(...args);
          }
        }
      );

      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index'}}Self{{/link-to}}</div>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <div id="home-link">{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
        `
      );
    }

    async visit(...args) {
      await super.visit(...args);

      this.updateCountAfterVisit = this.updateCount;
      this.replaceCountAfterVisit = this.replaceCount;
    }

    async ['@test it supports URL replacement'](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=true}}About{{/link-to}}</div>
        `
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.equal(
        this.updateCount,
        this.updateCountAfterVisit,
        'setURL should not be called'
      );
      assert.equal(
        this.replaceCount,
        this.replaceCountAfterVisit + 1,
        'replaceURL should be called once'
      );
    }

    async ['@test it supports URL replacement via replace=boundTruthyThing'](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=this.boundTruthyThing}}About{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundTruthyThing = true;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.equal(
        this.updateCount,
        this.updateCountAfterVisit,
        'setURL should not be called'
      );
      assert.equal(
        this.replaceCount,
        this.replaceCountAfterVisit + 1,
        'replaceURL should be called once'
      );
    }

    async ['@test it supports setting replace=boundFalseyThing'](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=this.boundFalseyThing}}About{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundFalseyThing = false;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.equal(
        this.updateCount,
        this.updateCountAfterVisit + 1,
        'setURL should be called'
      );
      assert.equal(
        this.replaceCount,
        this.replaceCountAfterVisit,
        'replaceURL should not be called'
      );
    }
  }
);

if (EMBER_IMPROVED_INSTRUMENTATION) {
  moduleFor(
    'The {{link-to}} component with EMBER_IMPROVED_INSTRUMENTATION',
    class extends ApplicationTestCase {
      constructor() {
        super();

        this.router.map(function () {
          this.route('about');
        });

        this.addTemplate(
          'index',
          `
          <h3 class="home">Home</h3>
          <div id="about-link">{{#link-to route='about'}}About{{/link-to}}</div>
          <div id="self-link">{{#link-to route='index'}}Self{{/link-to}}</div>
          `
        );
        this.addTemplate(
          'about',
          `
          <h3 class="about">About</h3>
          <div id="home-link">{{#link-to route='index'}}Home{{/link-to}}</div>
          <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
          `
        );
      }

      beforeEach() {
        return this.visit('/');
      }

      afterEach() {
        reset();

        return super.afterEach();
      }

      async ['@test it fires an interaction event'](assert) {
        let before = 0;
        let after = 0;

        subscribe('interaction.link-to', {
          before() {
            before++;
          },
          after() {
            after++;
          },
        });

        assert.strictEqual(
          before,
          0,
          'instrumentation subscriber (before) was not called'
        );
        assert.strictEqual(
          after,
          0,
          'instrumentation subscriber (after) was not called'
        );

        await this.click('#about-link > a');

        assert.strictEqual(
          before,
          1,
          'instrumentation subscriber (before) was called'
        );
        assert.strictEqual(
          after,
          1,
          'instrumentation subscriber (after) was called'
        );
      }

      async ['@test it interaction event includes the route name and transition object'](
        assert
      ) {
        let before = 0;
        let after = 0;

        subscribe('interaction.link-to', {
          before(name, timestamp, { routeName }) {
            before++;
            assert.equal(
              routeName,
              'about',
              'instrumentation subscriber was passed route name'
            );
          },
          after(name, timestamp, { routeName, transition }) {
            after++;
            assert.equal(
              routeName,
              'about',
              'instrumentation subscriber was passed route name'
            );
            assert.equal(
              transition.targetName,
              'about',
              'instrumentation subscriber was passed transition object in the after hook'
            );
          },
        });

        assert.strictEqual(
          before,
          0,
          'instrumentation subscriber (before) was not called'
        );
        assert.strictEqual(
          after,
          0,
          'instrumentation subscriber (after) was not called'
        );

        await this.click('#about-link > a');

        assert.strictEqual(
          before,
          1,
          'instrumentation subscriber (before) was called'
        );
        assert.strictEqual(
          after,
          1,
          'instrumentation subscriber (after) was called'
        );
      }
    }
  );
}

moduleFor(
  'The {{link-to}} component - nested routes and link-to arguments',
  class extends ApplicationTestCase {
    async ['@test it supports leaving off .index for nested routes'](assert) {
      this.router.map(function () {
        this.route('about', function () {
          this.route('item');
        });
      });

      this.addTemplate('about', `<h1>About</h1>{{outlet}}`);
      this.addTemplate('about.index', `<div id='index'>Index</div>`);
      this.addTemplate(
        'about.item',
        `<div id='item'>{{#link-to route='about'}}About{{/link-to}}</div>`
      );

      await this.visit('/about/item');

      assert.equal(normalizeUrl(this.$('#item a').attr('href')), '/about');
    }

    async [`@test it supports custom, nested, current-when`](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('item');
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='item' current-when='index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active since current-when is a parent route'
      );
    }

    async [`@test it does not disregard current-when when it is given explicitly for a route`](
      assert
    ) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('items', function () {
          this.route('item');
        });
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='items' current-when='index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active when current-when is given for explicitly for a route'
      );
    }

    async ['@test it does not disregard current-when when it is set via a bound param'](
      assert
    ) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('items', function () {
          this.route('item');
        });
      });

      this.add(
        'controller:index.about',
        class extends Controller {
          currentWhen = 'index';
        }
      );

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='items' current-when=this.currentWhen}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active when current-when is given for explicitly for a route'
      );
    }

    async ['@test it supports multiple current-when routes'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });
        this.route('item');
        this.route('foo');
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="link1">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );
      this.addTemplate(
        'item',
        `<div id="link2">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );
      this.addTemplate(
        'foo',
        `<div id="link3">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#link1 > a.active').length,
        1,
        'The link is active since current-when contains the parent route'
      );

      await this.visit('/item');

      assert.equal(
        this.$('#link2 > a.active').length,
        1,
        'The link is active since you are on the active route'
      );

      await this.visit('/foo');

      assert.equal(
        this.$('#link3 > a.active').length,
        0,
        'The link is not active since current-when does not contain the active route'
      );
    }

    async ['@test it supports boolean values for current-when'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });
        this.route('item');
      });

      this.addTemplate(
        'index.about',
        `
        <div id="index-link">{{#link-to route='index' current-when=this.isCurrent}}index{{/link-to}}</div>
        <div id="about-link">{{#link-to route='item' current-when=true}}ITEM{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index.about',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          isCurrent = false;
        }
      );

      await this.visit('/about');

      assert.ok(
        this.$('#about-link > a').hasClass('active'),
        'The link is active since current-when is true'
      );
      assert.notOk(
        this.$('#index-link > a').hasClass('active'),
        'The link is not active since current-when is false'
      );

      runTask(() => controller.set('isCurrent', true));

      assert.ok(
        this.$('#index-link > a').hasClass('active'),
        'The link is active since current-when is true'
      );
    }

    async ['@test it defaults to bubbling'](assert) {
      this.addTemplate(
        'about',
        `
        <div {{action this.hide}}>
          <div id="about-contact">{{#link-to route='about.contact'}}About{{/link-to}}</div>
        </div>
        {{outlet}}
        `
      );

      this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

      this.router.map(function () {
        this.route('about', function () {
          this.route('contact');
        });
      });

      let hidden = 0;

      this.add(
        'controller:about',
        class extends Controller {
          hide() {
            hidden++;
          }
        }
      );

      await this.visit('/about');

      await this.click('#about-contact > a');

      assert.equal(
        this.$('#contact').text(),
        'Contact',
        'precond - the link worked'
      );

      assert.equal(hidden, 1, 'The link bubbles');
    }

    async [`@test it supports bubbles=false`](assert) {
      this.addTemplate(
        'about',
        `
        <div id='about-contact' {{action this.hide}}>
          {{#link-to route='about.contact' bubbles=false}}
            About
          {{/link-to}}
        </div>
        {{outlet}}
        `
      );

      this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

      this.router.map(function () {
        this.route('about', function () {
          this.route('contact');
        });
      });

      let hidden = 0;

      this.add(
        'controller:about',
        class extends Controller {
          hide() {
            hidden++;
          }
        }
      );

      await this.visit('/about');

      await this.click('#about-contact > a');

      assert.equal(
        this.$('#contact').text(),
        'Contact',
        'precond - the link worked'
      );

      assert.strictEqual(hidden, 0, "The link didn't bubble");
    }

    async [`@test it supports bubbles=boundFalseyThing`](assert) {
      this.addTemplate(
        'about',
        `
        <div id='about-contact' {{action this.hide}}>
          {{#link-to route='about.contact' bubbles=this.boundFalseyThing}}
            About
          {{/link-to}}
        </div>
        {{outlet}}
        `
      );

      this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

      let hidden = 0;

      this.add(
        'controller:about',
        class extends Controller {
          boundFalseyThing = false;

          hide() {
            hidden++;
          }
        }
      );

      this.router.map(function () {
        this.route('about', function () {
          this.route('contact');
        });
      });

      await this.visit('/about');

      await this.click('#about-contact > a');

      assert.equal(
        this.$('#contact').text(),
        'Contact',
        'precond - the link worked'
      );
      assert.strictEqual(hidden, 0, "The link didn't bubble");
    }

    async [`@test it moves into the named route with context`](assert) {
      this.router.map(function () {
        this.route('about');
        this.route('item', { path: '/item/:id' });
      });

      this.addTemplate(
        'about',
        `
        <h3 class="list">List</h3>
        <ul>
          {{#each @model as |person|}}
            <li id={{person.id}}>
              {{#link-to route='item' model=person}}
                {{person.name}}
              {{/link-to}}
            </li>
          {{/each}}
        </ul>
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        `
      );

      this.addTemplate(
        'item',
        `
        <h3 class="item">Item</h3>
        <p>{{@model.name}}</p>
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        `
      );

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>
        `
      );

      this.add(
        'route:about',
        Route.extend({
          model() {
            return [
              { id: 'yehuda', name: 'Yehuda Katz' },
              { id: 'tom', name: 'Tom Dale' },
              { id: 'erik', name: 'Erik Brynroflsson' },
            ];
          },
        })
      );

      await this.visit('/about');

      assert.equal(
        this.$('h3.list').length,
        1,
        'The home template was rendered'
      );
      assert.equal(
        normalizeUrl(this.$('#home-link > a').attr('href')),
        '/',
        'The home link points back at /'
      );

      await this.click('#yehuda > a');

      assert.equal(
        this.$('h3.item').length,
        1,
        'The item template was rendered'
      );
      assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

      await this.click('#home-link > a');

      await this.click('#about-link > a');

      assert.equal(
        normalizeUrl(this.$('li#yehuda > a').attr('href')),
        '/item/yehuda'
      );
      assert.equal(
        normalizeUrl(this.$('li#tom > a').attr('href')),
        '/item/tom'
      );
      assert.equal(
        normalizeUrl(this.$('li#erik > a').attr('href')),
        '/item/erik'
      );

      await this.click('#erik > a');

      assert.equal(
        this.$('h3.item').length,
        1,
        'The item template was rendered'
      );
      assert.equal(
        this.$('p').text(),
        'Erik Brynroflsson',
        'The name is correct'
      );
    }

    async [`@test it binds some anchor html tag common attributes`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        {{#link-to route='index' id='self-link' title='title-attr' rel='rel-attr' tabindex='-1'}}
          Self
        {{/link-to}}
        `
      );

      await this.visit('/');

      let link = this.$('#self-link');
      assert.equal(
        link.attr('title'),
        'title-attr',
        'The self-link contains title attribute'
      );
      assert.equal(
        link.attr('rel'),
        'rel-attr',
        'The self-link contains rel attribute'
      );
      assert.equal(
        link.attr('tabindex'),
        '-1',
        'The self-link contains tabindex attribute'
      );
    }

    async [`@test it supports 'target' attribute`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id='self-link'>{{#link-to route='index' target='_blank'}}Self{{/link-to}}</div>
        `
      );

      await this.visit('/');

      let link = this.$('#self-link > a');
      assert.equal(
        link.attr('target'),
        '_blank',
        'The self-link contains `target` attribute'
      );
    }

    async [`@test it supports 'target' attribute specified as a bound param`](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id='self-link'>{{#link-to route='index' target=this.boundLinkTarget}}Self{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundLinkTarget = '_blank';
        }
      );

      await this.visit('/');

      let link = this.$('#self-link > a');
      assert.equal(
        link.attr('target'),
        '_blank',
        'The self-link contains `target` attribute'
      );
    }

    async [`@test it calls preventDefault`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `<div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assertNav(
        { prevented: true },
        () => this.$('#about-link > a').click(),
        assert
      );
    }

    async [`@test it does not call preventDefault if 'preventDefault=false' is passed as an option`](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `<div id='about-link'>{{#link-to route='about' preventDefault=false}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assertNav(
        { prevented: false },
        () => this.$('#about-link > a').trigger('click'),
        assert
      );
    }

    async [`@test it does not call preventDefault if 'preventDefault=this.boundFalseyThing' is passed as an option`](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `<div id='about-link'>{{#link-to route='about' preventDefault=this.boundFalseyThing}}About{{/link-to}}</div>`
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundFalseyThing = false;
        }
      );

      await this.visit('/');

      assertNav(
        { prevented: false },
        () => this.$('#about-link > a').trigger('click'),
        assert
      );
    }

    [`@test The {{link-to}} component does not call preventDefault if 'target' attribute is provided`](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        {{#link-to route='index' id='self-link' target='_blank'}}Self{{/link-to}}
        `
      );

      return this.visit('/').then(() => {
        assertNav(
          { prevented: false },
          () => this.$('#self-link').click(),
          assert
        );
      });
    }

    [`@test The {{link-to}} component should preventDefault when 'target = _self'`](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        {{#link-to route='index' id='self-link' target='_self'}}Self{{/link-to}}
        `
      );

      return this.visit('/').then(() => {
        assertNav(
          { prevented: true },
          () => this.$('#self-link').click(),
          assert
        );
      });
    }

    async [`@test it should not transition if target is not equal to _self or empty`](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <div id='about-link'>
          {{#link-to route='about' replace=true target='_blank'}}
            About
          {{/link-to}}
        </div>
        `
      );

      this.router.map(function () {
        this.route('about');
      });

      await this.visit('/');

      await this.click('#about-link > a');

      expectDeprecation(() => {
        let currentRouteName = this.applicationInstance
          .lookup('controller:application')
          .get('currentRouteName');
        assert.notEqual(
          currentRouteName,
          'about',
          'link-to should not transition if target is not equal to _self or empty'
        );
      }, 'Accessing `currentRouteName` on `controller:application` is deprecated, use the `currentRouteName` property on `service:router` instead.');
    }

    async [`@test it accepts string/numeric arguments`](assert) {
      this.router.map(function () {
        this.route('filter', { path: '/filters/:filter' });
        this.route('post', { path: '/post/:post_id' });
        this.route('repo', { path: '/repo/:owner/:name' });
      });

      this.add(
        'controller:filter',
        class extends Controller {
          filter = 'unpopular';
          repo = { owner: 'ember', name: 'ember.js' };
          post_id = 123;
        }
      );

      this.addTemplate(
        'filter',
        `
        <p>{{this.filter}}</p>
        <div id="link">{{#link-to route="filter" model="unpopular"}}Unpopular{{/link-to}}</div>
        <div id="path-link">{{#link-to route="filter" model=this.filter}}Unpopular{{/link-to}}</div>
        <div id="post-path-link">{{#link-to route="post" model=this.post_id}}Post{{/link-to}}</div>
        <div id="post-number-link">{{#link-to route="post" model=123}}Post{{/link-to}}</div>
        <div id="repo-object-link">{{#link-to route="repo" model=this.repo}}Repo{{/link-to}}</div>
        `
      );

      await this.visit('/filters/popular');

      assert.equal(
        normalizeUrl(this.$('#link > a').attr('href')),
        '/filters/unpopular'
      );
      assert.equal(
        normalizeUrl(this.$('#path-link > a').attr('href')),
        '/filters/unpopular'
      );
      assert.equal(
        normalizeUrl(this.$('#post-path-link > a').attr('href')),
        '/post/123'
      );
      assert.equal(
        normalizeUrl(this.$('#post-number-link > a').attr('href')),
        '/post/123'
      );
      assert.equal(
        normalizeUrl(this.$('#repo-object-link > a').attr('href')),
        '/repo/ember/ember.js'
      );
    }

    async [`@test [GH#4201] Shorthand for route.index shouldn't throw errors about context arguments`](
      assert
    ) {
      this.router.map(function () {
        this.route('lobby', function () {
          this.route('index', { path: ':lobby_id' });
          this.route('list');
        });
      });

      this.add(
        'route:lobby.index',
        class extends Route {
          model(params) {
            assert.equal(params.lobby_id, 'foobar');
            return params.lobby_id;
          }
        }
      );

      this.addTemplate(
        'lobby.index',
        `<div id='lobby-link'>{{#link-to route='lobby' model='foobar'}}Lobby{{/link-to}}</div>`
      );

      this.addTemplate(
        'lobby.list',
        `<div id='lobby-link'>{{#link-to route='lobby' model='foobar'}}Lobby{{/link-to}}</div>`
      );

      await this.visit('/lobby/list');

      await this.click('#lobby-link > a');

      shouldBeActive(assert, this.$('#lobby-link > a'));
    }

    async [`@test Quoteless route param performs property lookup`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <div id='string-link'>{{#link-to route='index'}}string{{/link-to}}</div>
        <div id='path-link'>{{#link-to route=this.foo}}path{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          foo = 'index';
        }
      );

      let assertEquality = (href) => {
        assert.equal(
          normalizeUrl(this.$('#string-link > a').attr('href')),
          '/'
        );
        assert.equal(normalizeUrl(this.$('#path-link > a').attr('href')), href);
      };

      await this.visit('/');

      assertEquality('/');

      runTask(() => controller.set('foo', 'about'));

      assertEquality('/about');
    }

    async [`@test it refreshes href element when one of params changes`](
      assert
    ) {
      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });

      let post = { id: '1' };
      let secondPost = { id: '2' };

      this.addTemplate(
        'index',
        `<div id="post">{{#link-to route="post" model=this.post}}post{{/link-to}}</div>`
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }
        }
      );

      await this.visit('/');

      runTask(() => controller.set('post', post));

      assert.equal(
        normalizeUrl(this.$('#post > a').attr('href')),
        '/posts/1',
        'precond - Link has rendered href attr properly'
      );

      runTask(() => controller.set('post', secondPost));

      assert.equal(
        this.$('#post > a').attr('href'),
        '/posts/2',
        'href attr was updated after one of the params had been changed'
      );

      runTask(() => controller.set('post', null));

      assert.equal(
        this.$('#post > a').attr('href'),
        '#',
        'href attr becomes # when one of the arguments in nullified'
      );
    }

    async [`@test it is active when a route is active`](assert) {
      this.router.map(function () {
        this.route('about', function () {
          this.route('item');
        });
      });

      this.addTemplate(
        'about',
        `
        <div id='about'>
          <div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>
          <div id='item-link'>{{#link-to route='about.item'}}Item{{/link-to}}</div>
          {{outlet}}
        </div>
        `
      );

      await this.visit('/about');

      assert.equal(
        this.$('#about-link > a.active').length,
        1,
        'The about route link is active'
      );
      assert.equal(
        this.$('#item-link > a.active').length,
        0,
        'The item route link is inactive'
      );

      await this.visit('/about/item');

      assert.equal(
        this.$('#about-link > a.active').length,
        1,
        'The about route link is active'
      );
      assert.equal(
        this.$('#item-link > a.active').length,
        1,
        'The item route link is active'
      );
    }

    async [`@test it works in an #each'd array of string route names`](assert) {
      this.router.map(function () {
        this.route('foo');
        this.route('bar');
        this.route('rar');
      });

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          routeNames = emberA(['foo', 'bar', 'rar']);
          route1 = 'bar';
          route2 = 'foo';
        }
      );

      this.addTemplate(
        'index',
        `
        {{#each this.routeNames as |routeName|}}
          {{#link-to route=routeName}}{{routeName}}{{/link-to}}
        {{/each}}
        {{#each this.routeNames as |r|}}
          {{#link-to route=r}}{{r}}{{/link-to}}
        {{/each}}
        {{#link-to route=this.route1}}a{{/link-to}}
        {{#link-to route=this.route2}}b{{/link-to}}
        `
      );

      let linksEqual = (links, expected) => {
        assert.equal(
          links.length,
          expected.length,
          'Has correct number of links'
        );

        let idx;
        for (idx = 0; idx < links.length; idx++) {
          let href = this.$(links[idx]).attr('href');
          // Old IE includes the whole hostname as well
          assert.equal(
            href.slice(-expected[idx].length),
            expected[idx],
            `Expected link to be '${expected[idx]}', but was '${href}'`
          );
        }
      };

      await this.visit('/');

      linksEqual(this.$('a'), [
        '/foo',
        '/bar',
        '/rar',
        '/foo',
        '/bar',
        '/rar',
        '/bar',
        '/foo',
      ]);

      runTask(() => controller.set('route1', 'rar'));

      linksEqual(this.$('a'), [
        '/foo',
        '/bar',
        '/rar',
        '/foo',
        '/bar',
        '/rar',
        '/rar',
        '/foo',
      ]);

      runTask(() => controller.routeNames.shiftObject());

      linksEqual(this.$('a'), ['/bar', '/rar', '/bar', '/rar', '/rar', '/foo']);
    }

    async [`@test [DEPRECATED] The non-block form {{link-to}} component moves into the named route`](
      assert
    ) {
      this.router.map(function () {
        this.route('contact');
      });

      expectDeprecation(() => {
        this.addTemplate(
          'index',
          `
          <h3 class="home">Home</h3>
          <div id='contact-link'>{{link-to 'Contact us' 'contact'}}</div>
          <div id='self-link'>{{#link-to route='index'}}Self{{/link-to}}</div>
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.addTemplate(
          'contact',
          `
          <h3 class="contact">Contact</h3>
          <div id='home-link'>{{link-to 'Home' 'index'}}</div>
          <div id='self-link'>{{link-to 'Self' 'contact'}}</div>
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      await this.visit('/');

      await this.click('#contact-link > a');

      assert.equal(
        this.$('h3.contact').length,
        1,
        'The contact template was rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test [DEPRECATED] The non-block form {{link-to}} component updates the link text when it is a binding`](
      assert
    ) {
      this.router.map(function () {
        this.route('contact');
      });

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          contactName = 'Jane';
        }
      );

      expectDeprecation(() => {
        this.addTemplate(
          'index',
          `
          <h3 class="home">Home</h3>
          <div id='contact-link'>{{link-to this.contactName 'contact'}}</div>
          <div id='self-link'>{{#link-to route='index'}}Self{{/link-to}}</div>
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.addTemplate(
          'contact',
          `
          <h3 class="contact">Contact</h3>
          <div id='home-link'>{{link-to 'Home' 'index'}}</div>
          <div id='self-link'>{{link-to 'Self' 'contact'}}</div>
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      await this.visit('/');

      assert.equal(
        this.$('#contact-link > a').text(),
        'Jane',
        'The link title is correctly resolved'
      );

      runTask(() => controller.set('contactName', 'Joe'));

      assert.equal(
        this.$('#contact-link > a').text(),
        'Joe',
        'The link title is correctly updated when the bound property changes'
      );

      runTask(() => controller.set('contactName', 'Robert'));

      assert.equal(
        this.$('#contact-link > a').text(),
        'Robert',
        'The link title is correctly updated when the bound property changes a second time'
      );

      await this.click('#contact-link > a');

      assert.equal(
        this.$('h3.contact').length,
        1,
        'The contact template was rendered'
      );
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#home-link > a');

      assert.equal(
        this.$('h3.home').length,
        1,
        'The index template was rendered'
      );
      assert.equal(
        this.$('#contact-link > a').text(),
        'Robert',
        'The link title is correctly updated when the route changes'
      );
    }

    async [`@test [DEPRECATED] The non-block form {{link-to}} component moves into the named route with context`](
      assert
    ) {
      this.router.map(function () {
        this.route('item', { path: '/item/:id' });
      });

      this.add(
        'route:index',
        class extends Route {
          model() {
            return [
              { id: 'yehuda', name: 'Yehuda Katz' },
              { id: 'tom', name: 'Tom Dale' },
              { id: 'erik', name: 'Erik Brynroflsson' },
            ];
          }
        }
      );

      expectDeprecation(() => {
        this.addTemplate(
          'index',
          `
          <h3 class="home">Home</h3>
          <ul>
            {{#each @model as |person|}}
              <li id={{person.id}}>
                {{link-to person.name 'item' person}}
              </li>
            {{/each}}
          </ul>
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      this.addTemplate(
        'item',
        `
        <h3 class="item">Item</h3>
        <p>{{@model.name}}</p>
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        `
      );

      await this.visit('/');

      await this.click('#yehuda > a');

      assert.equal(
        this.$('h3.item').length,
        1,
        'The item template was rendered'
      );
      assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

      await this.click('#home-link > a');

      assert.equal(
        normalizeUrl(this.$('li#yehuda > a').attr('href')),
        '/item/yehuda'
      );
      assert.equal(
        normalizeUrl(this.$('li#tom > a').attr('href')),
        '/item/tom'
      );
      assert.equal(
        normalizeUrl(this.$('li#erik > a').attr('href')),
        '/item/erik'
      );
    }

    async [`@test [DEPRECATED] The non-block form {{link-to}} performs property lookup`](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      expectDeprecation(() => {
        this.addTemplate(
          'index',
          `
          {{link-to 'string' 'index' id='string-link'}}
          {{link-to this.path this.foo id='path-link'}}
          `
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          foo = 'index';
        }
      );

      await this.visit('/');

      let assertEquality = (href) => {
        assert.equal(normalizeUrl(this.$('#string-link').attr('href')), '/');
        assert.equal(normalizeUrl(this.$('#path-link').attr('href')), href);
      };

      assertEquality('/');

      runTask(() => controller.set('foo', 'about'));

      assertEquality('/about');
    }

    async [`@test [DEPRECATED] The non-block form {{link-to}} protects against XSS`](
      assert
    ) {
      expectDeprecation(() => {
        this.addTemplate(
          'application',
          `{{link-to this.display 'index' id='link'}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      let controller;

      this.add(
        'controller:application',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          display = 'blahzorz';
        }
      );

      await this.visit('/');

      assert.equal(this.$('#link').text(), 'blahzorz');

      runTask(() => controller.set('display', '<b>BLAMMO</b>'));

      assert.equal(this.$('#link').text(), '<b>BLAMMO</b>');
      assert.strictEqual(this.$('b').length, 0);
    }

    async [`@test it throws a useful error if you invoke it wrong`](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      this.router.map(function () {
        this.route('post', { path: 'post/:post_id' });
      });

      this.addTemplate(
        'application',
        `{{#link-to route='post'}}Post{{/link-to}}`
      );

      return assert.rejectsAssertion(
        this.visit('/'),
        /(You attempted to define a `\{\{link-to "post"\}\}` but did not pass the parameters required for generating its dynamic segments.|You must provide param `post_id` to `generate`)/
      );
    }

    async [`@test it does not throw an error if its route has exited`](assert) {
      assert.expect(0);

      this.router.map(function () {
        this.route('post', { path: 'post/:post_id' });
      });

      this.addTemplate(
        'application',
        `
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id='default-post-link'>{{#link-to route='post' model=this.defaultPost}}Default Post{{/link-to}}</div>
        {{#if this.currentPost}}
          <div id='current-post-link'>{{#link-to route='post' model=this.currentPost}}Current Post{{/link-to}}</div>
        {{/if}}
        `
      );

      this.add(
        'controller:application',
        class extends Controller {
          defaultPost = { id: 1 };

          @injectController('post') postController;

          get currentPost() {
            return this.postController.model;
          }
        }
      );

      this.add('controller:post', class extends Controller {});

      this.add(
        'route:post',
        class extends Route {
          model() {
            return { id: 2 };
          }
          serialize(model) {
            return { post_id: model.id };
          }
        }
      );

      await this.visit('/');
      await this.click('#default-post-link > a');
      await this.click('#home-link > a');
      await this.click('#current-post-link > a');
      await this.click('#home-link > a');
    }

    async [`@test its active property respects changing parent route context`](
      assert
    ) {
      this.router.map(function () {
        this.route('things', { path: '/things/:name' }, function () {
          this.route('other');
        });
      });

      this.addTemplate(
        'application',
        `
        <div id='omg-link'>{{#link-to route='things' model='omg'}}OMG{{/link-to}}</div>
        <div id='lol-link'>{{#link-to route='things' model='lol'}}LOL{{/link-to}}</div>
        `
      );

      await this.visit('/things/omg');

      shouldBeActive(assert, this.$('#omg-link > a'));
      shouldNotBeActive(assert, this.$('#lol-link > a'));

      await this.visit('/things/omg/other');

      shouldBeActive(assert, this.$('#omg-link > a'));
      shouldNotBeActive(assert, this.$('#lol-link > a'));
    }

    async [`@test it populates href with default query param values even without query-params object`](
      assert
    ) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['foo'];
          foo = '123';
        }
      );

      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index'}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/',
        'link has right href'
      );
    }

    async [`@test it populates href with default query param values with empty query-params object`](
      assert
    ) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['foo'];
          foo = '123';
        }
      );

      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index' query=(hash)}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/',
        'link has right href'
      );
    }

    async [`@test it updates when route changes with only query-params and a block`](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      this.add(
        'controller:application',
        class extends Controller {
          queryParams = ['foo', 'bar'];
          foo = '123';
          bar = 'yes';
        }
      );

      this.addTemplate(
        'application',
        `<div id='the-link'>{{#link-to query=(hash foo='456' bar='NAW')}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/?bar=NAW&foo=456',
        'link has right href'
      );

      await this.visit('/about');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/about?bar=NAW&foo=456',
        'link has right href'
      );
    }

    async [`@test [DEPRECATED] it updates when route changes with only query-params but without a block`](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      this.add(
        'controller:application',
        Controller.extend({
          queryParams: ['foo', 'bar'],
          foo: '123',
          bar: 'yes',
        })
      );

      expectDeprecation(() => {
        this.addTemplate(
          'application',
          `<div id='the-link'>{{link-to "Index" (query-params foo='456' bar='NAW')}}</div>`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      await this.visit('/');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/?bar=NAW&foo=456',
        'link has right href'
      );

      await this.visit('/about');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/about?bar=NAW&foo=456',
        'link has right href'
      );
    }

    async ['@test [GH#17018] passing model to {{link-to}} with `hash` helper works']() {
      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });

      this.add(
        'route:index',
        class extends Route {
          model() {
            return RSVP.hash({
              user: { name: 'Papa Smurf' },
            });
          }
        }
      );

      this.addTemplate(
        'index',
        `{{#link-to route='post' model=(hash id="someId" user=@model.user)}}Post{{/link-to}}`
      );

      this.addTemplate('post', 'Post: {{@model.user.name}}');

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/posts/someId' },
        content: 'Post',
      });

      await this.click('a');

      this.assertText('Post: Papa Smurf');
    }

    async [`@test [DEPRECATED] The {{link-to}} component can use dynamic params`](
      assert
    ) {
      this.router.map(function () {
        this.route('foo', { path: 'foo/:some/:thing' });
        this.route('bar', { path: 'bar/:some/:thing/:else' });
      });

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          dynamicLinkParams = ['foo', 'one', 'two'];
        }
      );

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="dynamic-link">{{#link-to params=this.dynamicLinkParams}}Dynamic{{/link-to}}</div>
        `
      );

      await expectDeprecationAsync(
        () => this.visit('/'),
        /Invoking the `<LinkTo>` component with positional arguments is deprecated/
      );

      let link = this.$('#dynamic-link > a');

      assert.equal(link.attr('href'), '/foo/one/two');

      expectDeprecation(
        () =>
          runTask(() =>
            controller.set('dynamicLinkParams', ['bar', 'one', 'two', 'three'])
          ),
        /Invoking the `<LinkTo>` component with positional arguments is deprecated/
      );

      assert.equal(link.attr('href'), '/bar/one/two/three');
    }

    async [`@test [GH#13256]: {{link-to}} to a parent root model hook which performs a 'transitionTo' has correct active class`](
      assert
    ) {
      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      this.add(
        'route:parent',
        class extends Route {
          afterModel() {
            expectDeprecation(() => {
              this.transitionTo('parent.child');
            }, /Calling transitionTo on a route is deprecated/);
          }
        }
      );

      this.addTemplate(
        'application',
        `<div id='parent-link'>{{#link-to route='parent'}}Parent{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#parent-link > a');

      shouldBeActive(assert, this.$('#parent-link > a'));
    }
  }
);

moduleFor(
  'The {{link-to}} component - loading states and warnings',
  class extends ApplicationTestCase {
    async [`@test {{link-to}} with null/undefined dynamic parameters are put in a loading state`](
      assert
    ) {
      let warningMessage =
        'This link is in an inactive loading state because at least one of its models currently has a null/undefined value, or the provided route name is invalid.';

      this.router.map(function () {
        this.route('thing', { path: '/thing/:thing_id' });
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <div id='context-link'>
          {{#link-to route=this.destinationRoute model=this.routeContext loadingClass='i-am-loading'}}
            string
          {{/link-to}}
        </div>
        <div id='static-link'>
          {{#link-to route=this.secondRoute loadingClass=this.loadingClass}}
            string
          {{/link-to}}
        </div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          destinationRoute = null;
          routeContext = null;
          loadingClass = 'i-am-loading';
        }
      );

      let activate = 0;

      this.add(
        'route:about',
        class extends Route {
          activate() {
            activate++;
          }
        }
      );

      function assertLinkStatus(link, url) {
        if (url) {
          assert.equal(
            normalizeUrl(link.attr('href')),
            url,
            'loaded link-to has expected href'
          );
          assert.ok(
            !link.hasClass('i-am-loading'),
            'loaded linkComponent has no loadingClass'
          );
        } else {
          assert.equal(
            normalizeUrl(link.attr('href')),
            '#',
            "unloaded link-to has href='#'"
          );
          assert.ok(
            link.hasClass('i-am-loading'),
            'loading linkComponent has loadingClass'
          );
        }
      }

      await this.visit('/');

      let contextLink = this.$('#context-link > a');
      let staticLink = this.$('#static-link > a');

      assertLinkStatus(contextLink);
      assertLinkStatus(staticLink);

      await expectWarning(() => this.click(contextLink[0]), warningMessage);

      // Set the destinationRoute (context is still null).
      runTask(() => controller.set('destinationRoute', 'thing'));
      assertLinkStatus(contextLink);

      // Set the routeContext to an id
      runTask(() => controller.set('routeContext', '456'));
      assertLinkStatus(contextLink, '/thing/456');

      // Test that 0 isn't interpreted as falsy.
      runTask(() => controller.set('routeContext', 0));
      assertLinkStatus(contextLink, '/thing/0');

      // Set the routeContext to an object
      runTask(() => controller.set('routeContext', { id: 123 }));
      assertLinkStatus(contextLink, '/thing/123');

      // Set the destinationRoute back to null.
      runTask(() => controller.set('destinationRoute', null));
      assertLinkStatus(contextLink);

      await expectWarning(() => this.click(staticLink[0]), warningMessage);

      runTask(() => controller.set('secondRoute', 'about'));
      assertLinkStatus(staticLink, '/about');

      // Click the now-active link
      await this.click(staticLink[0]);

      assert.equal(activate, 1, 'About route was entered');
    }
  }
);

function assertNav(options, callback, assert) {
  let nav = false;

  function check(event) {
    assert.equal(
      event.defaultPrevented,
      options.prevented,
      `expected defaultPrevented=${options.prevented}`
    );
    nav = true;
    event.preventDefault();
  }

  try {
    document.addEventListener('click', check);
    callback();
  } finally {
    document.removeEventListener('click', check);
    assert.ok(nav, 'Expected a link to be clicked');
  }
}