// Types for compiled templates
declare module '@ember/legacy-built-in-components/templates/*' {
  import { TemplateFactory } from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}
