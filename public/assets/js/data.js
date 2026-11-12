/* ==========================================================================
   Meridian — content data
   Loaded before script.js. Everything here is plain data, no behaviour.

   Climate figures are long-term monthly averages, rounded:
   highs in degrees Celsius, rain in millimetres, January first.
   ========================================================================== */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* The six destinations, in page order. id matches data-destination in
   index.html; inProse is the name as written mid-sentence. */
const DESTINATIONS = [
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    lat: 35.01,
    lng: 135.77,
    timeZone: 'Asia/Tokyo',
    image: 'kyoto',
    journey: 'Kyoto and the Inland Sea',
    summary: 'Temples opened before the crowds arrive, an art island reached by ferry, and two nights in a ryokan where dinner is brought to your room.',
    nights: 9,
    price: 9400,
    season: 'March to May, October and November',
    best: [3, 4, 5, 10, 11],
    highs: [9, 10, 14, 20, 25, 28, 32, 33, 29, 23, 17, 12],
    rain: [50, 68, 113, 116, 161, 214, 220, 132, 176, 121, 71, 48],
    stops: [
      { name: 'Kyoto', nights: 4, lat: 35.0116, lng: 135.7681, text: 'A townhouse in Higashiyama, a tea master, and Kiyomizu-dera at first light.' },
      { name: 'Nara', nights: 0, lat: 34.6851, lng: 135.8048, text: 'A day among the deer and the great bronze Buddha, with a guide who grew up here.' },
      { name: 'Naoshima', nights: 2, lat: 34.4600, lng: 133.9950, text: 'Museums set into the hillside and a room where the art stays lit after closing.' },
      { name: 'Kinosaki Onsen', nights: 3, lat: 35.6260, lng: 134.8140, text: 'Seven bathhouses along a willow-lined canal, visited in a cotton robe and wooden sandals.' }
    ]
  },
  {
    id: 'amalfi',
    name: 'Amalfi Coast',
    inProse: 'the Amalfi Coast',
    country: 'Italy',
    lat: 40.63,
    lng: 14.60,
    timeZone: 'Europe/Rome',
    image: 'amalfi',
    journey: 'The Amalfi Coast by water',
    summary: 'The coast road is beautiful and slow. We use it once, then travel by boat: to lunch, to Capri, and to coves that have no road at all.',
    nights: 7,
    price: 8200,
    season: 'May, June, September and October',
    best: [5, 6, 9, 10],
    highs: [13, 13, 15, 18, 22, 26, 29, 30, 26, 22, 17, 14],
    rain: [104, 98, 86, 76, 50, 34, 24, 42, 80, 130, 162, 121],
    stops: [
      { name: 'Positano', nights: 3, lat: 40.6281, lng: 14.4850, text: 'A terrace above the beach and a skipper who knows which cove is empty today.' },
      { name: 'Amalfi', nights: 0, lat: 40.6340, lng: 14.6027, text: 'The cathedral steps, a paper mill still in use, and lemons the size of your fist.' },
      { name: 'Ravello', nights: 2, lat: 40.6491, lng: 14.6117, text: 'Gardens three hundred metres above the sea, and concerts on summer evenings.' },
      { name: 'Capri', nights: 2, lat: 40.5532, lng: 14.2222, text: 'Around the island by wooden boat, then up to Anacapri once the day visitors have left.' }
    ]
  },
  {
    id: 'serengeti',
    name: 'Serengeti',
    inProse: 'the Serengeti',
    country: 'Tanzania',
    lat: -2.33,
    lng: 34.83,
    timeZone: 'Africa/Dar_es_Salaam',
    image: 'serengeti',
    journey: 'Following the great migration',
    summary: 'More than a million wildebeest cross the plains each year. We place you where they are, in camps small enough that the guide knows your name by breakfast.',
    nights: 8,
    price: 12600,
    season: 'June to October',
    best: [6, 7, 8, 9, 10],
    highs: [28, 28, 28, 27, 26, 26, 26, 27, 28, 28, 27, 27],
    rain: [80, 100, 140, 160, 90, 30, 15, 25, 50, 70, 120, 110],
    stops: [
      { name: 'Arusha', nights: 1, lat: -3.3869, lng: 36.6830, text: 'A coffee estate under Mount Meru to sleep off the flight.' },
      { name: 'Ngorongoro Crater', nights: 2, lat: -3.1618, lng: 35.5877, text: 'Down to the crater floor at dawn, before the other vehicles are through the gate.' },
      { name: 'Central Serengeti', nights: 2, lat: -2.4500, lng: 34.8200, text: 'Big cats on the granite outcrops, and a balloon flight at sunrise if you would like one.' },
      { name: 'Mara River', nights: 3, lat: -1.5700, lng: 34.9000, text: 'A tented camp near the crossing points, where the herds gather on the banks.' }
    ]
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    country: 'Chile',
    lat: -50.94,
    lng: -73.41,
    timeZone: 'America/Punta_Arenas',
    image: 'patagonia',
    journey: 'Torres del Paine on foot',
    summary: 'Granite towers, blue ice and weather that changes by the hour. You walk as much or as little as you like, and come back each evening to a fire and a proper bed.',
    nights: 8,
    price: 10800,
    season: 'November to March',
    best: [11, 12, 1, 2, 3],
    highs: [18, 18, 15, 12, 8, 5, 5, 7, 10, 13, 15, 17],
    rain: [40, 35, 50, 55, 50, 45, 40, 40, 35, 30, 35, 40],
    stops: [
      { name: 'Punta Arenas', nights: 1, lat: -53.1638, lng: -70.9171, text: 'A night on the Strait of Magellan after the flight south from Santiago.' },
      { name: 'Puerto Natales', nights: 1, lat: -51.7236, lng: -72.4875, text: 'A fjord-side hotel in a converted wool store, and your first sight of the massif.' },
      { name: 'Torres del Paine', nights: 5, lat: -50.9423, lng: -72.9682, text: 'A lodge inside the park, with a guide and a different trail each morning.' },
      { name: 'Grey Glacier', nights: 0, lat: -51.0100, lng: -73.2300, text: 'By boat to the ice face, then onto the glacier itself in crampons.' }
    ]
  },
  {
    id: 'bora-bora',
    name: 'Bora Bora',
    country: 'French Polynesia',
    lat: -16.50,
    lng: -151.74,
    timeZone: 'Pacific/Tahiti',
    image: 'bora-bora',
    journey: 'The Society Islands by lagoon',
    summary: 'Four islands, each quieter than the last, linked by short flights and private boats. The final three nights are spent over the water.',
    nights: 9,
    price: 14200,
    season: 'May to October',
    best: [5, 6, 7, 8, 9, 10],
    highs: [30, 30, 31, 30, 29, 28, 28, 28, 28, 29, 30, 30],
    rain: [270, 230, 180, 140, 120, 80, 70, 50, 60, 100, 190, 260],
    stops: [
      { name: 'Tahiti', nights: 1, lat: -17.5350, lng: -149.5696, text: 'Papeete market in the morning, then the black-sand beaches of the east coast.' },
      { name: 'Moorea', nights: 3, lat: -17.5388, lng: -149.8295, text: 'Pineapple fields, a reef you can snorkel from the shore, and humpbacks from August.' },
      { name: 'Taha\'a', nights: 2, lat: -16.6167, lng: -151.5000, text: 'A vanilla farm, a pearl farm and a drift snorkel through a coral garden.' },
      { name: 'Bora Bora', nights: 3, lat: -16.5004, lng: -151.7415, text: 'A villa on stilts facing Mount Otemanu, with breakfast delivered by canoe.' }
    ]
  },
  {
    id: 'iceland',
    name: 'Iceland',
    country: 'North Atlantic',
    lat: 64.15,
    lng: -19.0,
    timeZone: 'Atlantic/Reykjavik',
    image: 'iceland',
    journey: 'The south coast and the highlands',
    summary: 'Waterfalls you can walk behind, a lagoon full of icebergs, and a night in the highlands that most visitors never reach.',
    nights: 7,
    price: 8900,
    season: 'June to September',
    best: [6, 7, 8, 9],
    highs: [3, 3, 4, 7, 10, 13, 15, 14, 11, 7, 4, 3],
    rain: [76, 72, 82, 58, 44, 50, 52, 62, 67, 86, 73, 79],
    stops: [
      { name: 'Reykjavik', nights: 2, lat: 64.1466, lng: -21.9426, text: 'A harbour-front room, a geothermal lagoon and dinner at a table of twelve.' },
      { name: 'Vik', nights: 2, lat: 63.4186, lng: -19.0060, text: 'Black sand, sea stacks and two waterfalls on the way, with a driver who knows the weather.' },
      { name: 'Jökulsárlón', nights: 2, lat: 64.0784, lng: -16.2306, text: 'Among the icebergs by boat, and onto the glacier with a mountain guide.' },
      { name: 'Landmannalaugar', nights: 1, lat: 63.9830, lng: -19.0670, text: 'By super-jeep into the rhyolite hills, for a hot river and a night under canvas.' }
    ]
  }
];
