# yugen-criticals
<p align="center">
  <a href="https://www.youtube.com/watch?v=cyKwPv-iJ3s">
    <img src="https://img.youtube.com/vi/cyKwPv-iJ3s/maxresdefault.jpg" width="100%" alt="Watch the demo">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=cyKwPv-iJ3s">Click here for video demonstration</a>
</p>

_Fire Emblem Awakening style critical animations for Foundry VTT v14._

---

## Description
This module adds an overlay animation when a critical hit or natural 1 fumble is made. It brings an JRPG aesthetic to your table. Compatible with D&D 5e and Pathfinder 2e game systems.

Elemental themes are automatically applied based on the damage type. Animations triggered for everyone at the table simultaneously as well. Quotes and sounds are customizable via actor flags.

You can also make it so that it always appears for you or everyone whenever you attack.

## Actor Customization
### 1. Set Signature Quotes
This replaces the "CRITICAL HIT" or "FUMBLE" text with your custom line. You can provide a single string, a delimiter string, or an array of strings. If multiple quotes are provided, one will be chosen at random for each animation.

```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

// Single quote
await actor.setFlag('yugen-criticals', 'crit-quote', "Pick a god and pray!");

// Multiple quotes (Array)
await actor.setFlag('yugen-criticals', 'crit-quote', [
  "Pick a god and pray!",
  "My sword hand hungers!",
  "This ends now!"
]);

// Multiple quotes (| Delimiter)
await actor.setFlag('yugen-criticals', 'fumble-quote', "I miscalculated... | Not like this... | How could I fail?");
```

### 2. Set Custom Sounds
Supports single files, delimited strings, or arrays for random playback.

```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

// Multiple sounds (Array or Delimited)
await actor.setFlag('yugen-criticals', 'crit-sound', "sounds/crit1.ogg|sounds/crit2.ogg");
await actor.setFlag('yugen-criticals', 'fumble-sound', ["sounds/fail1.ogg", "sounds/fail2.ogg"]);
```

### 3. Reset to Defaults
```javascript
const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
await actor.unsetFlag('yugen-criticals', 'crit-quote');
await actor.unsetFlag('yugen-criticals', 'fumble-quote');
await actor.unsetFlag('yugen-criticals', 'crit-sound');
await actor.unsetFlag('yugen-criticals', 'fumble-sound');
```

## Styles
<p align="center">
  <a href="https://www.youtube.com/watch?v=dVJ1ZBkfbgo">
    <img src="https://img.youtube.com/vi/dVJ1ZBkfbgo/maxresdefault.jpg" width="100%" alt="Watch the demo">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=dVJ1ZBkfbgo">Click here for video demonstration</a>
</p>

## Compatibility
- **D&D 5e** (2014 & 2024)
- **Pathfinder 2e**
- **Foundry VTT v14**

## Credits
- Sound effects provided by [Kenney.nl](https://kenney.nl/assets/impact-sounds) (Creative Commons CC0).
