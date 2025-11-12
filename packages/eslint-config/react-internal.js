/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./base.js', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  env: { browser: true, es2020: true },
};