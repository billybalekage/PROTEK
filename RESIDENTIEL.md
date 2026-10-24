# PROTECK — SPÉCIFICATIONS TECHNIQUES : MODULE RÉSIDENTIEL

**Version :** 1.0  
**Stack Technologique :** JavaScript pur (Vanilla JS / Node.js) — _Pas de TypeScript_  
**Normes de Référence :** NF C 15-100 / CEI 60364 (avec adaptation pour réseaux instables, ex: RDC)

---

## 1. OBJECTIFS

Cette première phase pose le socle du moteur de calcul et des règles métier pour les installations électriques résidentielles. L'objectif est de structurer mathématiquement et logiquement le dimensionnement d'un projet de l'origine (compteur/tableau) jusqu'aux circuits terminaux, en garantissant la sécurité des personnes et des biens.

---

## 2. PRINCIPES FONDAMENTAUX : CALCULS VS VÉRIFICATIONS NORMATIVES

Le moteur de calcul sépare strictement les formules mathématiques pures et les processus de validation normative :

### 2.1. Le Courant d'Emploi ($I_b$) — Calcul Mathématique Pur

C'est le point de départ de tout circuit. Il se calcule à partir de la puissance installée, de la tension du réseau, du facteur de puissance et des coefficients de pondération :

- **Formule Monophasé ($U = 230V$) :**  
  $$I_b = \frac{P \times k_u \times k_s}{U \times \cos\varphi}$$

- **Formule Triphasé ($U_L = 400V$) :**  
  $$I_b = \frac{P \times k_u \times k_s}{\sqrt{3} \times U_L \times \cos\varphi}$$

#### Paramètres associés :

- **Facteur de puissance ($\cos\varphi$) :** Mesure le déphasage des charges inductives (moteurs, transformateurs, ballasts). Compris entre $0,85$ et $1$ (ou $0,8$ par défaut pour les prises de courant mixtes).
- **Facteur d'utilisation ($k_u$) :** Propre à chaque récepteur individuel ($0 < k_u \le 1$, par défaut $1$). Traduit le fait qu'un appareil ne tourne pas en permanence à sa puissance max.
- **Facteur de simultanéité ($k_s$) :** S'applique à un ensemble de circuits (ex: rangée de prises, tableau divisionnaire) pour éviter de sommer des puissances qui ne fonctionnent jamais toutes en même temps.

### 2.2. La Capacité de Transport des Conducteurs ($I_z$) — Vérification Normative

- **Principe :** $I_z$ n'est pas calculé par une formule directe, mais déterminé par sélection dans les tables normatives en fonction du mode de pose (encastré, sous conduit), de l'isolant (PVC, XLPE) et de la température.
- **Règle de validation :** $I_z \ge I_n$ (ou $I_z \ge I_2$ selon les surcharges).

### 2.3. La Chute de Tension ($\Delta U$) — Calcul & Vérification

- **Principe :** Calcul mathématique dépendant de la résistivité du conducteur (cuivre/aluminium), de la longueur du câble $L$, du courant $I_b$ et de la section $S$.
- **Règle de validation :** Le pourcentage obtenu ($\Delta U\%$) doit respecter les seuils limites de la norme (ex: $\le 3\%$ pour l'éclairage, $\le 5\%$ pour la force motrice).

### 2.4. Les Courants de Court-Circuit ($I_{cc}$) — Calcul Pur

- **Principe :** Évaluation des $I_{cc}$ maximaux et minimaux aux différents points de l'installation pour s'assurer que le pouvoir de coupure ($P_{dc}$) des protections est suffisant.

### 2.5. Régime de Neutre et Liaisons à la Terre (Spécificité Résidentielle)

- **Régime de Neutre :** Application prioritaire du **régime TT** (standard résidentiel international et local, ex: RDC) garantissant la coupure par DDR en cas de premier défaut.
- **Résistance de Terre ($R_A$) :** Doit respecter la condition de sécurité associée au seuil du DDR ($R_A \le \frac{50V}{I_{\Delta n}}$, soit généralement $\le 100\ \Omega$ pour un DDR de $30\text{ mA}$).
- **Section du Conducteur de Protection (PE) :** Liée à la section des conducteurs actifs du circuit (ex:

---

## 3. GRAPHE DE DÉPENDANCE LOGIQUE (POUR CHAQUE CIRCUIT)

Le moteur d'exécution JavaScript doit respecter scrupuleusement cet ordre séquentiel de calcul :


[ Puissance Installée (P) & Nature de la Charge ]
                   │
                   ▼
 1. Courant d'emploi (Ib) ──────────────────► [ Calcul mathématique pur ]
                   │
                   ▼
 2. Calibre de protection (In) ─────────────► [ Sélection dans les valeurs normalisées : 10A, 16A, 20A... ]
                   │
                   ▼
 3. Section du câble (S) & Iz ──────────────► [ Vérification normative : Iz >= In ]
                   │
                   ▼
 4. Chute de tension (ΔU%) ─────────────────► [ Vérification normative : ΔU <= Seuil max ]
                   │
                   ▼
 5. Courants de court-circuit (Icc) ────────► [ Vérification du Pouvoir de Coupure (Pdc) ]
```

---

## 4. RÈGLES DE SÉLECTION DES PROTECTIONS RÉSIDENTIELLES

### 4.1. Disjoncteur Divisionnaire (Protection Surintensités / Courts-circuits)

- **Règle fondamentale :** $I_b \le I_n \le I_z$. Le calibre nominal $I_n$ est immédiatement supérieur ou égal à $I_b$ parmi les calibres normalisés.
- **Courbe de déclenchement :**
  - **Courbe C** par défaut (éclairage, prises résidentielles standard).
  - **Courbe D** pour les charges à fort courant d'appel inductif (moteurs, pompes de forage, climatisations).

### 4.2. Dispositifs Différentiels à Courant Résiduel (DDR)

- **Architecture par groupes (Interrupteurs Différentiels) :** En résidentiel, on n'impose pas obligatoirement un DDR par circuit individuel, mais un regroupement par rangées sous des interrupteurs différentiels en tête de tableau.
- **Sensibilité (mA) & Type (AC, A, F) :**
  - $30\text{ mA}$ obligatoire pour la protection des personnes dans les locaux d'habitation.
  - **Type A** requis dès qu'un circuit du groupe comporte de l'électronique de puissance (lave-linge, plaques de cuisson, onduleurs).

---

## 5. COORDINATION DES PROTECTIONS ÉLECTRIQUES (MODULE RÉSIDENTIEL)

La coordination des protections s'articule autour de trois piliers normatifs majeurs (NF C 15-100 / CEI 60364) : la règle de compatibilité thermique conducteur/protection, la sélectivité (continuité de service) et la filiation.

### 5.1. La Règle de Coordination Conducteur / Protection (Surcharges)

Pour qu'un circuit soit protégé contre les surcharges, le dispositif de protection et le câble doivent obéir simultanément à deux conditions fondamentales :

- **Première condition (Calibre de protection) :**  
  $$I_b \leq I_n \leq I_z$$
  - $I_b$ : Courant d'emploi du circuit.
  - $I_n$ : Calibre nominal du disjoncteur.
  - $I_z$ : Courant admissible corrigé dans le câble.

- **Deuxième condition (Capacité de fusion / déclenchement thermique) :**  
  $$I_2 \le 1.45 \times I_z$$
  - $I_2$ : Courant conventionnel de déclenchement du disjoncteur (généralement $1.45 \times I_n$ pour un disjoncteur domestique standard).
  - Cette règle garantit que le câble ne subira pas d'échauffement destructeur avant que le disjoncteur ne coupe le circuit en cas de surcharge prolongée.

### 5.2. La Sélectivité (Discrimination) — Continuité de Service

La sélectivité garantit qu'en cas de défaut (surcharge ou court-circuit) sur un circuit terminal, seul le dispositif de protection situé immédiatement en amont du défaut déclenche, laissant le reste de l'installation sous tension.

- **Sélectivité Ampèremétrique (sur les surintensités) :**
  - Obtenue en étalonnant les calibres de manière décroissante du départ vers l'arrivée.
  - **Règle empirique :** Pour assurer une bonne sélectivité entre deux disjoncteurs en série, le rapport des calibres doit généralement être d'au moins **1,6 à 2** (ex: un disjoncteur général de 32A en amont protégeant un sous-circuit de 16A).
- **Sélectivité Différentielle (pour les DDR) :**
  - Empêche qu'un petit défaut d'isolement sur un circuit ne coupe l'ensemble de l'habitation.
  - On associe par exemple un DDR de type "S" (sélectif) ou retardé en tête d'installation (ex: 300 mA sélectif) avec des DDR de 30 mA en aval pour les circuits terminaux. En résidentiel standard, la protection des personnes impose 30 mA au niveau des tableaux divisionnaires ou des interrupteurs différentiels de rangée.

### 5.3. La Filiation (Backing ou Coordination de Construction)

- **Principe :** La filiation est une technique de renforcement du pouvoir de coupure. Elle permet d'installer en aval un disjoncteur dont le pouvoir de coupure ($P_{dc}$) est inférieur au courant de court-circuit présumé à son point d'installation, grâce à la limitation d'énergie assurée par le disjoncteur amont (généralement le disjoncteur de branchement ou le disjoncteur général).
- **Application dans PROTECK :** Le moteur de calcul doit intégrer les tableaux de co-ordination fournis par les fabricants (ex: Schneider Electric, Legrand) pour valider si un ensemble de disjoncteurs en cascade bénéficie de la filiation, évitant ainsi de surdimensionner inutilement le matériel en aval.

### 5.4. Rôle et Intégration dans le Moteur de Calcul JavaScript (Clean Architecture)

Dans le dossier `/server/src/core/electric-rules/`, les règles de coordination se traduiront sous forme de fonctions pures (sans effets de bord, testées unitairement via Vitest/Jest) :

- Une fonction de validation de la contrainte thermique ($I_n \leq I_z$ et $I_2 \leq 1.45 \times I_z$).
- Une fonction de vérification de la sélectivité ampèremétrique entre les nœuds parents et enfants de l'arbre des circuits.
- Une fonction de contrôle du pouvoir de coupure tenant compte de la filiation amont.

---

## 6. LE CHOIX DES COMPOSANTS ET DU MATÉRIEL (MODULE RÉSIDENTIEL)

Une fois le dimensionnement validé ($I_b \le I_n \le I_z$, $\Delta U \le \text{limite}$, et $P_{dc} \ge I_{cc}$), le moteur de sélection doit associer chaque circuit à des équipements aux normes du marché.

### 6.1. Choix de la Section du Câble ($S$)

Le calcul de vérification donne une section minimale théorique (ex: $2.3\text{ mm}^2$). Le moteur doit arrondir automatiquement vers la section commerciale normalisée immédiatement supérieure :

- **Sections normalisées en Cuivre (Cu) usuelles :** $1.5\text{ mm}^2$, $2.5\text{ mm}^2$, $4\text{ mm}^2$, $6\text{ mm}^2$, $10\text{ mm}^2$, $16\text{ mm}^2$, $25\text{ mm}^2$, etc.
- **Critères de sélection :**
  - **Éclairage :** Minimum $1.5\text{ mm}^2$ (protégé par disjoncteur $\le 16\text{ A}$).
  - **Prises de courant standard :** Minimum $2.5\text{ mm}^2$ (protégé par disjoncteur $\le 20\text{ A}$).
  - **Plaques de cuisson / Gros électroménager :** $6\text{ mm}^2$ (protégé par disjoncteur $\le 32\text{ A}$).

### 6.2. Choix du Calibre et de la Courbe du Disjoncteur

Le disjoncteur divisionnaire est sélectionné parmi les calibres normalisés de l'appareillage modulaire :

- **Calibres normalisés ($I_n$) :** 2A, 6A, 10A, 16A, 20A, 25A, 32A, 40A, 50A, 63A.
- **Choix de la courbe :**
  - **Courbe B :** Générateurs, très longues lignes (déclenchement très sensible).
  - **Courbe C :** Usage général résidentiel (prises, éclairage, radiateurs).
  - **Courbe D :** Moteurs, pompes, transformateurs (charges à fort appel de courant).

### 6.3. Choix du Dispositif Différentiel (DDR)

Le choix s'effectue selon l'emplacement et la typologie des charges rattachées au nœud :

- **Sensibilité :**
  - $30\text{ mA}$ : Obligatoire pour la protection des personnes (locaux d'habitation).
  - $300\text{ mA}$ ou $500\text{ mA}$ : Protection incendie / tête d'installation générale.
- **Type de DDR :**
  - **Type AC :** Courants alternatifs sinusoïdaux purs (éclairage classique, chauffage).
  - **Type A :** Défaut à composante continue (machines à laver, plaques à induction, liseuses électroniques, onduleurs).
  - **Type F ou B :** Variateurs de vitesse, installations photovoltaïques complexes (gestion des fréquences et courants continus lissés).

### 6.4. Adaptation Spécifique pour Réseaux Instables (Contexte RDC / SNEL)

Dans le cadre de PROTECK et des contextes de réseaux instables (micro-coupures, variations de tension chroniques) :

- **Marges de sécurité sur les calibres :** Intégration d'un coefficient de surdimensionnement optionnel géré par l'utilisateur pour anticiper l'échauffement lié aux baisses de tension prolongées (qui augmentent l'appel de courant $I_b$ pour une même puissance restituée).
- **Protections associées conseillées :** Recommandation automatique de modules de protection de surtension/sous-tension (relais de tension réglables) en amont du tableau principal pour protéger les équipements sensibles face aux instabilités du réseau de distribution local.

## 7. Données et état du moteur résidentiel

Les tables de température, de groupement, de capacité de transport et de filiation résident dans `server/src/core/electric-rules/residential/data/`. Chaque fichier conserve les métadonnées de source, d'édition, de saisie et de seconde vérification. Le chargeur bloque l'accès aux tables si les champs de vérification ne sont pas renseignés et si leur statut n'est pas `verified`; seul `NODE_ENV=test` autorise les jeux de données non vérifiés. Les fichiers présents contiennent des brouillons, pas des valeurs validées : ils ne doivent pas servir à un dimensionnement de chantier avant vérification indépendante.

Pour publier un jeu de données, renseigner l'édition et la table exactes, l'auteur de la saisie, le relecteur indépendant, l'horodatage ISO de vérification, puis le statut `verified`. Ajouter la référence de source associée aux valeurs et des cas d'exemple documentés avant activation. Les essais utilisant les brouillons actuels sont des tests algorithmiques, pas des validations normatives issues d'un guide fabricant.

`designCircuit()` enchaîne $I_b$, $I_n$, la section et $I_z$, puis la chute de tension si une longueur est fournie. Les contrôles incluent $I_b \le I_n \le I_z$ et $I_2 \le 1{,}45 I_z$. Le mode de pose doit être couvert par une ligne de table; sinon l'outil refuse de dimensionner et demande une justification hors outil.

Les modules purs exposés calculent aussi la section PE, la limite de sécurité de $R_A$ (affichée séparément de la recommandation de 100 Ω), les courants de court-circuit à partir d'une donnée amont obligatoire et d'un coefficient de tension maximal explicite, puis les contrôles Pdc/déclenchement. Ne pas utiliser de valeur Icc générique à la place d'une donnée distributeur ou d'une mesure site. Le modèle de court-circuit est une approximation à valider avec le réseau et le régime de neutre réels. La sélectivité ampèremétrique est une règle empirique; la sélectivité garantie et la filiation nécessitent les tableaux et références constructeur. Les types DDR AC/A/F/B suivent la classe de charge saisie et restent à confirmer par la notice de l'appareil.

L'adaptation réseau instable peut majorer $I_b$ pour une tension minimale saisie et recommande alors un relais de tension. Les valeurs de réseau et de protection restent à établir pour l'installation concernée.
