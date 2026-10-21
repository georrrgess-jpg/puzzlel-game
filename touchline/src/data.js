/* ===== Touchline data vocabularies ===== */
const FIRST_NAMES = ['Aiden','Mateo','Liam','Noah','Elijah','Jaylen','Diego','Marcus','Ethan','Kai','Owen','Javier','Darius','Lucas','Malik','Andre','Caleb','Rafael','Theo','Isaiah','Jonah','Samuel','Gabriel','Tyrese','Emeka','Kofi','Yusuf','Omar','Hamza','Arjun','Rohan','Dev','Nikhil','Wei','Jun','Hiroshi','Kenji','Minh','Tuan','Sung','Joon','Daniel','Felipe','Santiago','Emilio','Joaquin','Luis','Carlos','Andres','Bruno','Matteo','Luca','Giovanni','Pierre','Hugo','Lars','Nils','Soren','Henrik','Mikael','Patrick','Connor','Declan','Finn','Rory','Seamus','Brendan','Cole','Tyler','Logan','Mason','Hunter','Brody','Wyatt','Grant','Reid','Miles','Xavier','Dominic','Adrian','Julian','Victor','Nathaniel','Elias','Ezra','Levi','Asher','Micah','Zion','Jamal','Terrence','DeShawn','Andile','Thabo','Chidi','Tunde','Kwame','Abdi','Ismail','Tariq','Karim','Nico','Stefan','Marko','Luka','Ivan','Dmitri','Alexei','Tomas','Jakub','Filip','Mohammed','Ali','Hassan','Bilal','Aarav','Vikram','Sanjay','Ravi','Paolo','Enzo','Thiago','Gustavo','Rodrigo','Manuel','Ricardo','Sergio','Pablo','Alonzo','Cristian','Jesse','Shane','Kyle','Trevor','Derek','Brandon','Jordan','Cameron','Spencer','Garrett','Evan','Colin','Graham','Quentin','Bennett','Sawyer','Beckett','Rhys','Callum','Ewan','Ahmad','Samir','Jalen','Kendrick','Malcolm','Isaac','Benjamin','Henry','Jack','Leo','Oscar','Felix','Hector','Ruben','Mario','Angel','Ivan','Bao','Quan','Tenzin','Ari','Eli','Ronan','Desmond','Ignacio','Yahir','Amari','Kobe','Nasir','Femi','Seun','Obi','Jasper','Silas','Tobias'];
const LAST_NAMES = ['Garcia','Martinez','Rodriguez','Hernandez','Lopez','Gonzalez','Perez','Sanchez','Ramirez','Torres','Flores','Rivera','Gomez','Diaz','Reyes','Morales','Ortiz','Castillo','Vargas','Romero','Mendoza','Silva','Costa','Pereira','Almeida','Oliveira','Nguyen','Tran','Le','Pham','Kim','Park','Lee','Choi','Chen','Wang','Liu','Zhang','Tanaka','Sato','Suzuki','Patel','Shah','Singh','Kumar','Reddy','Iyer','Okafor','Adeyemi','Mensah','Owusu','Diallo','Traore','Kamara','Abara','Nwosu','Haile','Tesfaye','Mohamed','Hassan','Ali','Rahman','Haddad','Khoury','Nasser','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Thompson','White','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Hill','Green','Adams','Baker','Nelson','Carter','Mitchell','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Cox','Ward','Richardson','Watson','Brooks','Wood','Bennett','Gray','Hughes','Price','Sanders','Myers','Long','Ross','Foster','Sullivan','Brennan','Gallagher','Doyle','Byrne','Walsh','Novak','Kowalski','Nowak','Horvat','Petrov','Ivanov','Jensen','Larsen','Nielsen','Lindqvist','Berg','Muller','Schmidt','Weber','Fischer','Becker','Rossi','Russo','Bianchi','Romano','Esposito','Moreau','Laurent','Dubois','Fontaine','Okoye','Achebe','Banda','Phiri','Moyo','Ncube','Santos','Fernandes','Duarte','Barros','Castro','Navarro','Fuentes','Herrera','Medina','Aguilar','Delgado','Vega','Rios','Sandoval','Quinn','Fitzgerald','Hayes','Lynch','Burke','Kaur','Mehta','Bose','Das','Yamamoto','Ito','Huang','Lin','Zhou','Wu'];
const US_STATES = ['New York','Pennsylvania','Ohio','Michigan','New Jersey','Connecticut','Massachusetts','Maryland','Virginia','North Carolina','Georgia','Illinois','Indiana','Wisconsin','Minnesota','Missouri','Colorado','Oregon','Washington','California','Texas','Arizona','Tennessee','Kentucky','Iowa','Kansas','Utah','Maine','Vermont','New Hampshire','Delaware','South Carolina'];
const TOWNS = ['Cedar Falls','Maple Grove','Oak Ridge','Pine Hollow','Willow Creek','Birch Harbor','Elm Crossing','Clearwater','Stony Brook','Red Bank','Silver Lake','Fox Run','Eagle Point','Deer Park','Bear Creek','Hawthorne','Ashford','Brighton','Cranford','Dalton','Easton','Fairview','Glenwood','Hampton','Kingsbridge','Lakeview','Milford','Newbury','Northfield','Oakdale','Plainview','Quarry Hill','Riverside','Springdale','Thornbury','Union Mills','Valley Forge','Westbrook','Whitmore','Yorkshire','Amberley','Bridgeport','Castleton','Dunmore','Evergreen','Foxborough','Granville','Holloway','Ironwood','Juniper Ridge','Kent Falls','Linden','Meadowbrook','Norwood','Orchard Park','Pembroke','Ravenna','Sheffield','Tamarack','Upton','Vista Heights','Winslow','Alder Bay','Blue Mound','Copper Springs','Driftwood','Falcon Heights','Greystone','Highland Park','Lone Pine','Marble Falls','North Haven','Prairie View','Rock Harbor','Sandstone','Timber Lake','West Hollow','Bayside','Canal Point','Granite City','Harbor Mills','Mill Creek','Sterling','Briarcliff','Chestnut Hill','Fieldstone','Kettle Falls','Locust Valley','Morningside','Oxbow','Pinecrest','Sycamore','Tidewater'];
const TOWN_PRE = ['North','South','East','West','Lake','Port','Fort','Mount','Glen','Upper','Lower','New'];
const TOWN_STEM = ['Ash','Oak','Elm','Stone','River','Spring','Fair','Green','Brook','Mill','Red','White','Black','Cedar','Maple','Pine','Hazel','Kings','Wolf','Clay','Sand','Bright','Marsh','Wester','Ridge','Holly','Thorn'];
const TOWN_ROOT = ['Haven','Ridge','Field','Wood','Dale','Ford','Brook','Crest','Ville','Bury','Ton','Shore','Mont','Vale','Gate','Point','Stead'];
const SCHOOL_SUFFIX = ['High School','High School','High School','Central','Academy','Regional','Senior High','Union','Prep','Collegiate'];
const MASCOTS = [
  ['Hawks','wing'],['Eagles','wing'],['Falcons','wing'],['Ravens','wing'],['Owls','wing'],['Cardinals','wing'],
  ['Wolves','claw'],['Bears','claw'],['Panthers','claw'],['Tigers','claw'],['Lions','claw'],['Cougars','claw'],['Wildcats','claw'],['Bobcats','claw'],
  ['Rams','horns'],['Bulls','horns'],['Stags','horns'],['Bison','horns'],
  ['Thunder','bolt'],['Storm','bolt'],['Lightning','bolt'],['Chargers','bolt'],
  ['Flames','flame'],['Blaze','flame'],['Firebirds','flame'],
  ['Stars','star'],['Comets','star'],['Rockets','star'],
  ['Knights','crown'],['Royals','crown'],['Monarchs','crown'],['Spartans','crown'],
  ['Mariners','anchor'],['Clippers','anchor'],['Navigators','anchor'],
  ['Pioneers','tree'],['Rangers','tree'],['Timberwolves','tree'],['Lumberjacks','tree'],
  ['Tide','wave'],['Sharks','wave'],['Dolphins','wave'],
  ['Arrows','arrow'],['Raiders','arrow'],['Warriors','arrow'],['Patriots','arrow']
];
const COLOR_PAIRS = [
  ['#c8102e','#ffffff'],['#0b3d91','#f2c230'],['#006747','#f5f5f5'],['#4b2e83','#e8d3a2'],['#000000','#f2a900'],['#7a0019','#ffcc33'],
  ['#00205b','#c8102e'],['#ff6a13','#1d1d1d'],['#004c54','#a5acaf'],['#5c2d91','#ffffff'],['#1e5631','#d4af37'],['#b3001b','#1c1c1c'],
  ['#003a70','#9ec3e6'],['#6a0dad','#ffd100'],['#8b0000','#c0c0c0'],['#0f4c81','#ffffff'],['#2e8b57','#111111'],['#d2691e','#2b2b2b'],
  ['#14213d','#fca311'],['#990000','#ffb81c'],['#00843d','#ffd700'],['#3b3b98','#e1e1e1'],['#a50034','#002147'],['#1a1a1a','#e03a3e']
];
const COACH_PERS = [
  {k:'Tactician',d:'Picks the most balanced XI and rarely gambles on youth.',youth:-0.1},
  {k:'Youth Developer',d:'Gives underclassmen minutes and promotes prospects early.',youth:0.8},
  {k:'Old School',d:'Trusts seniors and experience above potential.',youth:-0.8},
  {k:'Motivator',d:'Gets effort from whoever starts; mild youth preference.',youth:0.2},
  {k:'Disciplinarian',d:'Prefers composed, low-risk players.',youth:-0.3},
  {k:'Innovator',d:'Willing to try young attackers; pushes tempo.',youth:0.4}
];
const STADIUM_TIERS = [
  null,
  {n:'The Backyard Field',min:150,max:300,d:'Basic field, fence, one small bleacher.'},
  {n:'School Athletic Park',min:400,max:800,d:'Multisport facility, standard stands, basic scoreboard.'},
  {n:'Community Sports Complex',min:1000,max:2500,d:'Larger stands, track, press box, floodlights.'},
  {n:'District Championship Stadium',min:3000,max:5200,d:'Dual stands, tall light towers, video board.'}
];
const STADIUM_NAMES = {
  1:['{L} Field','Back Lot Field','{T} Lower Field','Practice Field','{L} Meadow'],
  2:['{T} Athletic Park','{L} Field','{T} Memorial Field','{L} Athletic Fields','{T} Commons'],
  3:['{T} Community Complex','{L} Memorial Stadium','{T} Sports Park','{L} Field at {T}','Riverside Complex'],
  4:['{T} District Stadium','{L} Memorial Stadium','{T} Veterans Stadium','{T} Championship Field']
};
if (typeof module !== 'undefined') module.exports = {FIRST_NAMES,LAST_NAMES,US_STATES,TOWNS,TOWN_PRE,TOWN_STEM,TOWN_ROOT,SCHOOL_SUFFIX,MASCOTS,COLOR_PAIRS,COACH_PERS,STADIUM_TIERS,STADIUM_NAMES};
