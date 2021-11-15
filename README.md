@ember/legacy-built-in-components
==============================================================================

Provides the legacy implementation of the `Checkbox`, `LinkComponent`,
`TextArea` and `TextField` component classes as specified in [RFC #671][rfc].

[rfc]: https://github.com/emberjs/rfcs/blob/master/text/0671-modernize-built-in-components-1.md

Compatibility
------------------------------------------------------------------------------

* Ember.js v3.20 or above
* Ember CLI v3.20 or above
* Node.js v12 or above


Installation
------------------------------------------------------------------------------

```
ember install @ember/legacy-built-in-components
```


Usage
------------------------------------------------------------------------------

```js
import {
  Checkbox,
  LinkComponent,
  TextArea,
  TextField
} from '@ember/legacy-built-in-components';

export const MyCheckbox = Checkbox.extend({ ... });
export const MyLink = LinkComponent.extend({ ... });
export const MyTextArea = TextArea.extend({ ... });
export const MyTextField = TextField.extend({ ... });
```

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
