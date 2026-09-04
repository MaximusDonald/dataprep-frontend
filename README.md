# Dataprep Frontend

Interface utilisateur du **DataPrep AI Copilot**, une application web interactive de préparation automatisée des données tabulaires propulsée par l'Intelligence Artificielle.

## Fonctionnalités Clés
- **Import et Analyse** : Importation de fichiers CSV, affichage des statistiques descriptives (EDA) et diagnostic des problèmes structurels.
- **Agent IA (v2)** : L'IA génère dynamiquement le code Python (Pandas/Numpy) optimal pour traiter les problèmes de données, sans dépendre d'un catalogue de fonctions limitatif.
- **Résolution en Cascade** : Le système détecte automatiquement les problèmes résolus indirectement suite à l'application d'une correction.
- **Raffinement Interactif** : Possibilité de discuter avec l'IA pour ajuster une solution, imposer une contrainte métier, ou demander des explications.

## Stack Technique
- **Framework** : React 19 (via Vite)
- **State Management** : Zustand, React Query
- **Styling** : Tailwind CSS, Radix UI (Headless), Class-Variance-Authority, Lucide React
- **Routing** : React Router v7
- **Graphiques** : Recharts

## Installation en local

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Variables d'environnement :
   Créez un fichier `.env` à la racine de `dataprep-frontend` :
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:5173` (ou le port défini par Vite).

## Scripts disponibles

- `npm run dev` : Lance le serveur de développement.
- `npm run build` : Compile le projet pour la production (fichiers dans `/dist`).
- `npm run preview` : Lance une prévisualisation de la build de production localement.
- `npm run lint` : Lance l'analyseur de code ESLint.

## Déploiement

Le projet est configuré pour être déployé facilement sur **Vercel**. Un fichier `vercel.json` situé à la racine s'assure du bon comportement du routage (SPA fallback).
Pour des instructions détaillées de déploiement, consultez le fichier `GUIDE_DEPLOIEMENT.md` situé à la racine du projet principal.

Pour utiliser la version mise en production sur Vercel: https://dataprep-frontend.vercel.app
