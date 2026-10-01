import {
  capitalizeSentence,
  capitalizeTitle,
  cityMatchKey,
  escapeRegExp,
} from './text-validation';

describe('capitalizeTitle', () => {
  it('capitaliza cada palavra de um título digitado em minúsculo', () => {
    expect(capitalizeTitle('sala premium')).toBe('Sala Premium');
    expect(capitalizeTitle('missao impossivel')).toBe('Missao Impossivel');
  });

  it('mantém os conectivos em minúsculo, menos na primeira palavra', () => {
    expect(capitalizeTitle('a origem dos guardioes')).toBe(
      'A Origem dos Guardioes',
    );
    // "para" não está na lista de conectivos de `capitalizeName`, e a régua
    // aqui é a mesma dos nomes de cinema e cidade.
    expect(capitalizeTitle('de volta para o futuro')).toBe(
      'De Volta Para o Futuro',
    );
  });

  it('preserva a caixa de palavras escritas de propósito com maiúscula', () => {
    expect(capitalizeTitle('Sala IMAX')).toBe('Sala IMAX');
    expect(capitalizeTitle('Spider-Man: No Way Home')).toBe(
      'Spider-Man: No Way Home',
    );
    expect(capitalizeTitle('sala CineVille 01')).toBe('Sala CineVille 01');
  });

  it('capitaliza cada parte de um composto com hífen', () => {
    expect(capitalizeTitle('luz-camera-acao')).toBe('Luz-Camera-Acao');
  });

  it('normaliza os espaços sobrando', () => {
    expect(capitalizeTitle('  sala   premium  ')).toBe('Sala Premium');
  });

  it('devolve valores que não são texto sem alteração', () => {
    expect(capitalizeTitle(undefined)).toBeUndefined();
    expect(capitalizeTitle(42)).toBe(42);
  });
});

describe('capitalizeSentence', () => {
  it('sobe apenas a primeira letra do texto', () => {
    expect(capitalizeSentence('esta é uma história sobre dois irmãos.')).toBe(
      'Esta é uma história sobre dois irmãos.',
    );
  });

  it('não transforma a sinopse em Title Case', () => {
    expect(capitalizeSentence('esta é uma história sobre...')).not.toBe(
      'Esta É Uma História Sobre...',
    );
  });

  it('capitaliza o início de cada frase', () => {
    expect(capitalizeSentence('um herói cai. outro se levanta.')).toBe(
      'Um herói cai. Outro se levanta.',
    );
  });

  it('não rebaixa nomes próprios nem siglas já escritos pelo administrador', () => {
    expect(capitalizeSentence('em 1999, Neo descobre a Matrix.')).toBe(
      'Em 1999, Neo descobre a Matrix.',
    );
  });

  it('lida com pontuação antes da primeira letra', () => {
    expect(capitalizeSentence('"tudo começa aqui."')).toBe(
      '"Tudo começa aqui."',
    );
  });
});

describe('cityMatchKey', () => {
  it('iguala cidades escritas com caixa e acentuação diferentes', () => {
    expect(cityMatchKey('São Paulo')).toBe(cityMatchKey('sao paulo'));
    expect(cityMatchKey('  Rio  de Janeiro ')).toBe(
      cityMatchKey('rio de janeiro'),
    );
  });

  it('separa cidades diferentes', () => {
    expect(cityMatchKey('São Paulo')).not.toBe(cityMatchKey('Campinas'));
  });

  it('devolve string vazia quando não há cidade', () => {
    expect(cityMatchKey(undefined)).toBe('');
  });
});

describe('escapeRegExp', () => {
  it('neutraliza os metacaracteres de um título', () => {
    const pattern = new RegExp(
      `^${escapeRegExp('Missão: Impossível (2026)')}$`,
    );

    expect(pattern.test('Missão: Impossível (2026)')).toBe(true);
    expect(pattern.test('Missão: Impossível 2026')).toBe(false);
  });
});
