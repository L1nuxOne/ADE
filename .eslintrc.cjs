module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['legacy/*'],
          message: 'Do not import from legacy. Extract into packages first.',
        },
      ],
    }],
  },
  overrides: [
    {
      files: ['tools/migrate/**'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
