export function capitalizeName(name: string): string {
  const lowerWords = [
    'da',
    'de',
    'do',
    'das',
    'dos',
    'e',
    'a',
    'o',
    'as',
    'os',
    'em',
    'no',
    'na',
    'nos',
    'nas',
  ];

  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !lowerWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toLowerCase() + word.slice(1);
    })
    .join(' ');
}
