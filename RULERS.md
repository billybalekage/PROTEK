Ce fichier contient les regles de calculs et cere de model pour implementer le dimensionnement.

1. Choix, dimensionnement, et coordination des protections electrique

1.1 Distinction entre calculs et verification normatives

    1.1.1 Le courant d'emploie (Ib) : il se calcule a partir de la puissance installee et de la tension, en tenant compte du facteur de puissance et du coeficient de simmultaneiltes

        --> Facteur de puissance: 
        --> Coeficient de simultaneites : 

    1.1.2 La capacites de transport de conducteurs (Iz) : verification normative. Iz n'est pas calculé directement par une formule mathematique directe. mais determiné par un processus de selections/recherche dans les tableaux normatifs. En fonction du mode de pose(encastré, sous conduit, etc,),de la nature de l'isolant(PVC, XLPE) et de la temperature ambiante, on applique des coeficients de correction (K1,K2, etc.) pour trouver un cables dont la capacité corrigée répond à la règle: Iz >= In (Ou Iz >= I2 Selon le cas de surcharge)

    1.1.3 La chute de tension : Calcul et verification: c'est un calcul mathematique basé sur la longeur du cable, la resistivites du materiau (cuivre ou aluminium), le courant Ib et la reactance. le resultat doit ensuite etre verifié face au seuils limites normatif (ex: 3% pour l'eclairage, 5% pour la force electromotricem)

    1.1.4 Les courant de court-circuit (Icc) : Calculés aux differents point de l'installation (Origine ou extremites de circuit) pour s'assurer que le pouvoir de coupure (Pdc) des disjoncteurs est superieur ou egale au Icc maximal présumé

1.2 Le graphe de dependance: 

L'ordre sequentiel d'un circuit electrique dans le moteur de calcul doit respecter une hierarchie stricte (pour chaque circuit): 
    [Puissance installee, type de charge]
                |
                |
        1. Courant d'emploi (Ib) --> Calul avec une formule mathematique
                |
                |
        2.Choix du calibre de protection (In) --> Choix Normalisé (tablaux normatifs)
                |
                |
        3. Recherche de la section de cables (s) --> Verification normative : Iz >= In
                |
                |
        4. Calcul de la chute de tension --> Verification normative : Chute de tension <=Seuil max
                |
                |
        5. Calcul des courant des cour-circuit (Icc) --> Verification du pouvoir de coupure

1.3 Element intervenant dans la determination de la protection de chaque circuit

    1. Disjoncteur de protection contre les surintensites/courts-circuits
        a. Le courant d'emploie: la protection doit respecter la regle fondamentale : Ib <= In <= Iz. Le calibre nominal (In) du disjoncteur est choisi immediatement superieur ou egale à Ib, parmi les valeurs normalisées

        b. La nature de la charge: Une charge fortement inductive( moteur, transformateurs) impose une courbe de declenchement specifique (courbe D) pour encaisser les courant sans declancher intempestivement, contrairement a un circuit d'eclairage classique (Courbe C)

        c. Le Icc maximal: Le disjoncteur doit avoir un pouvoir de coupure superieur au court-circuit franc a sont point d'installation



1.4 Protection differentient : voir l'architecture normative de l'installation