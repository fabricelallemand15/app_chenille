# La Chenille Vorace

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-green.svg)](https://opensource.org/licenses/MIT)

Application web interactive pour comprendre la **programmation dynamique** en Terminale NSI.

## Démo en ligne

Accès direct à l'application:  
https://sitelf.fr/divers/ProgDyn/index.html

L'application visualise le problème classique de la pyramide de nombres (chemin de somme maximale) avec trois approches:

- récursif naïf (redondant)
- programmation dynamique bottom-up
- programmation dynamique top-down (mémoïsation)

## Objectif pédagogique

Ce projet aide les élèves à:

- identifier les sous-problèmes qui se répètent
- comparer plusieurs stratégies de résolution
- comprendre le gain de complexité (exponentielle vers polynomiale)
- lire un raisonnement de backtracking pour reconstruire le chemin optimal

## Public cible

- Élèves de Terminale NSI
- Enseignants souhaitant illustrer la programmation dynamique en classe

## Fonctionnalités

- visualisation pas à pas des appels/calculs
- animation automatique avec réglage de vitesse
- édition de la pyramide (2 à 6 niveaux)
- affichage du tableau `C` (bottom-up) ou du mémo (top-down)
- onglet de comparaison des approches (coût, redondance, complexité)

## Notions NSI travaillées

- décomposition en sous-problèmes
- récursion
- mémoïsation
- programmation dynamique
- complexité algorithmique (`O(2^n)` versus `O(n^2)`)

## Technologies

- React
- Vite
- JavaScript (ES modules)

## Lancer le projet en local

Prérequis: Node.js 20+ et npm.

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite (souvent `http://localhost:5173`).

## Scripts utiles

```bash
npm run dev      # serveur local
npm run build    # build production
npm run preview  # test du build local
npm run lint     # vérification ESLint
```

## Vérification

```bash
npm run lint
npm run build
```

## Structure du projet

```text
src/
	App.jsx      # logique de visualisation et interface
	main.jsx     # point d'entrée React
	index.css    # styles globaux
```

## Contribuer

Les suggestions pédagogiques, corrections de bugs et améliorations UI sont bienvenues via Issues et Pull Requests.

## Auteur et licence

Auteur: Fabrice Lallemand  
Licence: MIT
