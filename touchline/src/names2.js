/* ===================== SCHOOL NAMES II (v16): more towns, more naming patterns ===================== */
const TOWNS2 = ['Ember Ridge','Copper Hollow','Saltmarsh','Ironbridge','Ravenwood','Wolf Creek','Black Rock','Cobalt Bay','Silverton','Granite Falls','Thunder Basin','Shadow Lake','Redstone','Hollow Creek','Lantern Hill',
  'Bramblewood','Fallbrook','Sutter Creek','Wrenfield','Calloway','Harlan','Monticello','Sagebrush','Mesa Verde','Dry Gulch','Coldwater','Brightwater','Stillwater','Whispering Pines','High Plains',
  'Arrowhead','Buffalo Gap','Cinder Cone','Dusty Ridge','Eagle Pass','Flint Hills','Gold Creek','Horseshoe Bend','Iron Springs','Jasper','Keystone','Lockhart','Magnolia','Nightingale','Oakmont',
  'Paradise Valley','Quartz Hill','Rattlesnake Ridge','Saddleback','Tumbleweed','Hawk Pass','Vermillion','Wildwood','Yellow Pine Falls','Zephyr Cove','Ashgrove','Beacon Hill','Cypress Point','Dover Heights','Echo Lake',
  'Foxglove','Goldenrod','Heron Bay','Ivy Gate','Kingfisher','Larkspur','Mistral','Northgate','Osprey Point','Pelican Bay','Quail Run','Rosemont','Starlight','Twin Peaks','Umber Falls',
  'Vandalia','Waverly','Woodhaven','Bellmont','Carrington','Delmar','Everton','Fairhaven','Gresham','Halston','Ingleside','Jericho','Kenwood','Langley','Merrimack',
  'Nashville Heights','Ormond','Prescott','Radford','Somerset','Tilden','Vance','Wexford','Abernathy','Blackwater','Caldwell','Darby','Elkhorn','Frostburg','Glen Echo',
  'Hartwell','Iron Mountain','Juno Beach','Kittredge','Lowell','Marlowe','Nettleton','Old Mill','Pikesville','Ridgecrest','Shiloh','Tallahassee Springs','Underhill','Vail Ridge','Westlake',
  'Anchor Bay','Boulder Creek','Coral Springs','Driftless','Elk Grove','Fort Sterling','Gull Harbor','Hidden Valley','Island Park','Jade Lake','Kodiak','Lighthouse Point','Moonstone','Neptune City','Outer Banks',
  'Pinewood Flats','Red Mesa','Sandpiper','Tidal Basin','Upper Falls','Vista del Mar','Windward','Steelton','Foundry Hill','Mill Valley','Railton','Coalport','Brickyard','Smelter City','Forge Valley',
  'Canyon Creek','Starfall','Northern Lights','Aurora','Polaris','Orion Heights','Sundial','Halcyon','Solstice','Equinox','Crimson Hill','Indigo Bay','Ivory Beach','Scarlet Oaks','Azure Lake',
  'Briar Rose','Cobblestone','Dovetail','Fernhill','Gatewood','Hearthstone','Knollwood','Lakemont','Moss Point','Nightshade','Old Forge','Pebble Creek','Riverbend','Stonegate','Thistlewood'];
const TOWN_PRE2 = ['North','South','East','West','Lake','Port','Fort','Mount','Glen','Upper','Lower','New','Old','Grand','Little','Saint','Cape','Bay','Big','Twin'];
const TOWN_STEM2 = ['Ash','Oak','Elm','Stone','River','Spring','Fair','Green','Brook','Mill','Red','White','Black','Cedar','Maple','Pine','Hazel','Kings','Wolf','Clay','Sand','Bright','Marsh','Wester','Ridge','Holly','Thorn',
  'Raven','Hawk','Iron','Copper','Silver','Gold','Frost','Storm','Ember','Shadow','Wind','Moss','Fern','Briar','Heron','Falcon','Bear','Elk','Fox','Deer','Swan','Glass','Flint','Salt','Coal','Amber','Dusk','Dawn','Star','Moon','Sun'];
const TOWN_ROOT2 = ['Haven','Ridge','Field','Wood','Dale','Ford','Brook','Crest','Ville','Bury','Ton','Shore','Mont','Vale','Gate','Point','Stead','Hollow','Mere','Wick','Holm','Fall','Run','Bluff','Port','Moor','Hurst','Ley','Burg','Cliff','Glen','Water'];
const HONOREES = ['Roosevelt','Lincoln','Jefferson','Kennedy','Franklin','Washington','Adams','Madison','Monroe','Truman','Eisenhower','Edison','Carver','Douglass','Hamilton','McKinley','Wilson','Grant','Garfield','Hoover',
  'Whitman','Thoreau','Emerson','Twain','Earhart','Armstrong','Glenn','Ride','Lovell','Tubman','Parks','Banneker','Marshall','Chavez','Clemente','Robinson','Owens','Thorpe','Hawking','Curie',
  'Whitfield','Hargrove','Ellison','Brennan','Calhoun','Delaney','Fairbanks','Gallagher','Harrington','Kensington','Langston','Mercer','Northrup','Prescott','Quinlan','Redmond','Sinclair','Thornton','Underwood','Westbrook'];
const SAINTS = ['St. Ambrose','St. Brendan','St. Ignatius','St. Joseph','St. Pius','St. Augustine','St. Francis','St. Michael','St. Xavier','St. Thomas','St. Benedict','St. Edward','St. Mark','St. Luke','St. Rita',
  'Holy Cross','Sacred Heart','Bishop Kelley','Bishop Moore','Archbishop Carroll','Cardinal Hayes','Father Ryan','Our Lady of Mercy','Trinity','Calvary'];
const SFX_PUBLIC = ['High School','High School','High School','Senior High','Central','Regional','Union','Consolidated','Memorial','Community','Area High','Township'];
const SFX_PRIVATE = ['Academy','Prep','Preparatory','Collegiate','Country Day','Day School','Christian Academy','Classical Academy','School'];
const SFX_SPECIAL = ['Tech','Technical','Science & Tech','Arts Magnet','Charter Academy','Early College','STEM Academy'];
/* builds {town, name}: town is the short name used everywhere ("Ravenwood", "St. Ambrose", "Lincoln") */
function genIdentity(r, used){
  const comb=()=>{ const pre=r()<0.35?pick(r,TOWN_PRE2)+' ':''; let st=pick(r,TOWN_STEM2), rt=pick(r,TOWN_ROOT2).toLowerCase(); if(st.slice(-1).toLowerCase()===rt[0]) rt=rt.slice(1); return pre+st+rt; };
  for(let i=0;i<300;i++){
    const u=r(); let town, name;
    if(u<0.54){ town=r()<0.62?pick(r,r()<0.6?TOWNS2:TOWNS):comb(); const v=r(); name= v<0.7? `${town} ${pick(r,SFX_PUBLIC)}` : v<0.94? `${town} ${pick(r,SFX_PRIVATE)}` : `${town} ${pick(r,SFX_SPECIAL)}`; }
    else if(u<0.67){ town=r()<0.6?pick(r,r()<0.6?TOWNS2:TOWNS):comb().replace(/^(North|South|East|West) /,''); const d=pick(r,['North','South','East','West']); name=`${town} ${d}`; town=`${town} ${d}`; }
    else if(u<0.83){ town=pick(r,HONOREES); name=`${town} ${pick(r,['High School','High School','Senior High','Memorial High','Academy'])}`; }
    else if(u<0.96){ town=pick(r,SAINTS); name=`${town} ${pick(r,['Prep','Academy','Catholic','High School','Preparatory'])}`; }
    else { town=pick(r,TOWNS2); name=`${town} ${pick(r,SFX_SPECIAL)}`; }
    if(!used.has(town)){ used.add(town); return {town,name}; }
  }
  const t='Town '+used.size; used.add(t); return {town:t,name:t+' High School'};
}
/* more school colour pairs */
COLOR_PAIRS.push(['#0a7e8c','#f6c445'],['#3d1f5c','#f28c28'],['#2b2d42','#ef233c'],['#14532d','#bef264'],['#1e3a8a','#fb923c'],['#7c2d12','#fde68a'],['#111827','#22d3ee'],['#9d174d','#fbcfe8'],['#365314','#fef3c7'],['#0c4a6e','#e2e8f0'],['#581c87','#a3e635'],['#b45309','#1f2937']);
