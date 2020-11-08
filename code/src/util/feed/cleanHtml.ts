import striptags from 'striptags';
import { AllHtmlEntities as entities } from 'html-entities';

export function cleanHtml(text: string, ampersandReplacement: string): string {
  let cleanedText: string;

  cleanedText = text;
  cleanedText = entities.decode(striptags(cleanedText));
  cleanedText = cleanedText.trim();
  cleanedText = cleanedText
    .replace(/[&]/g, ampersandReplacement)
    .replace(/[<>]/g, '');

  return cleanedText;
}
