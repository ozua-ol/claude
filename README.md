# Kartvisualisering - Citylab Utvärdering

En webbapplikation för att visualisera geodata på karta och koppla den till Citylab utvärderingskriterier för hållbar stadsutveckling.

## Funktioner

### Kartvisualisering
- **Bakgrundskartor**: Lantmäteriet topografisk karta, flygfoto, OpenStreetMap och ljus minimalistisk karta
- **GeoPackage-stöd**: Ladda .gpkg-filer direkt i webbläsaren
- **GeoJSON-stöd**: Ladda .geojson/.json-filer
- **Lagerhantering**: Slå på/av lager, zooma till lager, ta bort lager
- **Interaktiv karta**: Klicka på objekt för att se attribut och information
- **Drag & drop**: Dra filer direkt till kartan för att ladda dem

### Citylab Utvärderingskriterier
Inbyggda kriterier baserade på Citylab Action för hållbar stadsutveckling:

#### Ekologisk hållbarhet
- Grönstruktur och ekosystemtjänster
- Dagvattenhantering
- Klimatanpassning
- Biologisk mångfald
- Energieffektivitet
- Materialval och resurser

#### Social hållbarhet
- Tillgänglighet
- Mötesplatser och social interaktion
- Trygghet och säkerhet
- Hälsa och välbefinnande
- Kulturella värden
- Delaktighet och inflytande

#### Ekonomisk hållbarhet
- Livscykelekonomi
- Lokal ekonomi och arbetstillfällen
- Transporteffektivitet
- Flexibilitet och anpassningsbarhet

#### Processledning
- Hållbarhetsprogram
- Samordning och samverkan
- Innovation och lärande
- Uppföljning och utvärdering

### Koppling mellan data och kriterier
- Koppla kartobjekt till specifika utvärderingskriterier
- Spåra vilka kriterier som är uppfyllda baserat på geodata
- Visuell översikt av framsteg
- Anteckningar och status för varje kriterium
- Data sparas lokalt i webbläsaren

## Användning

### Starta applikationen
Öppna `index.html` i en modern webbläsare (Chrome, Firefox, Edge, Safari).

Eller använd en lokal webbserver:
```bash
# Med Python
python -m http.server 8000

# Med Node.js
npx serve

# Med PHP
php -S localhost:8000
```

### Ladda geodata
1. Klicka på "Ladda GeoPackage" i övre högra hörnet
2. Välj en .gpkg eller .geojson-fil
3. Alternativt: Dra och släpp filer direkt på kartan

### Arbeta med Citylab-kriterier
1. Expandera kategorier i vänstra sidopanelen
2. Klicka på ett kriterium för att öppna detaljvyn
3. Uppdatera status (Ej påbörjad / Delvis uppfylld / Uppfylld)
4. Lägg till anteckningar

### Koppla objekt till kriterier
1. Klicka på ett objekt i kartan
2. Informationspanelen visas till höger
3. Välj ett kriterium i dropdown-menyn
4. Klicka "Koppla"

## Teknisk information

### Arkitektur
- **Frontend**: Vanilla JavaScript (ES6+)
- **Karta**: Leaflet.js
- **GeoPackage**: sql.js för SQLite-parsing i webbläsaren
- **Styling**: CSS3 med CSS-variabler

### Filstruktur
```
├── index.html          # Huvudsida
├── css/
│   └── styles.css      # Stilmallar
├── js/
│   ├── app.js          # Huvudapplikation
│   ├── map.js          # Kartmodul
│   ├── geopackage.js   # GeoPackage-läsare
│   └── citylab.js      # Citylab-kriterier
├── data/
│   └── example-areas.geojson  # Exempeldata
└── README.md
```

### Webbläsarstöd
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+

### Lantmäteriet API
För produktionsanvändning med Lantmäteriets karttjänster behöver du:
1. Registrera dig på [Lantmäteriets öppna data](https://www.lantmateriet.se/sv/geodata/vara-produkter/oppna-data/)
2. Skaffa API-nyckel
3. Uppdatera URL:erna i `js/map.js`

## Exempeldata
Projektet innehåller exempeldata i `data/example-areas.geojson` med typiska objekt för stadsplanering:
- Grönområden och parker
- Dagvattenanläggningar
- Bostadskvarter
- Cykelstråk
- Kollektivtrafikhållplatser
- Torg och mötesplatser
- Samhällsservice (förskola)

## Licens
MIT License

## Relaterade resurser
- [Citylab](https://www.sgbc.se/certifiering/citylab/) - Sweden Green Building Council
- [Lantmäteriet](https://www.lantmateriet.se/) - Svenska kartor och geodata
- [Leaflet](https://leafletjs.com/) - Open-source JavaScript library for maps
