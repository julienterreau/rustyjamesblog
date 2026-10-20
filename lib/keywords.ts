const STOP = new Set(
  `a au aux avec ce ces cet cette ceux celle celles dans de des du elle en et eux il je la le les leur leurs lui ma mais me meme mes moi mon ne ni nos notre nous on ou par pas plus pour qu que qui sa se ses son sont sur ta te tes toi ton tu un une vos votre vous y d l n s c qu est ete etre etre fait faire comme tout entre vers sans sous chez aussi tres bien peu peut deja donc car si oui non aux duquel dont lorsque quand comment pourquoi ou bien ainsi alors apres avant chez contre depuis encore jusqu ici la meme autre autres tout toute toutes rien chaque plusieurs plusieurs trop assez voici voila ete ete`.split(
    /\s+/,
  ),
);

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokens(value: string) {
  return value
    .replace(/[’']/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function keep(word: string) {
  const key = fold(word);
  return key.length >= 4 && !STOP.has(key) && !/^\d+$/.test(key);
}

export function suggestKeywords(title: string, description: string) {
  const titleBits = tokens(title).filter(keep).slice(0, 4);
  const phrase = titleBits.join(" ");
  const covered = new Set(titleBits.map(fold));
  const scores = new Map<string, { label: string; score: number }>();

  for (const word of tokens(description)) {
    if (!keep(word)) continue;
    const key = fold(word);
    if (covered.has(key)) continue;
    const current = scores.get(key) ?? { label: word, score: 0 };
    current.score += 1;
    scores.set(key, current);
  }

  const chosen = phrase.length >= 4 && phrase.length <= 48 ? [phrase] : [];
  for (const item of [...scores.values()].sort((a, b) => b.score - a.score)) {
    if (chosen.length >= 6) break;
    chosen.push(item.label);
  }

  return chosen;
}
