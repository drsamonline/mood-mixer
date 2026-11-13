/* Mood Mixer style rules.
 * no-duplicate-selectors is off on purpose: the stylesheets are layered
 * (base layout, then component, then responsive/print overrides), and a later
 * block re-declaring a selector is how an override is written here. Merging
 * them would change cascade order for no gain.
 */
module.exports = {
  rules: {
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': [true, { ignore: ['consecutive-duplicates-with-different-values'] }],
    'declaration-block-no-shorthand-property-overrides': true,
    'font-family-no-duplicate-names': true,
    'function-calc-no-unspaced-operator': true,
    'no-duplicate-selectors': null,
    'no-invalid-double-slash-comments': true,
    'property-no-unknown': [true, { ignoreProperties: ['backdrop-filter', 'overscroll-behavior', 'print-color-adjust'] }],
    'selector-pseudo-class-no-unknown': true,
    'selector-pseudo-element-no-unknown': true,
    'string-no-newline': true,
    'unit-no-unknown': true,
    'at-rule-no-unknown': true,
    'shorthand-property-no-redundant-values': true
  }
};
