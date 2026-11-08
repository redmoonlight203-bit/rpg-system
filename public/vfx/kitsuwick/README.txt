KITSUWICK FX VOL. 1 - 50 SPELL AND GAME EFFECTS
By NogitsuneGurl. Created in Kitsuwick.
Free to download, with optional donations.
https://nogitsunegurl.itch.io/kitsuwick-fx-vol-1

START WITH THE ART ZIP
50 unique effects, all on 96 x 96 pixel animation canvases.
28 play-once effects and 22 loops. These are frame dimensions, not a world
tile grid. Most effects have 12 frames; Hit Spark has 9, Critical Hit 10.
Every source frame lasts 83 ms (approximately 12 fps).

Three downloads offer the same fifty effects in different forms:
1. 96px-Art: transparent PNG strips, animated PNGs and per-effect metadata.
2. Editable-Projects: the matching editable Kitsuwick projects.
3. Engine-Helpers: reference sheets, frame rectangles and helper files for
   Unity, Godot, Unreal and RPG Maker. Import and test in your own project.
   These files have not been runtime-tested across those four engines for
   this release. Follow each engine folder's instructions.

FOLDERS
96x96 / Fantasy / asset type / effect name
Use effects.csv or effects.json to find an effect, frame count and behavior.
PNG strips run left to right: frame 0 starts at x=0; each cell is 96 x 96.
Engine-helper atlases have padding and their own rectangle metadata; do not
slice those padded atlases as if they were the unpadded strips.

IMPORT NOTES
- Use point/nearest-neighbor filtering; avoid smoothing or fractional scaling.
- Keep source transparency. Aegis Barrier intentionally uses partial alpha.
- One-shots play once. Remove or hide the sprite on completion; some effects
  retain small particles or a mark on the last frame. Do not freeze that frame
  unless that is the appearance you want. The engine-helper play-once flags
  and the editable animation tags have been aligned with this behavior.
- Projectiles fly right and loop in place. Move/flip them in your engine.
- Preview GIFs on the page repeat to show the motion, including one-shots.
  PNG strips and animated PNGs retain the original pixels and frame timing.
- Godot and Unity helpers carry play-once/loop settings. In Unreal, turn
  Looping off on a one-shot Flipbook component. RPG Maker cell timing uses
  its own engine clock; follow the supplied cell instructions.
- Artwork does not supply damage, collisions, lighting logic or other gameplay.
- Kitsuwick projects retain the compatible .pixel-loom.json file extension.

USE AND CREDITS
See LICENSE.txt. Personal and commercial finished projects are welcome.
Edits and recolors are fine. Please do not redistribute as an asset pack.
Credit is appreciated, not required.

COLLECTIONS
Spellcraft: https://nogitsunegurl.itch.io/free-elemental-spellcraft-pack
Atmospheric effects: https://nogitsunegurl.itch.io/cozy-pixel-vfx-pack-50-animated-effects
My living pixel-art room: https://nogitsunegurl.itch.io/

ALL FIFTY EFFECTS
 1. Ember Burst - one-shot, 12 frames
 2. Storm Strike - one-shot, 12 frames
 3. Glacier Bloom - one-shot, 12 frames
 4. Verdant Mend - one-shot, 12 frames
 5. Void Rift - loop, 12 frames
 6. Arcane Missile - loop, 12 frames
 7. Meteor Fall - one-shot, 12 frames
 8. Toxic Miasma - loop, 12 frames
 9. Tidal Geyser - one-shot, 12 frames
10. Gale Slash - one-shot, 12 frames
11. Holy Smite - one-shot, 12 frames
12. Aegis Barrier - loop, 12 frames
13. Crimson Siphon - loop, 12 frames
14. Earthen Spikes - one-shot, 12 frames
15. Inferno Pillar - loop, 12 frames
16. Blink Step - one-shot, 12 frames
17. Storm Orb - loop, 12 frames
18. Shadow Rend - one-shot, 12 frames
19. Starfall - one-shot, 12 frames
20. Ascension - one-shot, 12 frames
21. Fire Bolt - loop, 12 frames
22. Ice Lance - loop, 12 frames
23. Venom Spit - loop, 12 frames
24. Light Spear - loop, 12 frames
25. Shadow Orb - loop, 12 frames
26. Hit Spark - one-shot, 9 frames
27. Critical Hit - one-shot, 10 frames
28. Blood Splash - one-shot, 12 frames
29. Shock Hit - one-shot, 12 frames
30. Frost Shatter - one-shot, 12 frames
31. Poison Burst - one-shot, 12 frames
32. Burning Ground - loop, 12 frames
33. Frost Aura - loop, 12 frames
34. Stun Stars - loop, 12 frames
35. Dream Bubbles - loop, 12 frames
36. Rage Aura - loop, 12 frames
37. Regen Aura - loop, 12 frames
38. Haste Aura - loop, 12 frames
39. Lava Eruption - one-shot, 12 frames
40. Sand Twister - loop, 12 frames
41. Whirlpool - loop, 12 frames
42. Thorn Vines - one-shot, 12 frames
43. Black Hole - loop, 12 frames
44. Solar Flare - one-shot, 12 frames
45. Moon Beam - one-shot, 12 frames
46. Chain Lightning - one-shot, 12 frames
47. Smoke Bomb - one-shot, 12 frames
48. Coin Burst - one-shot, 12 frames
49. Summoning Sigil - one-shot, 12 frames
50. Soul Release - one-shot, 12 frames
