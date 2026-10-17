# Keno Chain Reactor

Készíts egy játszható demót a KENO: CHAIN REACTOR — CHAOS OVERDRIVE játékhoz az alábbi specifikáció és döntések alapján:

KENO: CHAIN REACTOR — CHAOS OVERDRIVE
1. DUAL KENO — Choose your side
A játékos külön választ Blue és Red számokat (5x8-as tábla, 1-40 számok). A két réteg külön nyereményt épít, de ha ugyanaz a szám mindkét színben szerepel és bejön, Dual Hit keletkezik.
A közös találatnál a két szín összeolvad (lila/neon fúzió), és közös reakciót aktiválhat.

2. ELEMENTS — Fire, Ice, Chaos
Az elemeket már a fogadás előtt láthatóvá kell tenni a táblán:
- FIRE: felerősíti a lánc kifizetését.
- ICE (A verzió, passzív híd): áthidalhat egyetlen közvetlenül közbeeső üres ICE mezőt két találat között ortogonálisan (vízszintesen/függőlegesen), hogy összekapcsolja őket lánccá. Az ICE mezőnek nem kell találatnak lennie, nem hoz létre új találatot, de összeköti a két szomszédos találatot.
- CHAOS: egy elszigetelt találatot a legközelebbi lánchoz kapcsol.

3. WILD — CHAOS BALL
A normál 10 számsorsolás után ~10% eséllyel (vagy teszt gombbal kényszerítve) megjelenik a 11. Chaos Ball bónuszesemény:
- WILD LINK: két különálló lánc összekapcsolása.
- WILD ECHO: egy már aktivált elemi hatás megismétlése.
- DUAL OVERDRIVE: extra bónusz, ha a Blue és Red réteg egyaránt teljesíti a meghatározott feltételt.

4. OVERDRIVE — The final reaction (3 fázisú feszültségépítés)
- 01 — THE DRAW: Gyorsan érkeznek a számok (10 kihúzott szám a 40-ből). Találatok felvillannak kékkel / pirossal / lilával (Dual Hit).
- 02 — THE REACTION: Sorsolás megáll. Találatok között elektromos/neon ívek, láncok kiértékelése, ICE híd átívelése a réseken, Fire felerősítés.
- 03 — OVERDRIVE: Ha aktiválódik a Chaos Ball, vagy kiemelkedő lánc/Dual kombináció jött létre, látványos finálé és WIN REVEAL.

5. SMART PRESETS
- FULL MIRROR (High volatility): Mind a 10 szám ugyanaz a Blue és Red mezőn.
- SPLIT / DIVIDE (Balanced): Blue és Red a tábla két külön területére koncentrál.
- ELEMENT HUNTER (Tactical): Automatikusan kiválasztja az aktív Fire és Ice mezőket, a maradékot kiegészíti.
A presetek csak beállítják a számokat, a játékos még kézzel módosíthat, a kört külön gombbal indítja.

6. KIFIZETÉSI MODELL
Blue + Red alapnyeremény összeadódik, a láncbónuszok, elemi multiplierek és Chaos Ball extra bónuszként adódnak hozzá. Legyen tétkezelés, balance, és részletes körösszegző (találatok, lánchosszak, bónuszok bontása).

Sötét, modern cyber/neon arcade casino látványvilág (Hacksaw/Stake stílus), hangulatos effektekkel, tiszta UI-val és tesztelési lehetőségekkel (pl. Turbo mód, Force Chaos Ball teszteléshez).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/30932cf6-7b19-4433-ab4a-640004fb05eb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
