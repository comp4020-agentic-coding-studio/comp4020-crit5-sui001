# Audio

Kenney CC0 sound effects, renamed on the way in so a filename says what the
sound is *for* rather than what it sounds like:

| file | source | used for |
|---|---|---|
| `pickup.ogg` | Interface Sounds `pluck_001` | grabbing a pickup (pitch rises with progress) |
| `clear.ogg` | Interface Sounds `confirmation_001` | universe threshold met |
| `bounce.ogg` | Interface Sounds `error_002` | rejected action |
| `thud.ogg` | Impact Sounds `impactMetal_heavy_000` | impact layer under `bounce` |
| `jump.ogg` | Interface Sounds `glitch_002` | jumping to a new universe |
| `buy.ogg` | Interface Sounds `switch_002` | UI button press |
| `settle.ogg` | Interface Sounds `bong_001` | ending screen |

`../music/` holds the score clips — see `music.ts` for why they are sequenced
rather than looped.
