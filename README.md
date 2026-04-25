# yugen-criticals
<p align="center">
  <video src=".github/assets/yugen-criticals.mp4" width="100%" controls></video>
</p>

_Fire Emblem Awakening style critical animations for Foundry VTT v14._

---

## Description
This module adds an overlay animation when a critical hit or natural 1 fumble is made. It brings an JRPG aesthetic to your table. Compatible with D&D 5e and Pathfinder 2e game systems.

Elemental themes are automatically applied based on the damage type. Animations triggered for everyone at the table simultaneously as well. Quotes and sounds are customizable via actor flags.

You can also make it so that it always appears for you or everyone whenever you attack.

## Actor Customization
### 1. Set Signature Quotes
This replaces the "CRITICAL HIT" or "FUMBLE" text with your custom line.
```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
// For Critical Hits
await actor.setFlag('yugen-criticals', 'crit-quote', "Pick a god and pray!");
// For Fumbles
await actor.setFlag('yugen-criticals', 'fumble-quote', "I miscalculated...");
```

### 2. Set Custom Sounds
```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
// For Critical Hits
await actor.setFlag('yugen-criticals', 'crit-sound', "sounds/my-custom-crit.ogg");
// For Fumbles
await actor.setFlag('yugen-criticals', 'fumble-sound', "sounds/my-custom-fail.ogg");
```

### 3. Reset to Defaults
```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
await actor.unsetFlag('yugen-criticals', 'crit-quote');
await actor.unsetFlag('yugen-criticals', 'fumble-quote');
await actor.unsetFlag('yugen-criticals', 'crit-sound');
await actor.unsetFlag('yugen-criticals', 'fumble-sound');
```

## Compatibility
- **D&D 5e** (2014 & 2024)
- **Pathfinder 2e**
- **Foundry VTT v14**

## Credits
- Sound effects provided by [Kenney.nl](https://kenney.nl/assets/impact-sounds) (Creative Commons CC0).
