# M3A Yango — Plateforme de suivi VTC Dakar

Système de suivi opérationnel pour flotte Yango — M3A Solution, Dakar, Sénégal.

## 🌐 Accès en production

| Interface | URL |
|---|---|
| **Landing Page** | https://gueyea66.github.io/m3a-yango/ |
| **Espace Chauffeur** | https://gueyea66.github.io/m3a-yango/chauffeur.html |
| **Espace Propriétaire** | https://gueyea66.github.io/m3a-yango/admin.html |

## ⚙️ Architecture

```
Frontend (GitHub Pages)  →  fetch() CORS  →  Backend (Apps Script)  →  Google Sheets
```

- **Frontend** : GitHub Pages — HTML/CSS/JS statique (ce repo)
- **Backend** : Google Apps Script déployé en Web App
- **DB** : Google Spreadsheet (compte gueye.a66@gmail.com)
- **Backend URL** : `https://script.google.com/macros/s/AKfycbyCr1QUqofrrxFHUeamWUtQrRKhmEIpBcgQ2srNsxxKZm_A2PyCJI-_7eW3-sgRYjVDIA/exec`

## 📋 Statut déploiement

- [x] GitHub Pages actif — frontend en ligne
- [x] Backend Apps Script déployé et répondant
- [x] Base de données Google Sheets initialisée (7 onglets)
- [x] Compte chauffeur Kia K3 actif (`k3`)
- [ ] Mot de passe admin à réinitialiser
- [ ] Notifications WhatsApp (CallMeBot) à configurer
- [ ] Import données v1 (optionnel)
- [ ] Ajout véhicule 2 — Chevrolet Orlando

## 🚗 Véhicules

| Véhicule | Compte | Plaque | Statut |
|---|---|---|---|
| Kia K3 (diesel, automatique) | `k3` | AB-872-JG | ✅ Actif |
| Chevrolet Orlando (7 places) | À créer | — | 🔜 À venir |

## Fonctionnalités

- Saisie quotidienne chauffeur (courses Yango, CA, carburant, km, photos)
- Validation propriétaire avec photos
- Journal centralisé + statistiques
- Notifications email automatiques (à chaque soumission)
- Notifications WhatsApp via CallMeBot (optionnel)
- Import historique depuis v1 (localStorage)

---
*M3A Group — Transport VTC Dakar — Déployé le 29/05/2026*
