# CRISPR·CAS9 — site de référence francophone sur l’édition génomique

Site statique en français consacré à CRISPR-Cas9 : mécanisme moléculaire, famille d’outils, chronologie,
applications, thérapies autorisées, limites documentées, éthique et droit, bibliothèque de vidéos
francophones vérifiées, glossaire et journal éditorial.

**En ligne :** https://floskinou.github.io/crisprcas9/
**Domaine prévu :** `crisprcas9.fr` (non encore relié au dépôt).

## Contenu du site

| Page | Sujet |
| --- | --- |
| `index.html` | Accueil, animation Three.js, chiffres datés, parcours de lecture |
| `comprendre.html` | Les bases, vocabulaire, analogies et limites des analogies |
| `mecanisme.html` | PAM, R-loop, coupure HNH/RuvC, NHEJ et HDR, délivrance |
| `outils.html` | Cas9, Cas12a, Cas13, éditeurs de bases, prime editing, cribles |
| `histoire.html` | Chronologie 1987 → 2026, chaque étape sourcée |
| `applications.html` | Panorama santé, agriculture, diagnostic, biotech |
| `therapies.html` | Ce qui est autorisé, ce qui reste expérimental |
| `limites.html` | Effets hors cible, p53, mosaïcisme, immunité, délivrance |
| `ethique.html` | Somatique / lignée germinale, droit français, UE, OMS |
| `videos.html` | 12 vidéos françaises vérifiées, chargées au clic |
| `glossaire.html` | 60 définitions avec filtre instantané |
| `ressources.html` | Institutions, bases de données, méthode de lecture |
| `a-propos.html` | Méthode, place de l’IA, transparence commerciale |
| `blog/` | Journal : 4 articles de fond sourcés |

## Architecture

Site **statique généré** : aucune dépendance externe, aucun framework, aucun serveur.

```
content/site.json        métadonnées, navigation, vidéos, articles
content/pages/*.html     corps des pages (gabarits avec placeholders)
content/articles/*.html  corps des articles du journal
templates/layout.html    gabarit commun (en-tête, navigation, pied de page)
assets/style.css         design system
assets/site.js           menu, sommaire actif, filtres, façades vidéo
assets/hero.js           animation Three.js de l’accueil
build.py                 générateur (bibliothèque standard Python uniquement)
```

### Régénérer le site

```bash
python build.py
```

Le générateur écrit les 19 pages HTML, `sitemap.xml` et `robots.txt` à la racine du dépôt.
Il est **idempotent** : deux exécutions produisent des fichiers identiques.

### Ajouter un article au journal

1. Rédiger `content/articles/<slug>.html` (corps de l’article, avec `{{BASE}}` pour les liens et `{{PAGER}}` pour la navigation).
2. Ajouter une entrée dans `content/site.json` → `articles` (slug, date, tag, titre, chapô).
3. `python build.py` — l’article, la page d’index du journal et le sitemap sont mis à jour.

### Passer au domaine crisprcas9.fr

Modifier `site_url` dans `content/site.json`, puis régénérer : canoniques, sitemap et `robots.txt` suivent.

## Règles éditoriales appliquées

- Sources primaires d’abord (publications, textes réglementaires, agences) ; les communiqués d’entreprise
  sont signalés comme sources de partie prenante.
- Les chiffres sont datés, avec la requête utilisée (ex. : relevé ClinicalTrials.gov du 26 septembre 2026).
- Aucun identifiant de vidéo ni lien de source n’est inventé : la bibliothèque vidéo a été vérifiée une par une.
- Distinction systématique entre recherche, essai clinique et usage autorisé.
- Les incertitudes sont explicitées plutôt que lissées.
- Contenu informatif : ni avis médical, ni recommandation de traitement.

## État du projet

- Contenu rédigé, généré et vérifié localement (liens internes, placeholders, réponses HTTP).
- Mise à jour quotidienne automatisée du journal : **non encore active** (chaîne de relecture à valider).
- Monétisation : aucun lien affilié à ce jour ; les règles de transparence sont publiées sur `a-propos.html`.
