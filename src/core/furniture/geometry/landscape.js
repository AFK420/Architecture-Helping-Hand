import { objectDrawing } from './primitives.js';
export const LANDSCAPE_GEOMETRY = {
  climbingPlant: ()=>{const g=objectDrawing('A-VEGETATION');g.rect(0,0,1,1);for(let x=.1;x<1;x+=.2)g.line(x,0,x,1);g.path(Array.from({length:64},(_,i)=>{const y=i/63;return [.5+.23*Math.sin(y*Math.PI*5),y];}));for(let y=.1;y<.95;y+=.1){const x=.5+.23*Math.sin(y*Math.PI*5);g.ellipse(x+.08,y,.1,.035);}return g.entities;},
  bollard: ()=>{const g=objectDrawing('A-SITE');g.ellipse(.5,.5,.5);g.ellipse(.5,.5,.32);g.line(.35,.5,.65,.5);g.line(.5,.35,.5,.65);return g.entities;},
  tree: o=>{const g=objectDrawing('A-VEGETATION');const lobes=o.species==='olive'?9: o.species==='ornamental'?7:12;
    if(o.species==='palm'){for(let i=0;i<10;i++){const a=i*Math.PI/5,dx=Math.cos(a),dy=Math.sin(a);g.path([[.5,.5],[.5+.5*dx,.5+.5*dy],[.5+.26*dx-.08*dy,.5+.26*dy+.08*dx]],true);}}
    else if(o.species==='conifer'){for(let i=0;i<12;i++){const a=i*Math.PI/6;g.path([[.5,.5],[.5+.5*Math.cos(a),.5+.5*Math.sin(a)],[.5+.18*Math.cos(a+.22),.5+.18*Math.sin(a+.22)]]);}}
    else{g.path(Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,r=.43+.065*Math.cos(lobes*a);return [.5+r*Math.cos(a),.5+r*Math.sin(a)];}),true);for(let i=0;i<lobes;i++){const a=i*2*Math.PI/lobes;g.line(.5,.5,.5+.3*Math.cos(a),.5+.3*Math.sin(a));}}
    g.ellipse(.5,.5,.045);return g.entities;},
  hedge: o=>{const g=objectDrawing('A-VEGETATION');for(let i=0;i<o.bays;i++){g.ellipse((i+.5)/o.bays,.5,.55/o.bays,.48);g.ellipse((i+.5)/o.bays,.5,.28/o.bays,.24);}return g.entities;},
  groundcover: o=>{const g=objectDrawing('A-VEGETATION');g.rect(0,0,1,1);for(let x=.08;x<.95;x+=.15)for(let y=.1;y<.95;y+=.17){if(o.flower){g.ellipse(x,y,.026);for(let n=0;n<5;n++)g.ellipse(x+.04*Math.cos(n*1.257),y+.04*Math.sin(n*1.257),.022);}else if(o.grass){g.path([[x-.03,y+.05],[x,y],[x+.03,y+.05]]);g.line(x,y,x,y+.06);}else{g.ellipse(x,y,.03,.024);g.line(x-.02,y,x+.02,y);}}return g.entities;},
  planter: o=>{const g=objectDrawing('A-SITE');if(o.round){g.ellipse(.5,.5,.5);g.ellipse(.5,.5,.4);}else{g.rect(0,0,1,1);g.rect(.06,.08,.88,.84);}g.path(Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,r=.23+.07*Math.cos(6*a);return [.5+r*Math.cos(a),.5+r*Math.sin(a)];}),true);return g.entities;},
  bench: o=>{const g=objectDrawing('A-SITE');g.rect(0,.12,1,.72);for(let y=.2;y<.8;y+=.14)g.line(0,y,1,y);g.rect(.06,0,.88,.1);if(o.arms){g.rect(0,0,.06,.95);g.rect(.94,0,.06,.95);}return g.entities;},
  picnic: ()=>{const g=objectDrawing('A-SITE');g.rect(.12,.3,.76,.4);g.rect(0,0,1,.17);g.rect(0,.83,1,.17);for(let y=.35;y<.7;y+=.1)g.line(.12,y,.88,y);g.line(.15,.17,.15,.83);g.line(.85,.17,.85,.83);return g.entities;},
  pergola: o=>{const g=objectDrawing('A-SITE');g.rect(0,0,1,1);for(const x of [.04,.96])for(const y of [.04,.96])g.rect(x-.03,y-.03,.06,.06);for(let x=.1;x<1;x+=.1)g.line(x,0,x,1);if(o.seating)g.seat(.2,.3,.6,.35);return g.entities;},
  fountain: ()=>{const g=objectDrawing('A-SITE');g.ellipse(.5,.5,.5);g.ellipse(.5,.5,.4);g.ellipse(.5,.5,.2);g.ellipse(.5,.5,.06);for(let n=0;n<8;n++){const t=n*Math.PI/4;g.line(.5+.2*Math.cos(t),.5+.2*Math.sin(t),.5+.35*Math.cos(t),.5+.35*Math.sin(t));}return g.entities;},
  swing: ()=>{const g=objectDrawing('A-SITE');g.rect(0,.07,1,.06);for(const x of [0,.96])g.rect(x,0,.04,1);for(const x of [.2,.65]){g.rect(x,.43,.15,.14);g.line(x,.1,x,.57);g.line(x+.15,.1,x+.15,.57);}return g.entities;},
  slide: ()=>{const g=objectDrawing('A-SITE');g.rect(.25,0,.5,.2);g.path([[.25,.2],[.25,.65],[0,1],[1,1],[.75,.65],[.75,.2]]);for(let y=.03;y<.2;y+=.04)g.line(.25,y,.75,y);g.line(.35,.2,.35,.65);g.line(.65,.2,.65,.65);return g.entities;},
  bin: ()=>{const g=objectDrawing('A-SITE');g.rect(0,0,1,1);g.rect(.08,.12,.84,.76);g.ellipse(.5,.5,.23);g.line(.15,.05,.85,.05);return g.entities;},
  rock: ()=>{const g=objectDrawing('A-SITE');g.path([[0,.3],[.15,0],[.7,.04],[1,.4],[.82,.92],[.38,1],[.1,.75]],true);g.path([[.15,0],[.38,.3],[.7,.04]]);g.path([[.38,.3],[.82,.92],[.38,1]],true);return g.entities;}
};
