// Lit une réponse au format SSE (Server-Sent Events) et renvoie les événements un par un.
//
// Pourquoi pas EventSource, l'outil SSE intégré au navigateur ?
// EventSource ne sait faire que des requêtes GET, sans corps. Nous envoyons un POST
// avec { prompt } en JSON : on lit donc le flux nous-mêmes avec fetch.
//
// Usage :
//   for await (const { type, donnees } of lireFluxSSE(reponse.body)) { ... }

export async function* lireFluxSSE(corps) {
  // Le corps arrive en octets ; TextDecoderStream les transforme en texte
  // (en gérant les caractères accentués coupés entre deux paquets).
  const lecteur = corps.pipeThrough(new TextDecoderStream()).getReader();
  let tampon = '';

  while (true) {
    const { value, done } = await lecteur.read();
    if (done) return;
    tampon += value;

    // Un paquet réseau peut contenir un demi-événement, ou trois d'un coup :
    // on ne traite que les blocs complets (terminés par une ligne vide).
    let finDeBloc;
    while ((finDeBloc = tampon.indexOf('\n\n')) !== -1) {
      const bloc = tampon.slice(0, finDeBloc);
      tampon = tampon.slice(finDeBloc + 2);

      let type = 'message';
      let data = '';
      for (const ligne of bloc.split('\n')) {
        if (ligne.startsWith('event:')) type = ligne.slice(6).trim();
        else if (ligne.startsWith('data:')) data += ligne.slice(5).trim();
      }
      if (data) yield { type, donnees: JSON.parse(data) };
    }
  }
}
