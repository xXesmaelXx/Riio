'use strict';
// Characters, hats, minigame registry and the Adventure story.

const CHARS = {
  pico: { id: 'pico', name: 'Pico', species: 'parrot', desc: 'A big-hearted scarlet parrot who has never danced at the Fiesta.',
    body: '#e8322f', belly: '#ffb02e', wing: '#2f6fe0', wingTip: '#ffd23f', head: '#ef3b36', beak: '#f3e9d2', cheek: '#ffd9c2',
    tail: ['#e8322f', '#2f6fe0', '#ffd23f'], speed: 1, power: 1 },
  tuca: { id: 'tuca', name: 'Tuca', species: 'toucan', desc: "Pico's toucan best friend. Strong, loud and always hungry.",
    body: '#1d1d26', belly: '#fff4d6', wing: '#2b2b36', head: '#1d1d26', beak: '#ff7a1a', eyeRing: '#53c1ff', cheek: '#fff4d6',
    tail: ['#14141b'], speed: 0.95, power: 1.2 },
  zuzu: { id: 'zuzu', name: 'Zuzu', species: 'hummingbird', desc: 'A lightning-fast hummingbird courier from Old Town.',
    body: '#2ec27e', belly: '#c8f7d0', wing: '#9be7ff', head: '#26a96c', beak: '#3a2a20', cheek: '#d6338a', crest: '#7d3cff',
    tail: ['#1f8f5a'], speed: 1.15, power: 0.85 },
  nina: { id: 'nina', name: 'Nina', species: 'spoonbill', desc: 'A graceful spoonbill who is the best dancer in the jungle.',
    body: '#ff8fb3', belly: '#ffd1e0', wing: '#e5527f', wingTip: '#c2185b', head: '#ffa6c3', beak: '#b9a2a8', legs: '#d9536f',
    tail: ['#e5527f'], speed: 1.05, power: 1 },
  corvo: { id: 'corvo', name: 'Don Corvo', species: 'crow', desc: 'The grumpy crow who stole the Golden Drum. Not so bad after all.',
    body: '#2a2340', belly: '#3d3358', wing: '#1a1530', head: '#2a2340', beak: '#e0b33a', pupil: '#c0392b', brow: true,
    tail: ['#1a1530', '#2a2340'], speed: 1.05, power: 1.15 },
  tio: { id: 'tio', name: 'Tio Lorito', species: 'parrot', desc: 'The wise old parrot who keeps the Golden Drum.',
    body: '#7fae5b', belly: '#d8e7b0', wing: '#4f7f3a', head: '#93c06e', beak: '#d9d2c0', crest: '#c9d86b', cheek: '#eef5d2',
    tail: ['#4f7f3a', '#c9d86b'], speed: 1, power: 1 },
};
const PLAYABLE = ['pico', 'tuca', 'zuzu', 'nina', 'corvo'];
const PCOLORS = ['#ff4d6d', '#4d9bff', '#3ddc84', '#ffc93c'];

const HATS = [
  { id: 'none', name: 'No Hat', price: 0 },
  { id: 'party', name: 'Party Hat', price: 25 },
  { id: 'bow', name: 'Big Bow', price: 40 },
  { id: 'flowers', name: 'Flower Crown', price: 60 },
  { id: 'shades', name: 'Cool Shades', price: 75 },
  { id: 'straw', name: 'Straw Hat', price: 90 },
  { id: 'headphones', name: 'Headphones', price: 110 },
  { id: 'sombrero', name: 'Fiesta Sombrero', price: 140 },
  { id: 'tophat', name: 'Top Hat', price: 170 },
  { id: 'captain', name: 'Captain Hat', price: 200 },
  { id: 'feathers', name: 'Carnival Plumes', price: 260 },
  { id: 'crown', name: 'Golden Crown', price: 450 },
];

const GAMES = {};
const GAME_ORDER = [];
function registerGame(def) { GAMES[def.id] = def; GAME_ORDER.push(def.id); }

// ---------- Adventure ----------
const CHAPTERS = [
  {
    id: 'beach', name: 'Sunny Shore', theme: 'beach', piece: 'Drum Rim',
    intro: [
      { who: 'tio', text: 'Pico! Tuca! Terrible news! The Golden Drum that starts the Feather Fiesta has been stolen!' },
      { who: 'pico', text: 'Stolen?! But the parade is in five days! Without the drum, there is no rhythm, no dancing...' },
      { who: 'tio', text: 'A black-feathered thief broke it into five pieces and scattered them across Vila Brisa.' },
      { who: 'tuca', text: 'Then we find them all! I saw something shiny wash up on the beach this morning.' },
      { who: 'tio', text: 'The beach birds will only help champions. Show them what you can do!' },
    ],
    outro: [
      { who: 'tuca', text: 'The Drum Rim! It was buried under a coconut pile.' },
      { who: 'pico', text: 'One down, four to go. Look, crow feathers... they lead toward Old Town!' },
    ],
    stages: [
      { id: 'beach1', game: 'fruit', name: 'Coconut Cove', goal: [12, 18, 24], label: 'Catch {g} points of fruit', params: { duration: 45 } },
      { id: 'beach2', game: 'bump', name: 'Sandbar Shove', goal: [3, 5, 7], label: 'Score {g} knockouts', params: { duration: 60 } },
    ],
  },
  {
    id: 'oldtown', name: 'Old Town', theme: 'market', piece: 'Drum Skin',
    intro: [
      { who: 'zuzu', text: 'Bzzzt! Hey, you two! You are looking for the drum, right? I deliver everything in Old Town.' },
      { who: 'zuzu', text: 'A grumpy crow hung a drum piece inside a party piñata. Pop them all and you will find it!' },
      { who: 'pico', text: 'Piñatas? Now THAT sounds like my kind of detective work.' },
    ],
    outro: [
      { who: 'zuzu', text: 'Got it! The Drum Skin! You two are fast... almost as fast as me. I am coming with you!' },
      { who: 'tio', text: 'Zuzu has joined the flock! The next piece was carried up to the Cloud Hills.' },
    ],
    unlockChar: 'zuzu',
    stages: [
      { id: 'town1', game: 'pinata', name: 'Piñata Plaza', goal: [250, 380, 500], label: 'Score {g} points', params: { duration: 45 } },
      { id: 'town2', game: 'rooftop', name: 'Tile Run', goal: [300, 400, 480], label: 'Run {g} metres', params: { duration: 45 } },
    ],
  },
  {
    id: 'hills', name: 'Cloud Hills', theme: 'sky', piece: 'Drum Sticks',
    intro: [
      { who: 'pico', text: 'Whoa... it is windy up here. I can see the whole city!' },
      { who: 'tuca', text: 'The wind birds race through the cloud rings every day. Win their race and they will share what they saw.' },
      { who: 'zuzu', text: 'Watch out for the storm clouds. One zap and your feathers stand up for a week!' },
    ],
    outro: [
      { who: 'tuca', text: 'The Drum Sticks were stuck in a fruit tree all along!' },
      { who: 'zuzu', text: 'The wind birds saw the crow fly toward the jungle river. Let us go!' },
    ],
    stages: [
      { id: 'hills1', game: 'rings', name: 'Ring Rally', goal: [14, 20, 26], label: 'Collect {g} ring points', params: { duration: 45 } },
      { id: 'hills2', game: 'fruit', name: 'Treetop Feast', goal: [22, 30, 38], label: 'Catch {g} points of fruit', params: { duration: 45, hard: true } },
    ],
  },
  {
    id: 'jungle', name: 'Jungle River', theme: 'jungle', piece: 'Drum Strap',
    intro: [
      { who: 'nina', text: 'Halt! Who splashes into my jungle without dancing first?' },
      { who: 'pico', text: 'Uh... I am Pico. I cannot really dance. But we need to get the drum back for the Fiesta!' },
      { who: 'nina', text: 'The Fiesta? Then ride the rapids with me. The crow dropped something shiny down the river.' },
    ],
    outro: [
      { who: 'nina', text: 'The Drum Strap! You are brave, little parrot. I will teach you to dance at the parade.' },
      { who: 'tio', text: 'Four pieces! The last one... the crow is holding it himself. He is waiting at the Grand Parade!' },
    ],
    unlockChar: 'nina',
    stages: [
      { id: 'jungle1', game: 'river', name: 'Rapid Rush', goal: [180, 280, 380], label: 'Score {g} points', params: { duration: 45 } },
      { id: 'jungle2', game: 'pinata', name: 'Canopy Pop', goal: [350, 480, 600], label: 'Score {g} points', params: { duration: 45, hard: true } },
    ],
  },
  {
    id: 'parade', name: 'Grand Parade', theme: 'carnival', piece: 'Drum Heart',
    intro: [
      { who: 'corvo', text: 'Ha! So the little parrot made it. Every year this city dances, and NOBODY ever invites Don Corvo!' },
      { who: 'pico', text: 'So you stole the drum because you were left out? You could have just asked to join!' },
      { who: 'corvo', text: 'Join? Hmph. Prove you have rhythm first. Then try to take the last piece from me!' },
      { who: 'nina', text: 'Remember, Pico: feel the beat, do not think about it.' },
    ],
    outro: [
      { who: 'corvo', text: 'Ow, ow... fine! You win. Here is the Drum Heart. I... I just wanted to dance too.' },
      { who: 'pico', text: 'Then dance with us! The Feather Fiesta is for EVERY bird.' },
      { who: 'tio', text: 'The Golden Drum is whole again! Let the Feather Fiesta begin!' },
      { who: 'tuca', text: 'And Don Corvo can join the flock. Just... no more stealing, okay?' },
      { who: 'corvo', text: 'Hmph. Okay. ...Thank you.' },
    ],
    unlockChar: 'corvo',
    stages: [
      { id: 'parade1', game: 'samba', name: 'Samba Showdown', goal: [60, 75, 90], label: 'Reach {g}% accuracy', params: { duration: 48 } },
      { id: 'parade2', game: 'boss', name: 'Crow Clash', goal: [1, 40, 70], label: 'Defeat Don Corvo', params: { duration: 120 }, boss: true },
    ],
  },
];
function findStage(id) {
  for (let ci = 0; ci < CHAPTERS.length; ci++) for (let si = 0; si < CHAPTERS[ci].stages.length; si++)
    if (CHAPTERS[ci].stages[si].id === id) return { ch: CHAPTERS[ci], ci, st: CHAPTERS[ci].stages[si], si };
  return null;
}
function totalStars() { return Object.values(Save.data.stars).reduce((a, b) => a + b, 0); }
