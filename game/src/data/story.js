// The story of Marisol Bay in five jobs: who speaks, where to go, what to steal,
// who gets in the way and what it pays. All names, places and dialogue are original.
// Stages are data only; missions.js drives them, so adding a job needs no new code.
import { GARAGE } from '../config.js';

export const CHARACTERS = {
  rafa: { name: 'RAFA SOLANO', role: 'The driver' },
  ivy: { name: 'IVY CALDERÓN', role: 'The fixer' },
  tito: { name: 'TITO MARCHETTI', role: 'The mechanic' },
  nessa: { name: 'NESSA VOSS', role: 'The detective' },
  pike: { name: 'DEACON PIKE', role: 'The marina king' },
};

const GARAGE_POS = { x: GARAGE.x, z: GARAGE.z };

export const MISSIONS = [
  {
    id: 'first-light',
    number: 1,
    title: 'First Light',
    chapter: 'A favor for Ivy',
    start: GARAGE_POS,
    intro: [
      ['ivy', 'Rafa Solano. Back from the mainland with a tan and no money.'],
      ['rafa', 'I brought you the sunset.'],
      ['ivy', 'You brought me a stolen car and a favor owed. Tito is at Pier 9 with a coral Sundown GT. Bring it home and we talk.'],
    ],
    stages: [
      { type: 'goto', x: 86, z: 284, radius: 7, objective: 'Meet Tito at Pier 9',
        onArrive: [
          ['tito', 'Keys are in it. Try not to paint the seawall with it.'],
          ['rafa', 'No promises.'],
        ] },
      { type: 'steal', vehicleTag: 'sundown-pier', objective: 'Steal the coral Sundown GT', hint: 'It is parked on the Pier 9 promenade.' },
      { type: 'deliver', x: GARAGE.x, z: GARAGE.z, radius: 6.5, objective: 'Deliver the Sundown GT to Solano Motor Co.', requireVehicleTag: 'sundown-pier' },
    ],
    outro: [
      ['ivy', 'Still quick. That car belonged to one of Pike\'s couriers.'],
      ['rafa', 'And Pike is?'],
      ['ivy', 'The reason this city smells like sunscreen and bad decisions. Get some sleep. Tomorrow we take his ledger.'],
    ],
    reward: 600,
  },
  {
    id: 'the-ledger',
    number: 2,
    title: 'The Ledger',
    chapter: 'Casa Sombra',
    start: GARAGE_POS,
    intro: [
      ['ivy', 'Pike keeps a paper ledger at the Casa Sombra motel. Paper, Rafa. In this economy.'],
      ['rafa', 'You want me to steal a notebook.'],
      ['ivy', 'I want you to steal the names of every cop and councilman in it. Try the courtyard.'],
    ],
    stages: [
      { type: 'goto', x: 180, z: -132, radius: 8, objective: 'Go to Casa Sombra',
        onArrive: [
          ['rafa', 'Nice place. The ice machine is a guy with a bucket.'],
          ['ivy', 'Three of Pike\'s boys are in the motor court. The ledger is in the office safe. Make a mess.'],
        ] },
      { type: 'kill', x: 180, z: -150, radius: 24, enemies: [
        { x: 170, z: -148, kind: 'gang' }, { x: 194, z: -145, kind: 'gang' }, { x: 185, z: -160, kind: 'gang' },
      ], objective: 'Clear Pike\'s crew at Casa Sombra' },
      { type: 'goto', x: 182, z: -166, radius: 3.4, objective: 'Grab the ledger',
        onArrive: [['rafa', 'Names. Dates. A truly upsetting amount of shrimp.']] },
      { type: 'escape', stars: 2, objective: 'Lose the cops' },
      { type: 'deliver', x: GARAGE.x, z: GARAGE.z, radius: 6.5, objective: 'Bring the ledger back to Ivy' },
    ],
    outro: [
      ['ivy', 'Half the harbor authority is in here. Pike is not a businessman. He is a receipt.'],
      ['rafa', 'So what do we do with it?'],
      ['ivy', 'We find someone who wants him gone more than we do.'],
    ],
    reward: 950,
  },
  {
    id: 'salt-in-the-wound',
    number: 3,
    title: 'Salt in the Wound',
    chapter: 'The marina job',
    start: GARAGE_POS,
    intro: [
      ['ivy', 'Detective Voss works vice out of the marina. She wants the ledger. I want Pike gone.'],
      ['rafa', 'And I want a shower.'],
      ['ivy', 'Meet her at the marina. Bring the ledger. Do not bring the police.'],
    ],
    stages: [
      { type: 'goto', x: -180, z: 278, radius: 8, objective: 'Meet Nessa at Marisol Marina',
        onArrive: [
          ['nessa', 'You must be the driver. Ivy said you were subtle.'],
          ['rafa', 'I parked three blocks away.'],
          ['nessa', 'Pike is moving a container through the docks tonight. I can keep the uniforms off one dock. Not two.'],
        ] },
      { type: 'kill', x: -180, z: 282, radius: 24, enemies: [
        { x: -194, z: 276, kind: 'gang' }, { x: -166, z: 286, kind: 'gang' },
        { x: -186, z: 300, kind: 'gang' }, { x: -158, z: 272, kind: 'gang' },
      ], objective: 'Break up Pike\'s marina crew' },
      { type: 'escape', stars: 3, objective: 'Lose the heat' },
      { type: 'deliver', x: GARAGE.x, z: GARAGE.z, radius: 6.5, objective: 'Get back to Solano Motor Co.' },
    ],
    outro: [
      ['nessa', 'Your ledger is real. Which means Pike has a buyer, and the buyer has a boat.'],
      ['ivy', 'He is moving the evidence out of the country.'],
      ['rafa', 'Of course he is.'],
    ],
    reward: 1600,
  },
  {
    id: 'undertow',
    number: 4,
    title: 'Undertow',
    chapter: 'The buyer\'s boat',
    start: GARAGE_POS,
    intro: [
      ['tito', 'Pike\'s people took my tow truck. They are stripping it at the marina warehouse.'],
      ['rafa', 'A tow truck. That is the thing that finally makes this personal.'],
      ['ivy', 'Pike will be at the lighthouse after the exchange. Nessa says the buyer sails at midnight. We have one window.'],
    ],
    stages: [
      { type: 'goto', x: -176, z: 246, radius: 7, objective: 'Go to the marina warehouse',
        onArrive: [
          ['tito', 'My truck! They took the good toolbox too.'],
          ['rafa', 'Stay behind me.'],
        ] },
      { type: 'kill', x: -176, z: 248, radius: 22, enemies: [
        { x: -190, z: 244, kind: 'gang' }, { x: -162, z: 252, kind: 'gang' },
        { x: -184, z: 232, kind: 'gang' }, { x: -170, z: 242, kind: 'gang' },
      ], objective: 'Take back Tito\'s garage' },
      { type: 'steal', vehicleTag: 'tow-truck', objective: 'Steal back Tito\'s Dune Hauler' },
      { type: 'escape', stars: 4, objective: 'Lose the heat — 4 stars' },
      { type: 'deliver', x: GARAGE.x, z: GARAGE.z, radius: 7, objective: 'Return the tow truck to Tito', requireVehicleTag: 'tow-truck' },
    ],
    outro: [
      ['tito', 'She is scratched. I am going to cry about it later.'],
      ['ivy', 'Pike is at the Narrows Light. He is out of men and out of dock.'],
      ['rafa', 'Then let us go turn the light off.'],
    ],
    reward: 2600,
  },
  {
    id: 'last-light',
    number: 5,
    title: 'Last Light',
    chapter: 'The Narrows',
    start: GARAGE_POS,
    intro: [
      ['ivy', 'Pike is at the lighthouse with what is left of his crew. The police are not coming.'],
      ['rafa', 'That is usually my line.'],
      ['ivy', 'Come back, Rafa. The bay is not done with you.'],
    ],
    stages: [
      { type: 'goto', x: 250, z: 304, radius: 8, objective: 'Drive to the Narrows Light',
        onArrive: [
          ['pike', 'Solano. Your brother used to drive for me. He was better at keeping his mouth shut.'],
          ['rafa', 'He was better at a lot of things.'],
          ['pike', 'The ledger dies with you. So does the garage.'],
        ] },
      { type: 'kill', x: 250, z: 306, radius: 26, enemies: [
        { x: 238, z: 300, kind: 'gang' }, { x: 262, z: 312, kind: 'gang' },
        { x: 250, z: 320, kind: 'gang', boss: true, health: 240 },
      ], objective: 'End it with Deacon Pike' },
      { type: 'escape', stars: 5, objective: 'Survive the last heat' },
      { type: 'deliver', x: GARAGE.x, z: GARAGE.z, radius: 7, objective: 'Go home to Solano Motor Co.' },
    ],
    outro: [
      ['ivy', 'It is quiet.'],
      ['rafa', 'It is Marisol Bay. It only sounds quiet when it is reloading.'],
      ['ivy', 'Then stay. This time, stay.'],
      ['rafa', 'The sun is still up. Let us go for a drive.'],
    ],
    reward: 5000,
    finale: true,
  },
];

export function missionObjective(mission, stage) {
  if (!mission) return 'Meet Ivy at Solano Motor Co.';
  if (!stage) return mission.title;
  return stage.objective;
}
