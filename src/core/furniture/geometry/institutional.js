import { objectDrawing } from './primitives.js';
export const INSTITUTIONAL_GEOMETRY = {
  easel: ()=>{const g=objectDrawing();g.rect(0,.05,1,.1);g.path([[.15,0],[.5,1],[.85,0]]);g.line(.08,.65,.92,.65);g.rect(.12,.2,.76,.35);return g.entities;},
  locker: o=>{const g=objectDrawing();g.rect(0,0,1,1);for(let i=0;i<o.bays;i++){const x=i/o.bays;g.rect(x+.03/o.bays,.06,.94/o.bays,.88);g.rect(x+.7/o.bays,.42,.07/o.bays,.16);for(let y=.12;y<.3;y+=.07)g.line(x+.15/o.bays,y,x+.85/o.bays,y);if(o.gear){g.ellipse(x+.5/o.bays,.3,.18/o.bays,.12);g.line(x+.3/o.bays,.65,x+.7/o.bays,.65);}}return g.entities;},
  hose: ()=>{const g=objectDrawing();g.rect(0,0,1,1);for(let y=.2;y<1;y+=.22){g.ellipse(.5,y,.4,.08);g.line(.1,y,.9,y);}return g.entities;},
  scba: ()=>{const g=objectDrawing();g.rect(0,0,1,1);for(let x=.15;x<1;x+=.23){g.rect(x-.065,.15,.13,.7);g.ellipse(x,.2,.065,.04);g.line(x,.03,x,.15);}return g.entities;},
  screen: o=>{const g=objectDrawing();const bays=o.bays||3;for(let i=0;i<bays;i++){const x=i/bays;g.rect(x,0,1/bays,.28);g.line(x+.1/bays,.28,x+.1/bays,1);g.line((i+1)/bays-.1/bays,.28,(i+1)/bays-.1/bays,1);}return g.entities;},
  portal: o=>{const g=objectDrawing();g.rect(0,0,.17,1);g.rect(.83,0,.17,1);g.line(.17,.1,.83,.1);if(o.scanner){g.rect(.25,.15,.5,.7);g.line(.25,.6,.75,.6);}return g.entities;},
  room: o=>{const g=objectDrawing('A-SITE');g.path([[0,1],[0,0],[1,0],[1,1],[.3,1]]);g.line(0,1,0,.7);g.arc(0,1,.3,.3,-Math.PI/2,0);g.rect(.1,.15,.3,.6);if(o.cell){for(let x=.45;x<.95;x+=.08)g.line(x,0,x,1);g.ellipse(.75,.85,.1,.1);}else if(o.booth){g.rect(.1,.08,.8,.15);g.rect(.6,.4,.22,.3);}else{g.rect(.06,.07,.88,.2);g.rect(.06,.73,.88,.2);}return g.entities;},
  stairs: o=>{const g=objectDrawing('A-SITE');if(o.spiral){g.ellipse(.5,.5,.5);g.ellipse(.5,.5,.07);for(let i=0;i<12;i++){const a=i*Math.PI/6;g.line(.5,.5,.5+.5*Math.cos(a),.5+.5*Math.sin(a));}}else{g.rect(0,0,1,1);for(let y=.08;y<1;y+=.08)g.line(0,y,1,y);g.path([[.4,.3],[.5,.15],[.6,.3]]);g.line(.5,.15,.5,.85);if(o.l)g.rect(.5,.5,.5,.5);}return g.entities;},
  door: o=>{const g=objectDrawing('A-DOOR');const bays=o.double?2:1;g.line(0,0,1,0);for(let i=0;i<bays;i++){const x=i?1:0,r=1/bays;g.line(x,0,x,1);g.arc(x,0,r,1,i?Math.PI/2:0,i?Math.PI:Math.PI/2);}return g.entities;},
  sliding: o=>{const g=objectDrawing('A-DOOR');g.rect(0,.25,1,.5);const bays=o.bays||2;for(let i=0;i<bays;i++)g.rect(i/bays,.25,1/bays,.2);g.line(.1,.9,.9,.9);g.path([[.75,.8],[.9,.9],[.75,1]]);return g.entities;},
  window: ()=>{const g=objectDrawing('A-DOOR');g.rect(0,0,1,1);g.line(0,.3,1,.3);g.line(0,.7,1,.7);g.line(.5,0,.5,1);return g.entities;},
  lab: o=>{const g=objectDrawing();g.rect(0,0,1,1);g.rect(.05,.05,.9,.9);g.ellipse(.25,.5,.16,.28);g.rect(.53,.2,.35,.58);if(o.hood){g.line(0,.25,1,.25);g.line(.08,.4,.92,.4);}return g.entities;},
  ramp: ()=>{const g=objectDrawing('A-SITE');g.rect(0,0,1,1);g.line(.05,0,.05,1);g.line(.95,0,.95,1);g.line(.5,.85,.5,.15);g.path([[.35,.35],[.5,.15],[.65,.35]]);return g.entities;},
  clearance: ()=>{const g=objectDrawing('A-CLEARANCE');g.ellipse(.5,.5,.5,.5);g.line(.15,.5,.85,.5);g.path([[.25,.4],[.15,.5],[.25,.6]]);g.path([[.75,.4],[.85,.5],[.75,.6]]);return g.entities;}
};
