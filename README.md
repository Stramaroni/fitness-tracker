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
python3 -m http.server 4173 --bind [ip] --directory fitness-tracker
```

Poi apri:

```text
http://[ip]
```

## iPhone

Per usarla anche con il Mac spento, pubblica la cartella `fitness-tracker` su un hosting statico HTTPS, per esempio GitHub Pages, Netlify, Vercel o Cloudflare Pages.

Poi apri l'indirizzo HTTPS da Safari, tocca Condividi e poi Aggiungi a schermata Home.

I dati vengono salvati nel browser con `localStorage`. Usa la schermata Dati per esportare un backup JSON o un CSV.

