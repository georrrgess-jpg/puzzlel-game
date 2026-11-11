'use strict';
/* ====================== Crossword themes ======================
   Each theme is a small world of its own, with its words and their clues. A puzzle takes 9 of a theme's words (a
   different mix each time) and lays them out on an 11x11 grid (js/cw/crossword.js). Words: 3-11 letters, A-Z only.
   col: the theme's accent colour (tiles, highlights, the book). */
const CW_THEMES=[
{id:'heroes',name:'Caped Crusaders',icon:'🦸',col:'#ff4d6d',tag:'Masks, capes and secret lairs',words:[
 ['HERO','Saves the day, every day'],['VILLAIN','The bad guy with a scheme'],['SIDEKICK','Trusty young partner'],['CAPE','Flows behind a flying hero'],
 ['MASK','Hides a secret identity'],['LAIR','Hidden base of a mastermind'],['GADGET','Clever tool on a utility belt'],['ORIGIN','How the powers began'],
 ['NEMESIS',"A hero's arch rival"],['FLIGHT','Soaring over the city'],['SHIELD','Blocks the blow'],['SIGNAL','Light in the sky calling for help'],
 ['RESCUE','Pull someone from danger'],['POWERS','Super abilities'],['ALLIES','Friends who fight together'],['COSTUME','Spandex and an emblem'],
 ['JUSTICE','What every hero fights for'],['EMBLEM',"Symbol on a hero's chest"]]},
{id:'pirates',name:"Pirate's Cove",icon:'🏴‍☠️',col:'#e8a33a',tag:'Treasure maps and salty seas',words:[
 ['TREASURE','Buried chest of riches'],['PARROT','Talking shoulder bird'],['CANNON','Fires iron balls'],['CAPTAIN','Commands the ship'],
 ['PLANK','Walk it if you are unlucky'],['COMPASS','Points the way north'],['ANCHOR','Keeps the ship in place'],['GALLEON','Big old sailing ship'],
 ['DOUBLOON','Spanish gold coin'],['MUTINY','When the crew turns on the captain'],['SKULL','Grim face on the black flag'],['CUTLASS','Short curved sword'],
 ['ISLAND','X marks the spot here'],['SAIL','Catches the wind'],['MATEY',"A pirate's pal"],['LOOT','Plunder from a raid'],
 ['SPYGLASS','Telescope for spotting ships'],['HOOK','Stands in for a lost hand']]},
{id:'haunted',name:'Haunted Manor',icon:'👻',col:'#9b7bff',tag:'Creaks, candles and spirits',words:[
 ['GHOST','A sheet that says boo'],['COBWEB',"A spider's dusty work"],['CANDLE','Flickering light in the hall'],['ATTIC','Creaky room at the very top'],
 ['PORTRAIT','Painting whose eyes follow you'],['COFFIN',"A vampire's bed"],['SPECTER','Ghostly figure'],['CRYPT','Tomb beneath the house'],
 ['LANTERN','Carried light for a dark path'],['SKELETON','Bones in the closet'],['CREAK','Sound of an old floorboard'],['BUTLER','He opened the door... slowly'],
 ['MIDNIGHT','When the clock strikes twelve'],['SHADOW','Dark shape on the wall'],['RAVEN','Black bird that says nevermore'],['SEANCE','Gathering to speak to spirits'],
 ['CHAINS','Rattled by a restless ghost'],['ORGAN','Spooky pipes in the parlor']]},
{id:'space',name:'Space Station',icon:'🚀',col:'#3fa9ff',tag:'Orbits, rockets and stardust',words:[
 ['ORBIT','Path around a planet'],['ASTRONAUT','Space traveler'],['ROCKET','Blasts off into the sky'],['GALAXY','Billions of stars together'],
 ['AIRLOCK','Door between ship and space'],['COMET','Icy visitor with a tail'],['NEBULA','Colorful cosmic cloud'],['GRAVITY','Keeps your feet on the ground'],
 ['SATELLITE','Circles Earth sending signals'],['METEOR','Shooting star'],['HELMET','Glass dome for a spacewalk'],['LAUNCH','Three, two, one...'],
 ['CRATER',"Dent on the moon's face"],['MARS','The red planet'],['LUNAR','Of the moon'],['COSMOS','The whole universe'],
 ['DOCKING','Ships linking up in orbit'],['STARDUST','Sparkly space particles']]},
{id:'wizards',name:'Wizard Academy',icon:'🧙',col:'#7c5cff',tag:'Wands, runes and bubbling brews',words:[
 ['WAND','Point it and say the words'],['SPELL','Magic words'],['CAULDRON','Pot for brewing'],['GRIMOIRE','Ancient book of spells'],
 ['OWL','Bird that delivers letters'],['BROOM','Flying household item'],['ROBE',"Long wizard's garment"],['CHARM','Small spell or lucky trinket'],
 ['ELIXIR','Magic healing drink'],['RUNE','Carved magic symbol'],['SCROLL','Rolled parchment'],['FAMILIAR',"A witch's animal companion"],
 ['CRYSTAL','Ball for seeing the future'],['WIZARD','Bearded master of magic'],['APPRENTICE','Learner of the craft'],['HEX','A nasty curse'],
 ['TOWER','Where the old mage studies'],['SORCERY','The magic arts']]},
{id:'dinos',name:'Dino Dig',icon:'🦖',col:'#4caf50',tag:'Bones, amber and giant footprints',words:[
 ['FOSSIL','Bone turned to stone'],['RAPTOR','Fast clawed hunter'],['JURASSIC','Period of giant reptiles'],['EXTINCT','Gone forever'],
 ['BONES','What diggers brush clean'],['AMBER','Golden resin that traps insects'],['HORNS','A triceratops has three'],['TAIL','Swung for balance (or as a club)'],
 ['EGG','Every dino hatched from one'],['BRUSH','Tool for dusting off finds'],['ASTEROID','Space rock blamed for the end'],['HERBIVORE','Plant eater'],
 ['CARNIVORE','Meat eater'],['CLAW','Sharp curved talon'],['PLATES',"A stegosaurus's back armor"],['TEETH','Serrated and as long as bananas'],
 ['SWAMP','Steamy prehistoric wetland'],['MUSEUM','Where the big skeletons stand']]},
{id:'ninja',name:'Ninja Dojo',icon:'🥷',col:'#e14f5a',tag:'Silent steps and shadow skills',words:[
 ['NINJA','Masked shadow warrior'],['SHURIKEN','Throwing star'],['KATANA','Curved blade'],['STEALTH','Moving unseen'],
 ['DOJO','Training hall'],['SENSEI','The master teacher'],['BELT','Its color shows your rank'],['SMOKE','A bomb for a quick escape'],
 ['ROOFTOP','Where ninjas run at night'],['KICK','Martial arts strike'],['BALANCE','Standing on one foot'],['DISCIPLINE','Years of daily training'],
 ['SILENT','Not a sound'],['GRAPPLE','Hook and rope for climbing walls'],['BOW','Polite greeting in the dojo'],['STAFF','Long wooden fighting pole'],
 ['FOCUS','Clear mind, sharp aim'],['ZEN','Calm state of mind']]},
{id:'candy',name:'Candy Factory',icon:'🍭',col:'#ff6fb5',tag:'Sugar, swirls and sprinkles',words:[
 ['LOLLIPOP','Candy on a stick'],['GUMMY','Chewy little bear'],['CARAMEL','Gooey golden sweet'],['TOFFEE','Hard buttery candy'],
 ['LICORICE','Black or red twisty rope'],['CHOCOLATE','Flows in a river at the factory'],['SPRINKLES','Rainbow topping'],['WRAPPER','Shiny paper around a sweet'],
 ['FUDGE','Rich chocolate square'],['MARSHMALLOW','Toast it by the fire'],['JELLYBEAN','Bean of many flavors'],['GUMDROP','Sugary dome'],
 ['NOUGAT','Chewy center of a candy bar'],['SUGAR','Sweet crystals'],['MINT','Cool, fresh flavor'],['TAFFY','Pulled and stretched candy'],
 ['CANDYCANE','Striped holiday hook'],['BONBON','Fancy filled chocolate']]},
{id:'west',name:'Wild West',icon:'🤠',col:'#d9822b',tag:'Dusty trails and high noon',words:[
 ['SHERIFF','Wears the star'],['SALOON','Swinging-door hangout'],['COWBOY','Cattle herder in a big hat'],['LASSO','Rope loop for catching cattle'],
 ['RANCH','Big cattle farm'],['OUTLAW','Face on a wanted poster'],['HORSE','Trusty steed'],['STAGECOACH','Horse-drawn passenger wagon'],
 ['CACTUS','Prickly desert plant'],['TUMBLEWEED','Rolls through a quiet town'],['SPURS','They jingle on boots'],['HOLSTER','Holds a six-shooter'],
 ['BANDIT','Masked robber'],['DUEL','Showdown at high noon'],['RODEO','Bull-riding contest'],['CANYON','Deep rocky valley'],
 ['POSSE','Group chasing outlaws'],['PROSPECTOR','Pans the river for gold']]},
{id:'deepsea',name:'Deep Sea',icon:'🐙',col:'#21b5c9',tag:'Glowing creatures of the abyss',words:[
 ['OCTOPUS','Eight-armed escape artist'],['SUBMARINE','Underwater vessel'],['CORAL','Reef builder'],['ANGLERFISH','Lures prey with a glowing light'],
 ['JELLYFISH','Drifting stinger'],['SQUID','Inky ten-armed swimmer'],['TRENCH','Deepest part of the ocean'],['SHARK','A fin above the water'],
 ['PEARL','Gem inside an oyster'],['SONAR','Echo locator'],['WHALE','Biggest animal ever'],['DIVER','Explorer with an air tank'],
 ['ABYSS','Dark, bottomless depth'],['KELP','Underwater forest plant'],['PRESSURE','Crushing force far below'],['SHIPWRECK','Sunken vessel'],
 ['CURRENT','A river within the ocean'],['SEAHORSE','Dad carries the babies']]},
{id:'dragons',name:"Dragon's Keep",icon:'🐉',col:'#ff6a3d',tag:'Hoards, knights and castle walls',words:[
 ['DRAGON','Fire-breathing beast'],['HOARD','The pile of gold it guards'],['KNIGHT','Armored challenger'],['CASTLE','Stone fortress with towers'],
 ['SCALES','Armor-like skin'],['WINGS','They carry a dragon aloft'],['FLAME','Its breath'],['MOAT','Water ring around a castle'],
 ['QUEST','Brave journey'],['SWORD','Blade of a hero'],['ARMOR','Plate metal suit'],['LANCE','Long jousting spear'],
 ['EMBER','Glowing coal'],['CAVERN',"A dragon's den"],['DRAWBRIDGE','Lowered to let you in'],['TALON',"A dragon's claw"],
 ['GAUNTLET','Armored glove'],['BANNER','Flag on the battlements']]},
{id:'robots',name:'Robot Lab',icon:'🤖',col:'#45c1a0',tag:'Gears, chips and blinking lights',words:[
 ['ROBOT','Mechanical helper that beeps'],['CIRCUIT','Path for electric current'],['GEARS','Toothed wheels turning'],['SENSOR','Detects light or motion'],
 ['BATTERY','Stores power'],['LASER','Focused beam of light'],['ANDROID','Robot that looks human'],['WELDER','Joins metal with heat'],
 ['SERVO','Small motor for precise moves'],['CODE','Instructions for a computer'],['CHIP','Tiny silicon brain'],['WIRES','Colorful cables'],
 ['MAGNET','Pulls metal close'],['BOLT','Twist it with a wrench'],['ANTENNA','Picks up signals'],['CYBORG','Part human, part machine'],
 ['DRONE','Flying robot'],['PROTOTYPE','First test model']]},
{id:'arcade',name:'Retro Arcade',icon:'🕹️',col:'#ff3fa4',tag:'Pixels, tokens and high scores',words:[
 ['JOYSTICK','Push it to move'],['PIXEL','Tiny square of color'],['HIGHSCORE','Top of the leaderboard'],['TOKEN','Coin for the machine'],
 ['BOSS','Final enemy of the level'],['LEVEL','A stage of the game'],['PLAYER','One or two?'],['CONTINUE','Insert coin to keep going'],
 ['GAMEOVER','Two words you dread'],['BUTTON','Press A to jump'],['PINBALL','Flippers and a steel ball'],['CABINET',"The arcade machine's tall box"],
 ['RETRO','Old-school style'],['LIVES','Three left, then start again'],['SPRITE','Character graphic'],['COMBO','String of hits'],
 ['POWERUP','Grab it to get stronger'],['MAZE','Ghosts chase you through one']]},
{id:'egypt',name:"Pharaoh's Tomb",icon:'🏺',col:'#e9b949',tag:'Sand, scarabs and secret chambers',words:[
 ['PYRAMID',"Giza's giant triangle"],['MUMMY','Wrapped for eternity'],['PHARAOH','Egyptian king'],['SPHINX','Lion body, human head'],
 ['NILE','Life-giving river'],['SCARAB','Sacred beetle'],['TOMB','Resting place of a king'],['SARCOPHAGUS','Stone coffin'],
 ['HIEROGLYPH','Picture writing'],['PAPYRUS','Reed paper'],['OBELISK','Tall stone needle'],['DESERT','Sea of sand'],
 ['CURSE','Do not disturb the tomb!'],['AMULET','Protective charm'],['GOLD','A boy king’s famous mask'],['TORCH','Lights the passage'],
 ['CAMEL','Ship of the desert'],['SCRIBE','Ancient writer']]},
{id:'noir',name:'Detective Noir',icon:'🕵️',col:'#8f9bb3',tag:'Rainy nights and cold cases',words:[
 ['DETECTIVE','Private eye'],['CLUE','A hint that cracks the case'],['SUSPECT','Person under suspicion'],['ALIBI','Proof you were elsewhere'],
 ['FEDORA','Brimmed felt hat'],['FINGERPRINT','Left on the glass'],['WITNESS','Saw it happen'],['MOTIVE','The reason for the crime'],
 ['TRENCHCOAT','Long belted jacket'],['MYSTERY','Whodunit'],['CASE','File on the desk'],['RAIN','Always falling on the city at night'],
 ['EVIDENCE','Proof in a bag'],['HUNCH','Gut feeling'],['INFORMANT','Snitch with tips'],['STAKEOUT','Watching from a parked car'],
 ['CULPRIT','The one who did it'],['JAZZ','Smoky club soundtrack']]},
{id:'rock',name:'Rock Concert',icon:'🎸',col:'#ff5a36',tag:'Amps up, lights down',words:[
 ['GUITAR','Six strings'],['DRUMS','The beat keepers'],['AMPLIFIER','Turns it up to eleven'],['ENCORE','One more song!'],
 ['STAGE','Where the band plays'],['ROADIE','Crew who hauls the gear'],['SETLIST',"Order of tonight's songs"],['SOLO',"The guitarist's moment"],
 ['MOSHPIT','Wild crowd near the front'],['BASS','Low four strings'],['SPEAKER','Sends the sound out'],['TOUR','City after city'],
 ['SINGER','Holds the mic'],['RIFF','Catchy guitar phrase'],['CROWD','Thousands cheering'],['BACKSTAGE','Pass needed'],
 ['HEADLINER','Biggest act of the night'],['VOLUME','Crank it up']]},
{id:'arctic',name:'Arctic Expedition',icon:'🐻‍❄️',col:'#6fd3ff',tag:'Ice, auroras and husky sleds',words:[
 ['IGLOO','Ice-block house'],['GLACIER','River of ice'],['POLARBEAR','White giant on the ice'],['WALRUS','Tusked sea giant'],
 ['SLED','Pulled by huskies'],['HUSKY','Sled dog'],['BLIZZARD','Whiteout storm'],['AURORA','Northern lights'],
 ['ICEBERG','Mostly hidden underwater'],['TUNDRA','Frozen treeless plain'],['PARKA','Furry hooded coat'],['FROSTBITE','Cold-nipped fingers'],
 ['NARWHAL','Unicorn of the sea'],['SNOWSHOE','Wide footwear for powder'],['FLAG','Planted at the pole'],['SEAL','Pup on an ice floe'],
 ['FJORD','Steep sea inlet'],['EXPEDITION','Journey into the unknown']]},
{id:'olympus',name:'Mount Olympus',icon:'⚡',col:'#f2c94c',tag:'Gods, heroes and monsters',words:[
 ['ZEUS','King of the gods'],['THUNDER',"His bolt's boom"],['ATHENA','Goddess of wisdom'],['POSEIDON','Ruler of the sea'],
 ['HADES','Lord of the underworld'],['NECTAR','Drink of the gods'],['TITAN','Giant before the gods'],['PEGASUS','Winged horse'],
 ['TRIDENT','Three-pronged spear'],['HERCULES','Hero of twelve labors'],['ORACLE','Seer at Delphi'],['MEDUSA','Snakes for hair'],
 ['APOLLO','God of the sun and music'],['TEMPLE','Marble house of worship'],['MINOTAUR','Bull-headed beast in a maze'],['CYCLOPS','One-eyed giant'],
 ['HERMES','Speedy messenger'],['ODYSSEY','The long voyage home']]},
{id:'safari',name:'Jungle Safari',icon:'🦁',col:'#f0a030',tag:'Roars, vines and watering holes',words:[
 ['LION','King of the beasts'],['JEEP','Safari ride'],['ZEBRA','Striped grazer'],['GIRAFFE','Tallest animal'],
 ['ELEPHANT','Trunk and tusks'],['SAVANNA','Grassy plain'],['BINOCULARS','See far away'],['CHEETAH','Fastest runner'],
 ['HIPPO','River horse'],['RHINO','Horned giant'],['GORILLA','Mighty ape'],['PYTHON','Big squeezing snake'],
 ['VINE','Swing from one'],['CANOPY','Leafy roof of the forest'],['TOUCAN','Bird with a huge bill'],['WATERHOLE','Where herds gather to drink'],
 ['LEOPARD','Spotted climber'],['TRAIL','Path through the brush']]},
{id:'spies',name:'Spy Agency',icon:'🕶️',col:'#5b8cff',tag:'Codes, covers and secret files',words:[
 ['AGENT','Licensed operative'],['DISGUISE','Fake mustache and wig'],['CODEBREAKER','Cracks the cipher'],['CIPHER','Secret code'],
 ['MISSION','Should you choose to accept it'],['INFILTRATE','Sneak inside'],['DOSSIER','File on a target'],['ALIAS','Fake name'],
 ['HANDLER',"An agent's voice on the radio"],['MICROFILM','Tiny photographed secrets'],['SAFEHOUSE','Hideout'],['TUXEDO','Suit for a casino night'],
 ['VAULT','Guarded by lasers'],['BRIEFCASE','Full of gizmos'],['DECOY','Fake to fool the enemy'],['EXTRACTION','Getting out alive'],
 ['INTEL','Secret information'],['GADGET','Watch with a hidden laser']]},
{id:'circus',name:'Circus Big Top',icon:'🎪',col:'#ff4f5e',tag:'Flips, clowns and spotlights',words:[
 ['ACROBAT','Flips and tumbles'],['CLOWN','Red nose, big shoes'],['TRAPEZE','Swinging bar up high'],['JUGGLER','Keeps the balls in the air'],
 ['RINGMASTER','Top-hat host'],['TIGHTROPE','Balance high above'],['UNICYCLE','One-wheeled ride'],['TENT','The striped big top'],
 ['POPCORN','Buttery snack'],['CANNONBALL','A human one flies out'],['TAMER','Lion handler'],['STILTS','Walk tall'],
 ['MAGICIAN','Pulls a rabbit from a hat'],['SPOTLIGHT','Follows the star'],['CONFETTI','Paper party rain'],['NET','Catches a falling flyer'],
 ['PARADE','March through town'],['TICKET','Admit one']]},
{id:'fairy',name:'Fairy Forest',icon:'🧚',col:'#c77dff',tag:'Toadstools, wishes and moonbeams',words:[
 ['FAIRY','Tiny winged sprite'],['MUSHROOM','Toadstool seat'],['PIXIE','Mischievous sprite'],['ACORN','Seed in an oak cap'],
 ['SPARKLE','Twinkle and shine'],['WISH','Made on a star'],['MEADOW','Flowery field'],['FIREFLY','Glowing bug'],
 ['UNICORN','Horned magical horse'],['ENCHANTED','Under a spell'],['DEWDROP','Morning water bead'],['PETAL',"A flower's soft part"],
 ['GNOME','Little bearded garden fellow'],['ELF','Pointy-eared helper'],['BLOSSOM','Spring flower'],['MOONBEAM','Ray of night light'],
 ['TREEHOUSE','Home in the branches'],['LULLABY','Song for sleep']]},
{id:'volcano',name:'Volcano Island',icon:'🌋',col:'#ff7043',tag:'Lava, lagoons and castaways',words:[
 ['VOLCANO','Mountain that blows its top'],['LAVA','Molten rock that flows'],['MAGMA','Molten rock below ground'],['ERUPTION','The big blast'],
 ['ASH','Gray cloud fallout'],['PALM','Tropical tree'],['LAGOON','Calm blue pool'],['GEYSER','Hot water jet'],
 ['OBSIDIAN','Black volcanic glass'],['PUMICE','Rock that floats'],['TROPICAL','Hot and humid'],['SULFUR','Rotten egg smell'],
 ['RUMBLE','The ground is shaking'],['CASTAWAY','Stranded sailor'],['HAMMOCK','Swing between palms'],['COCONUT','Hairy hard fruit'],
 ['RAFT','Escape on logs'],['CRATER','Bowl at the summit']]},
{id:'bakery',name:'Bake Off',icon:'🧁',col:'#ffa07a',tag:'Whisks, dough and sweet smells',words:[
 ['OVEN','Hot box for baking'],['WHISK','Beats the eggs'],['FLOUR','Ground wheat'],['DOUGH','Knead it'],
 ['CROISSANT','Flaky crescent'],['CUPCAKE','Single frosted treat'],['MERINGUE','Whipped egg whites baked crisp'],['ICING','Sweet topping'],
 ['ROLLINGPIN','Flattens pastry'],['MUFFIN','Blueberry breakfast treat'],['PASTRY','Flaky baked dough'],['BAGEL','Ring-shaped bread'],
 ['EGGS','Cracked into the bowl'],['BUTTER','Creamy spread'],['SOUFFLE','Rises, then falls'],['TIMER','Ding! It is done'],
 ['APRON','Keeps your clothes clean'],['SPATULA','Scrapes the bowl']]}
];
