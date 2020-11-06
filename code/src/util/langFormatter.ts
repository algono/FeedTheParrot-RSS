import util from 'util';
import { TFunction } from './localization';

export function getLangFormatter(t: TFunction): string {
  return `<voice name="${t('DEFAULT_VOICE')}"><lang xml:lang="${t(
    'DEFAULT_VOICE_LOCALE'
  )}">%s</lang></voice>`;
}

export function applyLangFormatter(target: string, langFormatter: string) {
  if (langFormatter) {
    return util.format(langFormatter, target);
  } else {
    return target;
  }
}
