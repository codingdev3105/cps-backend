import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Stockage en mémoire des groupes et logs
const groups = {};

// ------------------
// Créer un nouveau groupe
// ------------------
app.post('/groups', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom de groupe requis' });
  if (groups[name]) return res.status(400).json({ error: 'Groupe existant' });

  groups[name] = [];
  return res.json({ message: `Groupe ${name} créé`, name });
});

// ------------------
// Lister tous les groupes
// ------------------
app.get('/groups', (req, res) => {
  return res.json(Object.keys(groups));
});

// ------------------
// Envoyer data ESP
// ------------------
app.post('/data/:group', (req, res) => {
  const { group } = req.params;
  const { temperature, humidity } = req.body;

  if (!groups[group]) {
    return res.status(404).json({ error: `Le groupe ${group} n'existe pas` });
  }

  const log = {
    temperature,
    humidity,
    date: new Date(),
    alert: temperature > 30
  };
  groups[group].push(log);
  return res.json({ message: 'Data reçue', log });
});

// ------------------
// Récupérer logs d'un groupe
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
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT}`));
