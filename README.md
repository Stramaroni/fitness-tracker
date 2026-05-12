# Training Log

PWA locale per tracciare:

- allenamenti e carichi principali
- peso medio settimanale
- circonferenza vita all'ombelico
- fame 1-10
- energia 1-10
- sonno medio
- aderenza alla dieta

## Avvio locale

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory fitness-tracker
```

Poi apri:

```text
http://127.0.0.1:4173
```

## iPhone

Per usarla anche con il Mac spento, pubblica la cartella `fitness-tracker` su un hosting statico HTTPS, per esempio GitHub Pages, Netlify, Vercel o Cloudflare Pages.

Poi apri l'indirizzo HTTPS da Safari, tocca Condividi e poi Aggiungi a schermata Home.

I dati vengono salvati nel browser con `localStorage`. Usa la schermata Dati per esportare un backup JSON o un CSV.

## Pubblicazione rapida

Opzione semplice:

1. Crea un repository GitHub.
2. Carica il contenuto della cartella `fitness-tracker`.
3. In GitHub vai su Settings, Pages.
4. Seleziona Deploy from a branch e scegli il branch principale.
5. Apri l'URL `https://...github.io/...` da Safari su iPhone.

Quando la apri da HTTPS, il service worker puo salvare i file dell'app per l'uso offline. I dati inseriti restano sul telefono, non sul Mac.
