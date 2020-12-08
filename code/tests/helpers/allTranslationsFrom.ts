import { languageStrings } from '../../src/util/localization';

export async function allTranslationsFrom<T>(key: string) {
  return findAllByKey<T>(languageStrings, key);
}

function findAllByKey<T>(obj: object, keyToFind: string) {
  return Object.entries(obj).reduce<T[]>(
    (acc, [key, value]) =>
      key === keyToFind
        ? acc.concat(value)
        : typeof value === 'object'
        ? acc.concat(findAllByKey<T>(value, keyToFind))
        : acc,
    []
  );
}
