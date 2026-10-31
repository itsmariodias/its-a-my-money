// Date arithmetic goes through date-fns (see shared/dates.ts). The Date getters and setters are
// where hand-rolled date bugs come from — setMonth on the 31st rolled Sep 31 over to Oct 1.
const HAND_WRITTEN_DATE_LOGIC = {
  selector:
    'MemberExpression[property.name=/^(get|set)(UTC)?(FullYear|Month|Date|Day)$|^toLocaleDateString$/]',
  message: 'Use date-fns (and the helpers in shared/dates.ts) instead of Date getters/setters.',
};

module.exports = {
  extends: 'expo',
  ignorePatterns: ['dist/', 'android/', 'ios/'],
  rules: {
    'no-restricted-syntax': ['error', HAND_WRITTEN_DATE_LOGIC],
  },
};
