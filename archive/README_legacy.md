# Eyang Estate (MegaPro)

Bienvenue sur le projet **Eyang Estate**. C'est une application web Django conçue pour la gestion et la réservation de biens immobiliers (logements étudiants, appartements, etc.).

## 📋 Fonctionnalités

*   **Gestion des Biens (Estates) :**
    *   Liste détaillée des logements avec prix, capacité, distance, et notes.
    *   Indicateurs d'équipements : iWifi, Restaurant, Groupe électrogène, Forage.
    *   Galerie photos pour chaque bien.
*   **Système d'Avis :** Les utilisateurs peuvent noter et commenter les biens.
*   **Réservation Rapide (Quick Order) :** Formulaire simplifié pour manifester son intérêt.
*   **Profils Utilisateurs :** Comptes pour Étudiants, Parents, Résidents locaux, et Visiteurs.
*   **Contact :** Formulaire de contact intégré.

## 🛠 Prérequis

*   **Python 3.10+**
*   **pip** (gestionnaire de paquets Python)
*   **Virtualenv** (recommandé)

## 🚀 Installation et Lancement

Suivez ces étapes pour lancer le projet localement :

### 1. Cloner ou télécharger le projet
Assurez-vous d'être dans le dossier racine du projet (`MegaPro`).

### 2. Créer et activer l'environnement virtuel
C'est une bonne pratique pour isoler les dépendances du projet.

```bash
# Création de l'environnement virtuel (si ce n'est pas déjà fait)
python3 -m venv venv

# Activation (Linux/macOS)
source venv/bin/activate

# Activation (Windows)
# venv\Scripts\activate
```

### 3. Installer les dépendances
Nous utilisons `psycopg2-binary` pour faciliter l'installation sans dépendances système complexes.

```bash
pip install -r requirements.txt
```

### 4. Appliquer les migrations
Cela configure la base de données (SQLite par défaut).

```bash
python manage.py migrate
```
*Note : Si vous voyez un message indiquant que des tables existent déjà, vous pouvez ignorer ou utiliser `python manage.py migrate --fake-initial`.*

### 5. Lancer le serveur
```bash
python manage.py runserver
```

Le site sera accessible à l'adresse : **http://127.0.0.1:8000/**

## 📂 Structure détaillée du Projet

Voici une explication du rôle de chaque dossier et fichier important :

### 1. `app1/` (L'application principale)
C'est le cœur de la logique métier.
*   **`models.py`** : Définit la structure de la base de données.
    *   `Estate` : Les logements (prix, wifi, etc.).
    *   `Review` : Les avis et commentaires.
    *   `QuickOrder` : Les demandes de réservation.
    *   `Global_user` : Extension du profil utilisateur.
*   **`views.py`** : Contient la logique de chaque page (contrôleurs).
    *   `index` : Page d'accueil.
    *   `dashboard` : Espace utilisateur (réservations, avis).
    *   `estate_reviews_api` : API pour charger les avis dynamiquement.
*   **`urls.py`** : Définit les routes (URLs) spécifiques à cette application.
*   **`admin.py`** : Configuration de l'interface d'administration Django.
*   **`forms.py`** : Formulaires pour la saisie de données (ex: commentaires).

### 2. `project1/` (Configuration globale)
*   **`settings.py`** : Configuration générale (base de données, applications installées, sécurité, fichiers statiques).
*   **`urls.py`** : Point d'entrée des URLs du site, redirige vers `app1`.
*   **`wsgi.py`** & **`asgi.py`** : Points d'entrée pour les serveurs web (déploiement).

### 3. `template/` (Interface Utilisateur)
Contient les fichiers HTML (le "Frontend").
*   `index.html` : Page principale listant les biens.
*   `dashboard.html` : Tableau de bord utilisateur.
*   `login.html` / `registration.html` : Pages d'authentification.
*   `review.html` : Page pour laisser un avis.
*   `contact.html` : Formulaire de contact.

### 4. `static/` & `static_cdn/`
*   Contiennent les fichiers CSS (style), JavaScript (interactivité) et les images du site.

### 5. Fichiers à la racine
*   **`manage.py`** : L'outil de commande pour lancer le serveur, créer des migrations, etc.
*   **`db.sqlite3`** : Le fichier de base de données (ne pas supprimer si vous voulez garder vos données).
*   **`requirements.txt`** : Liste des librairies Python nécessaires au projet.

## 👤 Comptes Utilisateurs

Le système gère différents types d'utilisateurs via le modèle `Global_user` :
*   Student (Étudiant)
*   Parent
*   Local resident (Résident local)
*   Visitor (Visiteur)

## 📝 Auteur

Projet développé pour Eyang State.
