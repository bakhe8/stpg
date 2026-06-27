export type TranslationValues = Record<string, string | number | Date>;

export type Translator = (
  key: string,
  values?: TranslationValues,
) => string;
