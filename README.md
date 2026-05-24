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
This module adds an overlay animation when a critical hit or natural 1 fumble is made. It brings a JRPG aesthetic to your table. Compatible with D&D 5e and Pathfinder 2e game systems.

Elemental themes are automatically applied based on the damage type. Animations trigger for everyone at the table simultaneously. Quotes and sounds are customizable via actor flags.

You can also make it so that it always appears for you or everyone whenever you attack.

## Features
*   **Dice So Nice! Integration:** Automatically detects if Dice So Nice! 3D dice are active. When enabled, critical animations are deferred until the 3D dice finish rolling and settle on the screen.
*   **Screen Shake & Zoom:** Shakes and zooms the game canvas locally to heighten the impact of critical rolls. This is configured as a client-side setting (enabled by default) and can be toggled off for accessibility or health preferences.
*   **Debug Mode:** A togglable client-side configuration setting that outputs trace logs to the browser console to help debug system hooks or modules.

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

## Macro Configuration
The module automatically creates a script macro named `yugen-criticals config` in the world's macro collection upon initialization.
*   **Purpose:** Allows players and GMs to quickly open the configuration screen for their currently selected token or assigned character.
*   **Access:** GMs can drag this macro to their hotbar, and set its permission to "Observer" to allow players to drag it to their own hotbars for easy quote and sound customization.

## Styles
<p align="center">
  <a href="https://www.youtube.com/watch?v=dVJ1ZBkfbgo">
    <img src="https://img.youtube.com/vi/dVJ1ZBkfbgo/maxresdefault.jpg" width="100%" alt="Watch the base styles demo">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=dVJ1ZBkfbgo">Click here for base styles video demonstration</a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=T4iBtZojujU">
    <img src="https://img.youtube.com/vi/T4iBtZojujU/maxresdefault.jpg" width="100%" alt="Watch the class styles demo">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=T4iBtZojujU">Click here for class-specific styles video demonstration</a>
</p>

### Available Visual Themes:
*   **Cinematic:** Fire Emblem Awakening style cut-in overlay (Default).
*   **Anime:** Speed lines and fast sliding overlay.
*   **Cyberpunk:** Neon glitch and scanline overlay.
*   **Mortal Kombat:** Blood red overlay.
*   **Barbarian:** Raging screen-shake and text slam.
*   **Bard:** Musical staff sweep and spinning vinyl.
*   **Cleric / Paladin:** Sunburst ring and holy pillar beam.
*   **Druid:** Falling leaves and organic vine overlay.
*   **Fighter / Rogue:** Metallic slash bar cut-in.
*   **Warlock:** Void crack overlay.
*   **Wizard / Sorcerer:** Rotating runic circles and ward shield.

## Compatibility
- **D&D 5e** (2014 & 2024)
- **Pathfinder 2e**
- **Dice So Nice!**
- **Foundry VTT v13 & v14**

## Credits
- Sound effects provided by [Kenney.nl](https://kenney.nl/assets/impact-sounds) (Creative Commons CC0).
