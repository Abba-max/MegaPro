# Cahier des Charges - Eyang Estate MVP
## Plateforme de Gestion des Chambres Estudiantines

---

**Version:** 1.0  
**Date:** 27 Décembre 2025  
**Projet:** Eyang Estate - Minimum Viable Product (MVP)  
**Contexte:** Gestion et réservation de chambres estudiantines à Eyang

---

## 📋 Table des Matières

1. [Contexte et Objectifs](#1-contexte-et-objectifs)
2. [Périmètre du MVP](#2-périmètre-du-mvp)
3. [Spécifications Fonctionnelles](#3-spécifications-fonctionnelles)
4. [Spécifications Techniques](#4-spécifications-techniques)
5. [Architecture Système](#5-architecture-système)
6. [Modèle de Données](#6-modèle-de-données)
7. [Interfaces Utilisateur](#7-interfaces-utilisateur)
8. [Plan de Développement](#8-plan-de-développement)
9. [Critères d'Acceptation](#9-critères-dacceptation)
10. [Contraintes et Risques](#10-contraintes-et-risques)

---

## 1. Contexte et Objectifs

### 1.1 Contexte du Projet

**Eyang Estate** est une plateforme web destinée à faciliter la gestion et la réservation de chambres estudiantines dans la région d'Eyang. Le projet répond aux besoins suivants :

- **Problématique étudiante** : Difficulté à trouver des logements adaptés près des campus
- **Problématique propriétaires** : Manque de visibilité et gestion manuelle des réservations
- **Problématique parents** : Besoin de transparence et de sécurité pour leurs enfants

### 1.2 Objectifs du MVP

> [!IMPORTANT]
> Le MVP doit être opérationnel et déployable en **8 semaines** avec les fonctionnalités essentielles.

**Objectifs principaux :**

1. ✅ Permettre aux étudiants de consulter et réserver des chambres
2. ✅ Offrir un système d'avis et de notation transparent
3. ✅ Faciliter la communication entre étudiants et propriétaires
4. ✅ Fournir un tableau de bord utilisateur simple et efficace
5. ✅ Applications mobiles natives (iOS/Android)
6. ✅ Interface d'administration pour propriétaires
7. ✅ Notifications push (PWA)
8. ✅ Système de messagerie instantanée

**Objectifs secondaires (post-MVP) :**

- Système de paiement en ligne

### 1.3 Public Cible

| Type d'utilisateur | Besoins principaux | Priorité MVP |
|-------------------|-------------------|--------------|
| **Étudiants** | Recherche, réservation, avis | ⭐⭐⭐ Haute |
| **Propriétaires** | Gestion logements, réservations, statistiques | ⭐⭐⭐ Haute |
| **Parents** | Consultation, suivi des réservations | ⭐⭐ Moyenne |
| **Résidents locaux** | Information sur les logements | ⭐ Basse |
| **Visiteurs** | Découverte de la plateforme (accès limité) | ⭐ Basse |

---

## 2. Périmètre du MVP

### 2.1 Fonctionnalités Incluses (IN SCOPE)

#### ✅ Module Authentification
- Inscription utilisateur (5 types : Étudiant, Parent, Résident local, Visiteur, Propriétaire)
- Connexion/Déconnexion
- Profil utilisateur basique
- Accès non connecté : consultation limitée (liste des logements sans détails complets)
- Connexion requise pour : détails complets d'une cité, réservation, avis

#### ✅ Module Catalogue de Logements
- Liste des chambres/logements disponibles
- Filtrage par :
  - Prix
  - Distance du campus
  - Équipements (WiFi, Restaurant, Générateur, Forage)
  - Capacité
  - Note moyenne
- Galerie photos pour chaque logement
- Détails complets (description, prix, équipements)

#### ✅ Module Réservation
- Formulaire de réservation rapide (Quick Order)
- Historique des réservations dans le dashboard
- Gestion des réservations (suppression)

#### ✅ Module Avis et Notations
- Système de notation (1-5 étoiles)
- Commentaires textuels
- Réponses aux avis (système de thread)

#### ✅ Module Contact
- Formulaire de contact général
- Historique des demandes de contact

#### ✅ Dashboard Utilisateur
- Vue d'ensemble des réservations
- Gestion des avis publiés
- Gestion des demandes de contact

#### ✅ Interface d'Administration Propriétaire
- Gestion des logements (CRUD complet)
- Tableau de bord propriétaire avec statistiques
- Gestion des réservations reçues
- Réponses aux avis clients
- Upload et gestion des photos de logements

#### ✅ Module Messagerie
- Messagerie instantanée entre Étudiant et Propriétaire
- Liste des conversations
- Indicateurs de messages non lus
- Envoi de messages texte
- Historique des conversations

#### ✅ Applications Mobiles Natives
- **Application iOS** (Swift/SwiftUI)
  - Toutes les fonctionnalités de la version web
  - Interface optimisée pour mobile
  - Notifications push natives
- **Application Android** (Kotlin/Java)
  - Toutes les fonctionnalités de la version web
  - Interface Material Design
  - Notifications push natives

#### ✅ Progressive Web App (PWA)
- Installation sur écran d'accueil
- Fonctionnement hors ligne (mode lecture)
- Notifications push web
- Synchronisation automatique

---

## 3. Spécifications Fonctionnelles

### 3.1 Cas d'Utilisation Détaillés

#### CU-01 : Inscription Utilisateur

**Acteur principal :** Visiteur  
**Préconditions :** Aucune  
**Postconditions :** Compte créé, utilisateur connecté

**Scénario nominal :**
1. L'utilisateur accède à la page d'inscription
2. Il remplit le formulaire :
   - Username (unique)
   - Email
   - Mot de passe
   - Confirmation mot de passe
   - Prénom
   - Nom
   - Contact (téléphone)
   - Adresse
   - Type de compte (Étudiant/Parent/Résident/Visiteur)
3. Le système valide les données
4. Le compte est créé
5. L'utilisateur est automatiquement connecté
6. Redirection vers la page d'accueil

**Scénarios alternatifs :**
- 3a. Username déjà existant → Message d'erreur
- 3b. Email invalide → Message d'erreur
- 3c. Mots de passe non identiques → Message d'erreur

---

#### CU-02 : Recherche de Logement

**Acteur principal :** Utilisateur (tous types)  
**Préconditions :** Aucune (accessible sans connexion)  
**Postconditions :** Liste de logements affichée

**Scénario nominal :**
1. L'utilisateur accède à la page d'accueil
2. La liste complète des logements s'affiche avec informations de base
3. L'utilisateur peut filtrer par :
   - Fourchette de prix
   - Distance maximale
   - Équipements requis (WiFi, Restaurant, etc.)
   - Note minimale
4. Les résultats se mettent à jour dynamiquement
5. L'utilisateur clique sur un logement pour voir les détails
6. **Si non connecté** : Affichage d'un aperçu limité + message invitant à se connecter
7. **Si connecté** : Accès complet aux détails (description complète, galerie photos, avis détaillés, bouton réservation)

**Informations affichées par logement :**
- Nom du logement
- Photo principale
- Prix (par mois)
- Distance du campus (en mètres)
- Note moyenne (/5)
- Capacité totale / Places disponibles
- Icônes équipements (WiFi, Restaurant, Générateur, Forage)

---

#### CU-03 : Réservation Rapide

**Acteur principal :** Utilisateur connecté  
**Préconditions :** Utilisateur authentifié  
**Postconditions :** Demande de réservation enregistrée

**Scénario nominal :**
1. L'utilisateur consulte un logement
2. Il clique sur "Réserver maintenant"
3. Un formulaire s'affiche avec :
   - Nom du logement (pré-rempli)
   - Nom du demandeur (pré-rempli si connecté)
   - Numéro de téléphone
   - Note/Message optionnel
4. L'utilisateur soumet le formulaire
5. La demande est enregistrée
6. Message de confirmation affiché
7. La demande apparaît dans le dashboard

**Scénarios alternatifs :**
- 1a. Utilisateur non connecté → Redirection vers login
- 4a. Numéro de téléphone invalide → Message d'erreur

---

#### CU-04 : Publier un Avis

**Acteur principal :** Utilisateur connecté  
**Préconditions :** Utilisateur authentifié  
**Postconditions :** Avis publié et visible

**Scénario nominal :**
1. L'utilisateur accède à la page d'avis d'un logement
2. Il remplit le formulaire :
   - Sélection du logement
   - Note (1-5 étoiles)
   - Commentaire textuel
3. Il soumet l'avis
4. L'avis est enregistré avec :
   - Nom de l'utilisateur
   - Date/heure de publication
   - Note et commentaire
5. La note moyenne du logement est recalculée
6. L'avis apparaît dans la liste des avis
7. L'avis est visible dans le dashboard utilisateur

**Fonctionnalités supplémentaires :**
- Édition de son propre avis
- Suppression de son propre avis
- Réponse à un avis (thread)
- "Like" d'un avis

---

#### CU-05 : Gestion du Dashboard

**Acteur principal :** Utilisateur connecté  
**Préconditions :** Utilisateur authentifié  
**Postconditions :** Informations affichées/modifiées

**Scénario nominal :**
1. L'utilisateur accède à son dashboard
2. Il visualise 3 sections :
   - **Mes Réservations** : Liste des demandes de réservation
   - **Mes Avis** : Liste des avis publiés
   - **Mes Contacts** : Liste des demandes de contact
3. Pour chaque section, il peut :
   - Consulter les détails
   - Modifier (pour les avis)
   - Supprimer

**Actions disponibles :**
- Supprimer une réservation
- Éditer un avis (note + commentaire)
- Supprimer un avis
- Supprimer une demande de contact

---

#### CU-06 : Gestion des Logements (Propriétaire)

**Acteur principal :** Propriétaire connecté  
**Préconditions :** Compte propriétaire authentifié  
**Postconditions :** Logement créé/modifié/supprimé

**Scénario nominal :**
1. Le propriétaire accède à son interface d'administration
2. Il visualise la liste de ses logements
3. Il peut :
   - **Créer** un nouveau logement (nom, prix, capacité, équipements, photos)
   - **Modifier** un logement existant
   - **Supprimer** un logement
   - **Gérer les photos** (upload, suppression, ordre)
4. Les modifications sont enregistrées
5. Les logements sont immédiatement visibles sur la plateforme

**Informations requises pour un logement :**
- Nom du logement
- Prix mensuel
- Capacité totale
- Distance du campus
- Équipements (WiFi, Restaurant, Générateur, Forage)
- Description détaillée
- Galerie photos (minimum 1, maximum 10)

---

#### CU-07 : Tableau de Bord Propriétaire

**Acteur principal :** Propriétaire connecté  
**Préconditions :** Compte propriétaire authentifié  
**Postconditions :** Statistiques affichées

**Scénario nominal :**
1. Le propriétaire accède à son dashboard
2. Il visualise :
   - **Statistiques globales** :
     - Nombre total de logements
     - Taux d'occupation moyen
     - Nombre de réservations en attente
     - Note moyenne globale
   - **Réservations récentes** : Liste des demandes de réservation
   - **Avis récents** : Derniers avis reçus sur ses logements
   - **Graphiques** : Évolution des réservations, notes par logement
3. Il peut filtrer par période ou par logement

---

#### CU-08 : Notifications Push

**Acteur principal :** Utilisateur (tous types)  
**Préconditions :** Application installée ou PWA activée  
**Postconditions :** Notification reçue

**Scénario nominal :**
1. Un événement se produit (nouvelle réservation, nouvel avis, réponse à un avis)
2. Le système génère une notification push
3. **Pour applications mobiles** : Notification native iOS/Android
4. **Pour PWA** : Notification web (si autorisée)
5. L'utilisateur clique sur la notification
6. Il est redirigé vers la page concernée dans l'application

**Types de notifications :**
- **Pour étudiants** : Confirmation de réservation, réponse à un avis
- **Pour propriétaires** : Nouvelle réservation, nouvel avis, nouveau message
- **Pour tous** : Promotions, nouveaux logements disponibles

---

#### CU-09 : Messagerie Instantanée

**Acteur principal :** Utilisateur connecté (Étudiant/Propriétaire)
**Préconditions :** Utilisateur authentifié
**Postconditions :** Message envoyé et notifié

**Scénario nominal :**
1. L'utilisateur accède à la section "Messagerie"
2. Il sélectionne une conversation existante ou en crée une nouvelle depuis la page d'un logement
3. Il saisit un message texte
4. Il clique sur "Envoyer"
5. Le message s'affiche instantanément dans la conversation (via WebSocket)
6. Le destinataire reçoit une notification
7. L'historique de la conversation est mis à jour

**Scénarios alternatifs :**
- 2a. Création depuis un logement : La conversation est pré-initialisée avec le propriétaire du logement
- 5a. Erreur de connexion : Message marqué comme "Non envoyé" avec option de réessayer

---

### 3.2 Règles de Gestion

| ID | Règle | Priorité |
|----|-------|----------|
| RG-01 | Un username doit être unique dans le système | Haute |
| RG-02 | La note d'un avis doit être entre 1 et 5 | Haute |
| RG-03 | La note moyenne d'un logement = moyenne arithmétique de tous les avis | Haute |
| RG-05 | Les réservations sont des "demandes" (pas de confirmation automatique) | Haute |
| RG-06 | Les avis sont triés par date (plus récents en premier) | Moyenne |

| RG-09 | Le nombre de places disponibles = capacité - réservations confirmées | Basse (MVP) |
| RG-10 | Les visiteurs non connectés peuvent consulter la liste mais pas les détails complets | Haute |
| RG-11 | Un propriétaire ne peut gérer que ses propres logements | Haute |
| RG-12 | Un logement doit avoir au minimum 1 photo pour être publié | Haute |
| RG-13 | Les notifications push nécessitent l'autorisation de l'utilisateur | Haute |
| RG-14 | L'accès aux détails d'une cité nécessite une connexion | Haute |
| RG-15 | La réservation nécessite une connexion | Haute |
| RG-16 | Les propriétaires reçoivent une notification pour chaque nouvelle réservation | Moyenne |
| RG-17 | Maximum 10 photos par logement | Moyenne |
| RG-18 | Les statistiques propriétaires sont calculées en temps réel | Moyenne |

---

## 4. Spécifications Techniques

### 4.1 Stack Technologique

#### Backend
- **Framework :** Django 5.1.4
- **Langage :** Python 3.10+
- **ORM :** Django ORM
- **Base de données :** SQLite (MVP) → PostgreSQL (Production)
- **API REST :** Django REST Framework (pour applications mobiles)
- **Notifications Push :** Firebase Cloud Messaging (FCM)
- **WebSockets :** Django Channels (pour notifications temps réel PWA)

#### Frontend Web
- **Template Engine :** Django Templates
- **CSS Framework :** Custom CSS (Static/CSS)
- **JavaScript :** Vanilla JS pour interactions dynamiques
- **PWA :** Service Workers, Web App Manifest
- **Images :** Pillow pour traitement

#### Applications Mobiles
- **iOS :** Swift 5.0+, SwiftUI, Xcode 14+
- **Android :** Kotlin 1.8+, Jetpack Compose, Android Studio
- **API Communication :** REST API (JSON)
- **Notifications :** Firebase Cloud Messaging (FCM)
- **Stockage local :** Core Data (iOS), Room Database (Android)

#### Infrastructure
- **Serveur de développement :** Django runserver
- **Serveur de production :** Gunicorn + Nginx (recommandé)
- **Hébergement :** À définir (Heroku, DigitalOcean, AWS)

### 4.2 Dépendances Python

```python
# requirements.txt (existant)
asgiref==3.8.1
Django==5.1.4
pillow==11.0.0
psycopg2-binary==2.9.10
sqlparse==0.5.3
typing_extensions==4.12.2
tzdata==2024.2
```

### 4.3 Configuration Système

**Prérequis serveur :**
- Python 3.10 ou supérieur
- pip (gestionnaire de paquets)
- Virtualenv
- 512 MB RAM minimum
- 1 GB espace disque

**Variables d'environnement (Production) :**
```bash
SECRET_KEY=<clé_secrète_django>
DEBUG=False
ALLOWED_HOSTS=eyang-estate.com,www.eyang-estate.com
DATABASE_URL=postgres://user:pass@host:port/dbname
```

### 4.4 Sécurité

> [!CAUTION]
> Les points suivants sont **critiques** pour la sécurité :

- ✅ CSRF protection activée (Django par défaut)
- ✅ Mots de passe hashés (Django auth)
- ✅ Protection XSS (Django templates auto-escape)
- ✅ HTTPS obligatoire en production
- ⚠️ Validation des entrées utilisateur
- ⚠️ Rate limiting sur les formulaires (à implémenter)
- ⚠️ Sauvegarde régulière de la base de données

---

## 5. Architecture Système

### 5.1 Architecture Globale

```mermaid
graph TB
    Client["Clients (Web/Mobile)"] --> Gateway["Django Core / API Gateway"]
    
    subgraph MM ["Modular Monolith"]
        Gateway --> Users["Users Service"]
        Gateway --> Estates["Estates Service"]
        Gateway --> Bookings["Bookings Service"]
        Gateway --> Messaging["Messaging Service"]
        Gateway --> Reviews["Reviews Service"]
    end
    
    Users --> DB[("Database")]
    Estates --> DB
    Bookings --> DB
    Messaging --> DB
    Reviews --> DB

    %% Légende intégrée
    subgraph Legend ["Légende & Signification"]
        direction TB
        L_Client["Clients : Points d'entrée (Navigateurs, Mobiles)"]
        L_Gateway["Gateway : Routeur Django (Settings, WSGI/ASGI)"]
        L_Service["Services : Modules métier (Logique encapsulée)"]
        L_DB["Database : Base de données partagée"]
        L_Arrow["--> : Flux de requête / Dépendance"]
    end
    
    %% Styles pour la légende (optionnel, pour séparer visuellement)
    style Legend fill:#f9f9f9,stroke:#333,stroke-width:1px

### 5.2 Structure du Projet (Architecture Modulaire)

L'architecture suit le pattern **Modular Monolith**. Chaque domaine métier est encapsulé dans un "Service" (Application Django) distinct.

```mermaid
graph TD
    MegaPro[MegaPro/]
    
    %% Config
    MegaPro --> Config[config/]
    Config --> C_Init[__init__.py]
    Config --> C_Asgi[asgi.py]
    Config --> C_Settings[settings/]
    Config --> C_Urls[urls.py]
    Config --> C_Wsgi[wsgi.py]
    
    %% Services
    MegaPro --> Services[services/]
    Services --> S_Init[__init__.py]
    
    Services --> Users[users/]
    Users --> U_Domain[domain/]
    Users --> U_Models[models.py]
    Users --> U_Views[views.py]
    Users --> U_Urls[urls.py]
    Users --> U_Serializers[serializers.py]
    
    Services --> Estates[estates/]
    Estates --> E_Models[models.py]
    Estates --> E_Views[views.py]
    
    Services --> Bookings[bookings/]
    Bookings --> B_Models[models.py]
    
    Services --> Reviews[reviews/]
    Reviews --> R_Models[models.py]
    
    Services --> Messaging[messaging/]
    Messaging --> M_Models[models.py]
    Messaging --> M_Consumers[consumers.py]
    Messaging --> M_Routing[routing.py]
    Messaging --> M_Views[views.py]
    
    %% Shared
    MegaPro --> Shared[shared/]
    Shared --> Sh_Mixins[mixins.py]
    Shared --> Sh_Permissions[permissions.py]
    Shared --> Sh_Utils[utils.py]
    
    %% Root Files
    MegaPro --> Templates[templates/]
    MegaPro --> Static[static/]
    MegaPro --> Media[media/]
    MegaPro --> Manage[manage.py]
    MegaPro --> Reqs[requirements.txt]
```

### 5.3 Flux de Données

#### Exemple : Création d'un Avis

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant V as View (API/Controller)
    participant S as Service (ReviewService)
    participant M as Model (Review)
    participant DB as Database
    
    U->>V: POST /review (données)
    V->>S: create_review(user, data)
    S->>S: Valider règles métier
    S->>M: Instancier Review
    M->>DB: INSERT
    DB->>M: Confirm
    S->>V: Retourner DTO/Objet
    V->>U: Réponse HTTP (201 Created)
```

---

## 6. Modèle de Données

### 6.1 Schéma Relationnel

```mermaid
erDiagram
    User ||--o| Global_user : extends
    Estate ||--o{ EstateImage : has
    Estate ||--o{ Review : receives
    Estate ||--o{ QuickOrder : receives
    Review ||--o{ Review : replies_to
    User ||--o{ Review : writes
    
    User {
        int id PK
        string username UK
        string email
        string password
        datetime date_joined
    }
    
    Global_user {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string contact
        string address
        string status
    }
    
    Estate {
        int id PK
        string name
        int capacity
        int free
        string rating
        int price
        int distance
        boolean wifi
        boolean restaurant
        boolean generator
        string room_size
        boolean forage
        text description
        datetime publishedAt
    }
    
    EstateImage {
        int id PK
        int estate_id FK
        image image
    }
    
    Review {
        int id PK
        int estate_id FK
        int parent_id FK
        string name
        int rating
        text comment
        datetime created_at
    }
    
    QuickOrder {
        int id PK
        string estate
        string name
        string phone
        text note
        datetime created_at
    }
    
    ContactRequest {
        int id PK
        string name
        string email
        string phone
        datetime submitted_at
    }

    Conversation {
        int id PK
        int participant1_id FK
        int participant2_id FK
        datetime last_message_at
    }

    Message {
        int id PK
        int conversation_id FK
        int sender_id FK
        text content
        boolean is_read
        datetime created_at
    }

    Conversation ||--o{ Message : contains
    User ||--o{ Conversation : participates
    User ||--o{ Message : sends
```

### Diagramme de Classes

```mermaid
classDiagram
    class User {
        +String username
        +String email
        +String password
        +register()
        +login()
    }
    class Profile {
        +String contact
        +String address
        +String status
        +updateProfile()
    }
    class Estate {
        +String name
        +Integer price
        +Integer capacity
        +create()
        +update()
        +delete()
    }
    class Review {
        +Integer rating
        +String comment
        +publish()
        +reply()
    }
    class Booking {
        +String status
        +confirm()
        +cancel()
    }
    class Conversation {
        +DateTime last_message_at
        +sendMessage()
        +getHistory()
    }
    class Message {
        +String content
        +Boolean is_read
        +markAsRead()
    }

    User "1" -- "1" Profile : has
    User "1" -- "*" Estate : owns (if Owner)
    User "1" -- "*" Review : writes
    User "1" -- "*" Booking : makes
    User "1" -- "*" Conversation : participates
    Conversation "1" -- "*" Message : contains
    Estate "1" -- "*" Review : receives
    Estate "1" -- "*" Booking : receives
```

### 6.2 Description des Modèles

#### Estate (Logement)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| name | String(255) | Nom du logement | Required |
| capacity | Integer | Capacité totale | Default: 1 |
| free | Integer | Places disponibles | Default: 1 |
| rating | String(10) | Note moyenne | Default: "0.0" |
| price | Integer | Prix mensuel (FCFA) | Default: 300000 |
| distance | Integer | Distance campus (m) | Default: 100 |
| wifi | Char(1) | WiFi disponible | Choices: 0/1 |
| restaurant | Char(1) | Restaurant sur place | Choices: 0/1 |
| generator | Char(1) | Générateur | Choices: 0/1 |
| room_size | Char(1) | Taille chambre | Choices: 1/2/3 |
| forage | Char(1) | Forage disponible | Choices: 0/1 |
| description | Text | Description détaillée | Optional |
| publishedAt | DateTime | Date de publication | Auto |

#### Review (Avis)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| estate | ForeignKey | Logement concerné | FK → Estate |
| parent | ForeignKey | Avis parent (si réponse) | FK → Review, Null |
| name | String(100) | Nom de l'auteur | Required |
| rating | Integer | Note (1-5) | Required |
| comment | Text | Commentaire | Required |
| created_at | DateTime | Date de création | Auto |
| likes | ManyToMany | Utilisateurs ayant liké | → User |

#### QuickOrder (Réservation)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| estate | String(255) | Nom du logement | Required |
| name | String(100) | Nom du demandeur | Required |
| phone | String(20) | Téléphone | Required |
| note | Text | Message optionnel | Optional |
| created_at | DateTime | Date de demande | Auto |

#### Global_user (Profil Utilisateur)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| user | OneToOne | Compte Django | FK → User |
| first_name | String(20) | Prénom | Null |
| last_name | String(20) | Nom | Null |
| contact | String(13) | Téléphone | Null |
| address | String(50) | Adresse | Null |
| status | String(20) | Type de compte | Choices: 1/2/3/4 |

**Types de comptes (status) :**
- 1 = Student (Étudiant)
- 2 = Parent
- 3 = Local resident (Résident local)
- 4 = Visitor (Visiteur)
- 5 = Owner (Propriétaire)

#### Conversation (Messagerie)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| participant1 | ForeignKey | Premier participant | FK → User |
| participant2 | ForeignKey | Second participant | FK → User |
| last_message_at | DateTime | Date dernier message | Auto (update) |

#### Message (Messagerie)

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | Integer | Identifiant unique | PK, Auto |
| conversation | ForeignKey | Conversation liée | FK → Conversation |
| sender | ForeignKey | Expéditeur | FK → User |
| content | Text | Contenu du message | Required |
| is_read | Boolean | Lu par le destinataire | Default: False |
| created_at | DateTime | Date d'envoi | Auto |

---

## 7. Interfaces Utilisateur

### 7.1 Pages Principales

#### Page d'Accueil (index.html)

**URL :** `/`  
**Accessible :** Tous (connectés ou non)

**Contenu :**
- Header avec navigation (Accueil, Contact, Login/Dashboard)
- Section hero avec titre et CTA
- Filtres de recherche :
  - Prix (min-max)
  - Distance
  - Équipements (checkboxes)
  - Note minimale
- Grille de logements (cards)
- Footer

**Interactions :**
- Filtrage dynamique (JavaScript)
- Clic sur card → Détails logement (modal ou page)
- Bouton "Réserver" → Formulaire réservation

---

#### Dashboard Utilisateur (dashboard.html)

**URL :** `/dashboard/`  
**Accessible :** Utilisateurs connectés uniquement

**Sections :**

1. **Mes Réservations**
   - Tableau avec : Date, Logement, Téléphone, Note, Actions
   - Actions : Supprimer

2. **Mes Avis**
   - Tableau avec : Date, Logement, Note, Commentaire, Actions
   - Actions : Éditer, Supprimer

3. **Mes Contacts**
   - Tableau avec : Date, Email, Téléphone, Actions
   - Actions : Supprimer

**Navigation :**
- Onglets ou sections scrollables
- Boutons d'action clairs

---

#### Page de Réservation (quick_order.html)

**URL :** `/quick-order/`  
**Accessible :** Utilisateurs connectés

**Formulaire :**
- Sélection du logement (dropdown)
- Nom (pré-rempli)
- Téléphone
- Note/Message (textarea)
- Bouton "Soumettre la demande"

**Validation :**
- Tous les champs requis sauf "Note"
- Format téléphone valide
- Message de confirmation après soumission

---

#### Page d'Avis (review.html)

**URL :** `/review/`  
**Accessible :** Utilisateurs connectés

**Formulaire :**
- Sélection du logement
- Note (étoiles cliquables)
- Commentaire (textarea)
- Bouton "Publier l'avis"

**Affichage des avis :**
- Liste des avis existants
- Possibilité de répondre
- Système de likes
- Tri par date

---

### 7.2 Wireframes Simplifiés

#### Page d'Accueil

```
+--------------------------------------------------+
|  LOGO    Accueil  Contact  [Login/Dashboard]    |
+--------------------------------------------------+
|                                                  |
|     Trouvez votre logement étudiant idéal       |
|              [Rechercher maintenant]             |
|                                                  |
+--------------------------------------------------+
|  Filtres:                                        |
|  Prix: [___] - [___]  Distance: [___]           |
|  [x] WiFi  [ ] Restaurant  [x] Générateur       |
+--------------------------------------------------+
|  +------------+  +------------+  +------------+  |
|  | Photo      |  | Photo      |  | Photo      |  |
|  | Nom        |  | Nom        |  | Nom        |  |
|  | Prix       |  | Prix       |  | Prix       |  |
|  | ⭐⭐⭐⭐☆    |  | ⭐⭐⭐⭐⭐    |  | ⭐⭐⭐☆☆    |  |
|  | [Réserver] |  | [Réserver] |  | [Réserver] |  |
|  +------------+  +------------+  +------------+  |
+--------------------------------------------------+
|  Footer: © Eyang Estate 2025                    |
+--------------------------------------------------+
```

#### Dashboard

```
+--------------------------------------------------+
|  LOGO    Accueil  Contact  [Mon Profil] [Logout]|
+--------------------------------------------------+
|  Bienvenue, [Nom Utilisateur]                   |
+--------------------------------------------------+
|  [Mes Réservations] [Mes Avis] [Mes Contacts]   |
+--------------------------------------------------+
|                                                  |
|  Mes Réservations:                               |
|  +--------------------------------------------+  |
|  | Date       | Logement  | Tel    | [Suppr]|  |
|  | 2025-12-20 | Appart A  | 691... | [X]    |  |
|  | 2025-12-15 | Chambre B | 677... | [X]    |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

---

## 8. Plan de Développement

### 8.1 Phases du Projet

Le développement du MVP est organisé en **4 sprints de 2 semaines** :

#### Sprint 1 : Fondations & Services Core (Semaines 1-2)

**Objectifs :**
- ✅ Configuration de l'environnement
- ✅ Mise en place de la base de données
- ✅ Structure Modular Monolith
- ✅ Service Users (Authentification)

**Livrables :**
- [x] Structure du projet (config, services, shared)
- [x] Service Users : Modèles, Views, Serializers
- [x] Admin Django configuré
- [ ] Documentation technique de base

**Critères de validation :**
- Structure en place
- Auth fonctionnelle (Service Users)
- Base de données initialisée

---

#### Sprint 2 : Catalogue & Messagerie (Semaines 3-4)

**Objectifs :**
- Service Estates (Catalogue)
- Service Messaging (Messagerie)
- Page d'accueil avec liste de logements

**Livrables :**
- [ ] Service Estates : Modèles, Logique métier
- [ ] Service Messaging : WebSockets, Modèles
- [ ] Page index.html avec grille de logements
- [ ] Filtres dynamiques (JavaScript)

**Critères de validation :**
- Catalogue fonctionnel
- Messagerie temps réel opérationnelle
- Au moins 5 logements de test

---

#### Sprint 3 : Réservations & Avis (Semaines 5-6)

**Objectifs :**
- Service Bookings (Réservations)
- Service Reviews (Avis)
- Dashboard utilisateur

**Livrables :**
- [ ] Service Bookings : Logique de commande
- [ ] Service Reviews : Logique de notation
- [ ] Page dashboard.html
- [ ] API pour avis dynamiques

**Critères de validation :**
- Réservation fonctionnelle via Service
- Publication d'avis opérationnelle via Service
- Dashboard affiche toutes les données utilisateur

---

#### Sprint 4 : Finalisation et Tests (Semaines 7-8)

**Objectifs :**
- Page de contact
- Tests complets
- Optimisations
- Déploiement

**Livrables :**
- [ ] Page contact.html
- [ ] Tests unitaires (models, views)
- [ ] Tests d'intégration
- [ ] Optimisation des requêtes SQL
- [ ] Documentation utilisateur
- [ ] Déploiement en production

**Critères de validation :**
- Tous les tests passent
- Performance acceptable (< 2s par page)
- Site accessible en ligne
- Documentation complète

---

### 8.2 Roadmap Visuelle

```mermaid
gantt
    title Planning MVP Eyang Estate
    dateFormat  YYYY-MM-DD
    section Sprint 1
    Configuration & Modèles     :s1, 2025-12-27, 14d
    section Sprint 2
    Auth & Catalogue            :s2, after s1, 14d
    section Sprint 3
    Réservations & Avis         :s3, after s2, 14d
    section Sprint 4
    Finalisation & Déploiement  :s4, after s3, 14d
```

**Dates clés :**
- 🚀 Début : 27 Décembre 2025
- 🎯 Fin Sprint 1 : 10 Janvier 2026
- 🎯 Fin Sprint 2 : 24 Janvier 2026
- 🎯 Fin Sprint 3 : 7 Février 2026
- ✅ Livraison MVP : 21 Février 2026

---

### 8.3 Ressources Nécessaires

#### Équipe Recommandée

| Rôle | Responsabilités | Temps |
|------|----------------|-------|
| **Développeur Full-Stack** | Backend Django + Frontend | 100% |
| **Designer UI/UX** | Maquettes, CSS, expérience utilisateur | 30% |
| **Testeur QA** | Tests fonctionnels, rapports de bugs | 20% |
| **Chef de Projet** | Coordination, suivi, documentation | 20% |

> [!TIP]
> Pour un MVP, une seule personne peut cumuler plusieurs rôles si elle a les compétences.

#### Outils de Développement

- **IDE :** VS Code, PyCharm
- **Versioning :** Git + GitHub/GitLab
- **Gestion de projet :** Trello, Notion, ou GitHub Projects
- **Design :** Figma (maquettes)
- **Communication :** Slack, Discord

---

## 9. Critères d'Acceptation

### 9.1 Critères Fonctionnels

Le MVP sera considéré comme **accepté** si :

| # | Critère | Validation |
|---|---------|------------|
| 1 | Un utilisateur peut s'inscrire et se connecter | ✅ Test manuel |
| 2 | La liste des logements s'affiche avec photos et infos | ✅ Test manuel |
| 3 | Les filtres de recherche fonctionnent correctement | ✅ Test manuel |
| 4 | Un utilisateur connecté peut faire une réservation | ✅ Test manuel |
| 5 | Un utilisateur peut publier un avis avec note | ✅ Test manuel |
| 6 | La note moyenne se calcule automatiquement | ✅ Test unitaire |
| 7 | Le dashboard affiche réservations, avis et contacts | ✅ Test manuel |
| 8 | Un utilisateur peut modifier/supprimer ses avis | ✅ Test manuel |
| 9 | Le système de likes fonctionne | ✅ Test manuel |
| 10 | Le formulaire de contact enregistre les demandes | ✅ Test manuel |

### 9.2 Critères Techniques

| # | Critère | Seuil |
|---|---------|-------|
| 1 | Temps de chargement page d'accueil | < 2 secondes |
| 2 | Temps de réponse API avis | < 500 ms |
| 3 | Compatibilité navigateurs | Chrome, Firefox, Safari, Edge |
| 4 | Responsive design | Desktop + Tablette + Mobile |
| 5 | Taux de disponibilité | > 99% |
| 6 | Sécurité HTTPS | Obligatoire en production |
| 7 | Couverture de tests | > 70% du code |

### 9.3 Critères de Qualité

> [!IMPORTANT]
> Les critères suivants garantissent une expérience utilisateur de qualité :

- **Ergonomie :** Navigation intuitive, maximum 3 clics pour toute action
- **Accessibilité :** Contraste suffisant, textes lisibles (min 14px)
- **Performance :** Pas de lag perceptible sur les interactions
- **Fiabilité :** Pas de bugs bloquants, messages d'erreur clairs
- **Documentation :** README complet, guide utilisateur disponible

---

## 10. Contraintes et Risques

### 10.1 Contraintes

#### Contraintes Techniques

| Contrainte | Impact | Mitigation |
|-----------|--------|------------|
| SQLite limité en concurrence | Performance si trafic élevé | Migration vers PostgreSQL prévue |
| Pas de CDN pour images | Temps de chargement | Optimisation images (compression) |
| Hébergement gratuit limité | Ressources restreintes | Choisir hébergeur adapté (DigitalOcean) |

#### Contraintes Budgétaires

- Budget MVP : **À définir**
- Hébergement : ~10-20 €/mois (DigitalOcean, Heroku)
- Domaine : ~10 €/an
- Total estimé : **< 300 € la première année**

#### Contraintes Temporelles

- **Deadline stricte :** 21 Février 2026 (8 semaines)
- Pas de marge pour retards importants
- Priorisation des fonctionnalités essentielles

---

### 10.2 Risques Identifiés

#### Risques Techniques

| Risque | Probabilité | Impact | Plan de mitigation |
|--------|-------------|--------|-------------------|
| **Problèmes de performance avec SQLite** | Moyenne | Élevé | Tests de charge, migration PostgreSQL si nécessaire |
| **Bugs dans le système d'avis** | Faible | Moyen | Tests unitaires complets, revue de code |
| **Problèmes de compatibilité navigateurs** | Faible | Faible | Tests cross-browser réguliers |
| **Failles de sécurité** | Faible | Critique | Audit de sécurité, respect des best practices Django |

#### Risques Projet

| Risque | Probabilité | Impact | Plan de mitigation |
|--------|-------------|--------|-------------------|
| **Retard dans le développement** | Moyenne | Élevé | Sprints courts, revues hebdomadaires, priorisation stricte |
| **Changement de scope** | Moyenne | Élevé | Cahier des charges validé, gestion stricte des demandes |
| **Manque de ressources** | Faible | Moyen | Planification réaliste, externalisation si besoin |
| **Problèmes de déploiement** | Faible | Moyen | Tests de déploiement en avance, documentation |

#### Risques Utilisateurs

| Risque | Probabilité | Impact | Plan de mitigation |
|--------|-------------|--------|-------------------|
| **Faible adoption initiale** | Moyenne | Moyen | Campagne de communication, onboarding simplifié |
| **Feedback négatif sur UX** | Faible | Moyen | Tests utilisateurs avant lancement, itérations rapides |
| **Données de test insuffisantes** | Moyenne | Faible | Création de jeu de données réaliste |

---

### 10.3 Plan de Contingence

> [!WARNING]
> En cas de problème majeur, appliquer les mesures suivantes :

**Si retard > 1 semaine :**
1. Réunion d'urgence pour identifier les blocages
2. Réduction du scope (fonctionnalités secondaires)
3. Augmentation temporaire des ressources

**Si bug critique en production :**
1. Rollback immédiat vers version stable
2. Hotfix en priorité absolue
3. Post-mortem et amélioration des tests

**Si problème de performance :**
1. Profiling de l'application
2. Optimisation des requêtes SQL
3. Migration vers PostgreSQL si nécessaire
4. Mise en cache (Redis) si besoin

---

## 📊 Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **MVP** | Minimum Viable Product - Version minimale fonctionnelle |
| **Estate** | Logement/Chambre estudiantine |
| **Quick Order** | Demande de réservation rapide |
| **Dashboard** | Tableau de bord utilisateur |
| **CRUD** | Create, Read, Update, Delete |
| **ORM** | Object-Relational Mapping |

### B. Références

- [Documentation Django](https://docs.djangoproject.com/)
- [Django Best Practices](https://django-best-practices.readthedocs.io/)
- [Python Style Guide (PEP 8)](https://pep8.org/)

### C. Contacts

**Chef de Projet :** [À définir]  
**Développeur Principal :** [À définir]  
**Email Support :** support@eyang-estate.com (à créer)

---

## ✅ Validation du Cahier des Charges

**Date de rédaction :** 27 Décembre 2025  
**Version :** 1.0  
**Statut :** 🟡 En attente de validation

**Signatures :**

| Rôle | Nom | Signature | Date |
|------|-----|-----------|------|
| Chef de Projet | __________ | __________ | ______ |
| Développeur | __________ | __________ | ______ |
| Client/Sponsor | __________ | __________ | ______ |

---

**Document généré pour le projet Eyang Estate**  
*Plateforme de gestion des chambres estudiantines*

