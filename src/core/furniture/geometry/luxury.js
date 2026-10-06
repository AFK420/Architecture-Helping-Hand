import { objectDrawing } from './primitives.js';
export const LUXURY_GEOMETRY = {
  piano: ()=>{const g=objectDrawing();g.path([[0,0],[1,0],...Array.from({length:32},(_,i)=>{const t=i/31;return [1-.18*t-.22*Math.sin(t*Math.PI/2),t];}),[0,1]],true);g.rect(.02,.05,.17,.9);for(let y=.08;y<.95;y+=.065){g.line(.02,y,.19,y);g.rect(.02,y,.08,.023);}g.line(.2,.07,.7,.7);return g.entities;},
  poolTable: ()=>{const g=objectDrawing();g.rect(0,0,1,1);g.rect(.08,.08,.84,.84);for(const x of [.08,.92])for(const y of [.08,.5,.92])g.ellipse(x,y,.035);g.line(.25,.5,.75,.5);for(let i=0;i<5;i++)g.ellipse(.48+i*.015,.3+i*.03,.018);return g.entities;},
  fireplace: ()=>{const g=objectDrawing();g.rect(0,0,1,1);g.rect(.15,0,.7,.65);for(let x=.2;x<.85;x+=.1)g.line(x,.2,x,.55);g.path([[.45,.5],[.4,.35],[.5,.15],[.55,.38],[.6,.48]],true);g.line(0,.8,1,.8);return g.entities;},
  wine: o=>{const g=objectDrawing();g.rect(0,0,1,1);for(let i=0;i<o.bays;i++)for(let j=0;j<3;j++){const x=(i+.5)/o.bays,y=(j+.5)/3;g.ellipse(x,y,.3/o.bays,.1);}return g.entities;},
  cinemaRow: o=>{const g=objectDrawing();for(let i=0;i<o.seats;i++){const x=i/o.seats;g.seat(x,0,.96/o.seats,.82);g.rect(x+.15/o.seats,.82,.67/o.seats,.18);g.ellipse(x+.08/o.seats,.3,.02/o.seats,.025);}return g.entities;}
};
