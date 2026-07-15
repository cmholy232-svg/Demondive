import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const sourceRoot=resolve(root,'source-assets/a75/environment');
const runtimeRoot=resolve(root,'public/assets/a75/environment');

const plates=[
  {
    level:4,id:'thunder-jackpot',palette:['#090716','#18112b','#39205a','#5a3d78','#d2a84a','#52c7dd'],
    body:`
      <path fill="#16102a" d="M0 610L95 520 180 575 270 410 375 535 470 355 565 505 690 300 790 500 910 330 1010 510 1130 370 1245 545 1370 390 1490 560 1590 455 1672 520V800H0Z"/>
      <g fill="#281942" stroke="#74589a" stroke-width="6" opacity=".76"><path d="M145 770V320h150v450z"/><path d="M460 770V230h180v540z"/><path d="M1015 770V275h170v495z"/><path d="M1360 770V350h145v420z"/></g>
      <g fill="none" stroke="#d2a84a" stroke-width="8" opacity=".55"><path d="M0 650h1672"/><path d="M80 700h1510"/><path d="M215 360l38-38 38 38-38 38zM520 300l40-40 40 40-40 40zM1055 340l42-42 42 42-42 42zM1390 410l35-35 35 35-35 35z"/></g>
      <g stroke="#52c7dd" stroke-width="7" opacity=".45"><path d="M365 500l45-95 28 65 55-130"/><path d="M1190 490l45-120 32 70 60-155"/></g>`,
  },
  {
    level:5,id:'frozen-basilica',palette:['#050a18','#0d1b32','#173354','#315978','#b7d9e8','#74cce5'],
    body:`
      <g fill="#10233c" stroke="#315978" stroke-width="10" opacity=".86"><path d="M80 790V265Q80 95 250 95t170 170v525z"/><path d="M470 790V170Q470 20 620 20t150 150v620z"/><path d="M820 790V110Q820-30 965-30t145 140v680z"/><path d="M1165 790V185q0-145 145-145t145 145v605z"/><path d="M1500 790V300q0-120 120-120t120 120v490z"/></g>
      <g fill="#b7d9e8" stroke="#74cce5" stroke-width="5" opacity=".28"><path d="M205 720l45-190 55 190z"/><path d="M585 720l62-270 72 270z"/><path d="M930 720l55-320 70 320z"/><path d="M1280 720l65-250 65 250z"/></g>
      <path fill="none" stroke="#b7d9e8" stroke-width="12" opacity=".34" d="M0 620Q210 500 420 620T840 620t420 0t412 0"/>
      <g fill="#74cce5" opacity=".42"><path d="M80 680l30-95 26 95zM310 650l24-74 23 74zM730 675l32-105 31 105zM1110 655l28-84 27 84zM1510 680l33-110 35 110z"/></g>`,
  },
  {
    level:6,id:'forever-motel',palette:['#120b16','#2a1628','#4a273d','#765064','#d5c1a5','#9e5276'],
    body:`
      <path fill="#2a1628" d="M0 0h1672v780H0z"/><path fill="#1a101d" d="M0 780L620 500h432l620 280v161H0z"/>
      <path fill="none" stroke="#765064" stroke-width="10" opacity=".42" d="M0 120h1672M0 500h1672M620 500L300 941M1052 500l320 441"/>
      <g fill="#351d31" stroke="#9e5276" stroke-width="7"><path d="M70 210h190v420H70z"/><path d="M330 170h220v485H330z"/><path d="M1120 170h220v485h-220z"/><path d="M1410 210h190v420h-190z"/></g>
      <g fill="#d5c1a5" opacity=".5"><circle cx="225" cy="420" r="9"/><circle cx="510" cy="410" r="9"/><circle cx="1160" cy="410" r="9"/><circle cx="1450" cy="420" r="9"/></g>
      <g fill="none" stroke="#9e5276" stroke-width="6" opacity=".35"><path d="M625 555h422M555 625h562M470 710h732M350 820h972"/></g>
      <g fill="#d5c1a5" opacity=".18"><path d="M745 70h182v56H745z"/><circle cx="836" cy="98" r="55"/></g>`,
  },
  {
    level:7,id:'thousand-faces',palette:['#060817','#101a32','#1d3150','#385a78','#7ee3ef','#9b70d8'],
    body:`
      <g fill="#13233f" stroke="#385a78" stroke-width="7" opacity=".82"><path d="M30 780L145 210l150 570z"/><path d="M260 780L390 80l170 700z"/><path d="M520 780L670 160l160 620z"/><path d="M842 780L1002 130l155 650z"/><path d="M1120 780L1265 65l175 715z"/><path d="M1405 780L1535 240l137 540z"/></g>
      <g fill="#7ee3ef" opacity=".2"><path d="M95 700l56-380 75 380zM330 700l70-490 100 490zM585 700l90-420 88 420zM925 700l78-440 92 440zM1190 700l80-500 102 500zM1485 700l58-340 72 340z"/></g>
      <path fill="none" stroke="#9b70d8" stroke-width="9" opacity=".38" d="M836 0v790M0 650l1672-410M0 250l1672 405"/>
      <g fill="none" stroke="#7ee3ef" stroke-width="6" opacity=".46"><path d="M700 220l136-85 136 85-136 85z"/><path d="M740 420l96-60 96 60-96 60z"/><path d="M775 570l61-38 61 38-61 38z"/></g>`,
  },
  {
    level:8,id:'succubus-capital',palette:['#11070f','#260c1c','#461126','#6f1f3b','#bb3b5a','#8e55a8'],
    body:`
      <path fill="#260c1c" d="M0 760V280Q120 60 270 280v480zM320 760V170Q490-60 660 170v590zM1010 760V170q170-230 340 0v590zM1400 760V280q150-220 272 0v480z"/>
      <g fill="none" stroke="#6f1f3b" stroke-width="13" opacity=".78"><path d="M105 760V310Q105 155 270 155t165 155v450"/><path d="M500 760V220Q500 45 670 45t170 175v540"/><path d="M835 760V140Q835-20 1000-20t165 160v620"/><path d="M1235 760V235q0-170 165-170t165 170v525"/></g>
      <path fill="#461126" stroke="#bb3b5a" stroke-width="9" d="M700 760l40-245 96-130 96 130 40 245z"/><path fill="#11070f" d="M778 760V575l58-80 58 80v185z"/>
      <g fill="#8e55a8" opacity=".38"><circle cx="270" cy="420" r="82"/><circle cx="1400" cy="420" r="82"/><path d="M240 420l30-52 30 52-30 52zM1370 420l30-52 30 52-30 52z"/></g>
      <path fill="none" stroke="#bb3b5a" stroke-width="8" opacity=".5" d="M0 690h1672"/>`,
  },
  {
    level:9,id:'self-below',palette:['#07070b','#111217','#202127','#373840','#8b8790','#76559a'],
    body:`
      <g fill="#202127" stroke="#373840" stroke-width="7" opacity=".84"><path d="M35 760V240h380v520z"/><path d="M510 760V120h310v640z"/><path d="M880 760V195h330v565z"/><path d="M1280 760V285h350v475z"/></g>
      <g fill="#111217" stroke="#8b8790" stroke-width="5" opacity=".48"><path d="M95 310h105v155H95zM245 310h110v155H245zM565 195h100v165H565zM705 195h70v165h-70zM940 265h95v155h-95zM1080 265h75v155h-75zM1340 350h100v145h-100zM1485 350h90v145h-90z"/></g>
      <path fill="#07070b" stroke="#76559a" stroke-width="9" d="M730 760V420h212v340z"/><circle cx="900" cy="590" r="10" fill="#8b8790"/>
      <g fill="#373840" opacity=".72"><path d="M210 105l180 55-95 90-175-45zM1180 65l230 80-110 95-210-65zM455 520l120-65 70 110-130 80zM1030 500l150-80 75 125-160 70z"/></g>
      <path fill="none" stroke="#76559a" stroke-width="7" opacity=".55" d="M836 420l-45-90 55-75-30-95M836 420l75-105-42-80 70-95"/>`,
  },
];

const common=(plate)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941" viewBox="0 0 1672 941">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${plate.palette[0]}"/><stop offset="1" stop-color="${plate.palette[1]}"/></linearGradient><radialGradient id="haze"><stop stop-color="${plate.palette[5]}" stop-opacity=".18"/><stop offset="1" stop-color="${plate.palette[0]}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1672" height="941" fill="url(#sky)"/><ellipse cx="836" cy="430" rx="680" ry="390" fill="url(#haze)"/>
  ${plate.body}
  <path fill="${plate.palette[0]}" d="M0 790h1672v151H0z"/><path stroke="${plate.palette[4]}" stroke-width="5" opacity=".28" d="M0 790h1672"/>
  <rect width="1672" height="941" fill="none" stroke="${plate.palette[2]}" stroke-width="18" opacity=".35"/>
</svg>`;

const manifest={version:1,status:'integrated-correction-pending',humanApproved:false,plates:[]};
for(const plate of plates){
  const sourceDirectory=resolve(sourceRoot,`level${plate.level}`),runtimeDirectory=resolve(runtimeRoot,`level${plate.level}`);mkdirSync(sourceDirectory,{recursive:true});mkdirSync(runtimeDirectory,{recursive:true});
  const sourceName=`ENV_${plate.id.replaceAll('-','_').toUpperCase()}_Background_Main_v01.svg`,runtimeName=`env-${plate.id}-background-main-v01.svg`;
  const sourcePath=resolve(sourceDirectory,sourceName),runtimePath=resolve(runtimeDirectory,runtimeName),svg=common(plate);writeFileSync(sourcePath,svg);writeFileSync(runtimePath,svg);
  manifest.plates.push({level:plate.level,id:plate.id,palette:plate.palette,source:`source-assets/a75/environment/level${plate.level}/${sourceName}`,runtime:`public/assets/a75/environment/level${plate.level}/${runtimeName}`,status:'integrated-correction-pending',humanApproved:false});
  console.log(`PASS Level ${plate.level} ${plate.id} · layered SVG source + scalable runtime plate`);
}
writeFileSync(resolve(runtimeRoot,'environment-manifest-v01.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log(`ALPHA 7.5 ENVIRONMENT PLATES BUILT · ${plates.length} biome-specific packages`);
