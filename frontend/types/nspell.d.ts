declare module "nspell" {
  export interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): string[];
    add(word: string, model?: string): NSpell;
    remove(word: string): NSpell;
    wordCharacters(): string;
    dictionary(buffer: string | Uint8Array): NSpell;
    personal(buffer: string): NSpell;
  }

  export default function nspell(
    aff: string | Uint8Array | { aff: string | Uint8Array; dic?: string | Uint8Array },
    dic?: string | Uint8Array,
  ): NSpell;
}
