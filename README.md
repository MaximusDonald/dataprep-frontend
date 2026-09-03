# Dataprep Frontend

Interface utilisateur du **DataPrep AI Copilot**, une application de préparation automatisée des données tabulaires.

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
   Créez un fichier `.env` à la racine de `dataprep-frontend` contenant l'URL de votre backend local :
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:5173` (ou un port défini par Vite).

## Scripts disponibles

- `npm run dev` : Lance le serveur de développement.
- `npm run build` : Compile le projet pour la production (fichiers dans `/dist`).
- `npm run preview` : Lance une prévisualisation de la build de production localement.
- `npm run lint` : Lance l'analyseur de code ESLint.

## Déploiement

Le déploiement est configuré pour **Vercel**. Le dépôt contient un fichier `vercel.json` à la racine pour automatiser et configurer le routage du build. Consultez le fichier `GUIDE_DEPLOIEMENT.md` situé à la racine du projet principal pour suivre les instructions étape par étape.
