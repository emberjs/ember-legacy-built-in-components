function intern(str: string): string {
  let obj = {};
  //@ts-ignore
  obj[str] = 1;
  for (let key in obj) {
    if (key === str) {
      return key;
    }
  }
  return str;
}

const GUID_KEY = intern(`__ember${Date.now()}`);

// `enumerableSymbol` copied from https://github.com/emberjs/ember.js/blob/master/packages/@ember/-internals/utils/lib/symbol.ts
// for not exported code these legacy components are dependant on.

// Some legacy symbols still need to be enumerable for a variety of reasons.
// This code exists for that, and as a fallback in IE11. In general, prefer
// `symbol` below when creating a new symbol.
function enumerableSymbol(debugName: string): string {
  let id = GUID_KEY + Math.floor(Math.random() * Date.now());
  let symbol = intern(`__${debugName}${id}__`);
  return symbol;
}

export const HAS_BLOCK = enumerableSymbol('HAS_BLOCK');

export function isSimpleClick(event: MouseEvent): boolean {
  let modifier =
    event.shiftKey || event.metaKey || event.altKey || event.ctrlKey;
  let secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

// export interface GlobalContext {
//   imports: object;
//   exports: object;
//   lookup: object;
// }

// /* globals global, window, self */
// declare const mainContext: object | undefined;

// // from lodash to catch fake globals
// function checkGlobal(value: any | null | undefined): value is object {
//   return value && value.Object === Object ? value : undefined;
// }

// // element ids can ruin global miss checks
// function checkElementIdShadowing(value: any | null | undefined) {
//   return value && value.nodeType === undefined ? value : undefined;
// }

// // export real global
// export default checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) ||
//   checkGlobal(typeof self === 'object' && self) ||
//   checkGlobal(typeof window === 'object' && window) ||
//   (typeof mainContext !== 'undefined' && mainContext) || // set before strict mode in Ember loader/wrapper
//   new Function('return this')(); // eval outside of strict mode

// // legacy imports/exports/lookup stuff (should we keep this??)
// export const context = (function (
//   global: object,
//   Ember: Partial<GlobalContext> | undefined
// ): GlobalContext {
//   return Ember === undefined
//     ? { imports: global, exports: global, lookup: global }
//     : {
//         // import jQuery
//         imports: Ember.imports || global,
//         // export Ember
//         exports: Ember.exports || global,
//         // search for Namespaces
//         lookup: Ember.lookup || global,
//       };
// })(global, global.Ember);
