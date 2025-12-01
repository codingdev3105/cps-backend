// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------
// Configuration
// ------------------
const DB_PATH = path.resolve(__dirname, 'groups.json');
const MAX_LOGS_PER_GROUP = 20;

let groups = {};

// Charger au démarrage
if (fs.existsSync(DB_PATH)) {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    groups = JSON.parse(data);
    console.log('✅ Données chargées depuis groups.json');
  } catch (err) {
    console.error('⚠️ Erreur lors du chargement du fichier groups.json, initialisation vide.');
    groups = {};
  }
}

// Sauvegarde asynchrone (non bloquante)
function saveGroups() {
  fs.writeFile(DB_PATH, JSON.stringify(groups, null, 2), (err) => {
    if (err) console.error('❌ Échec de la sauvegarde des données :', err);
  });
}

// ------------------
// Créer un nouveau groupe (optionnel, car auto-création dans /data)
// ------------------
app.post('/groups', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom de groupe requis' });
  if (groups[name]) return res.status(400).json({ error: 'Groupe existant' });

  groups[name] = [];
  saveGroups();
  return res.json({ message: `Groupe ${name} créé`, name });
});

// ------------------
// Supprimer un groupe (ADMIN)
// ------------------
app.delete('/groups/:name', (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({ error: 'Nom du groupe requis' });
  }

  if (!groups[name]) {
    return res.status(404).json({ error: `Le groupe "${name}" n'existe pas` });
  }

  delete groups[name];
  saveGroups();

  return res.json({ message: `Groupe "${name}" supprimé avec succès` });
});

// ------------------
// Lister tous les groupes
// ------------------
app.get('/groups', (req, res) => {
  return res.json(Object.keys(groups));
});

// ------------------
// Envoyer data ESP (auto-création du groupe si inexistant)
// ------------------
app.post('/data/:group', (req, res) => {
  const { group } = req.params;
  const { temperature, humidity } = req.body;

  // Validation
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature et humidity doivent être des nombres' });
  }

  // Auto-création du groupe si inexistant
  if (!groups[group]) {
    groups[group] = [];
    console.log(`🔄 Groupe "${group}" créé automatiquement`);
  }

  const log = {
    temperature,
    humidity,
    date: new Date().toISOString(),
    alert: temperature > 20
  };

  // Ajouter le log
  groups[group].push(log);

  // Appliquer FIFO : garder max 20 logs
  if (groups[group].length > MAX_LOGS_PER_GROUP) {
    groups[group].shift(); // Supprime le plus ancien
  }

  saveGroups();

  return res.json({ message: 'Data reçue', log });
});

// ------------------
// Récupérer logs d'un groupe (les 20 derniers)
// ------------------
app.get('/logs/:group', (req, res) => {
  const { group } = req.params;
  if (!groups[group]) {
    return res.status(404).json({ error: `Le groupe ${group} n'existe pas` });
  }
  return res.json(groups[group]);
});

// ------------------
// Lancement serveur
// ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Serveur en écoute sur le port ${PORT}`);
  console.log(`📁 Fichier de données : ${DB_PATH}`);
});