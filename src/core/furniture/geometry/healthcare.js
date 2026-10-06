import { objectDrawing } from './primitives.js';
export const HEALTHCARE_GEOMETRY = {
  medicalBed: o=>{const g=objectDrawing();g.rect(.05,.02,.9,.96);g.rect(.12,.1,.76,.78);g.rect(.23,.13,.54,.15);for(const y of [.36,.63,.78])g.line(.12,y,.88,y);g.rect(0,.3,.05,.5);g.rect(.95,.3,.05,.5);g.wheels(.075,.075,.85,.85);if(o.icu){g.rect(.2,0,.6,.06);g.rect(.88,.15,.09,.12);}if(o.stretcher){g.line(.05,0,.95,0);g.line(.05,1,.95,1);}return g.entities;},
  medicalTable: o=>{const g=objectDrawing();g.rect(.05,.05,.9,.9);g.rect(.1,.1,.8,.75);g.line(.1,.3,.9,.3);g.line(.1,.7,.9,.7);g.rect(.27,.88,.46,.12);if(o.operating){g.rect(0,.4,.1,.25);g.rect(.9,.4,.1,.25);}return g.entities;},
  dental: ()=>{const g=objectDrawing();g.seat(.08,.03,.47,.72);g.rect(.15,.75,.32,.2);g.ellipse(.33,.04,.12,.04);g.rect(.65,.38,.35,.27);g.line(.55,.3,.82,.25);g.ellipse(.82,.25,.1,.07);g.line(.45,.55,.68,.55);return g.entities;},
  wheelchair: o=>{const g=objectDrawing();g.seat(.18,.12,.64,.63,false);g.rect(0,.2,.12,.6);g.rect(.88,.2,.12,.6);g.rect(.15,.79,.25,.16);g.rect(.6,.79,.25,.16);g.ellipse(.12,.87,.035);g.ellipse(.88,.87,.035);if(o.sports){g.line(0,.12,.2,.83);g.line(1,.12,.8,.83);}return g.entities;},
  cart: o=>{const g=objectDrawing();g.rect(.04,.08,.92,.84);g.wheels(.05,.1,.9,.8);g.rect(.13,.17,.74,.66);if(o.monitor){g.rect(.18,.12,.64,.24);g.line(.5,.36,.5,.55);}else{for(let y=.3;y<.8;y+=.15)g.line(.15,y,.85,y);}g.line(.1,0,.9,0);return g.entities;},
  lift: ()=>{const g=objectDrawing();g.path([[.1,1],[.1,.15],[.9,.15],[.9,1]]);g.rect(.36,0,.28,.3);g.line(.5,.2,.5,.8);g.ellipse(.5,.8,.1,.09);g.wheels(.1,.2,.8,.75);return g.entities;},
  scanner: o=>{const g=objectDrawing();g.rect(.08,0,.84,.4);g.ellipse(.5,.2,.25,.18);g.ellipse(.5,.2,.12,.09);g.rect(.33,.22,.34,.78);g.line(.33,.65,.67,.65);if(o.mri)g.rect(.02,0,.96,.45);return g.entities;},
  pole: ()=>{const g=objectDrawing();g.ellipse(.5,.5,.06);for(let n=0;n<5;n++){const a=n*Math.PI*.4,x=.5+.43*Math.cos(a),y=.5+.43*Math.sin(a);g.line(.5,.5,x,y);g.ellipse(x,y,.035);}return g.entities;},
  walker: ()=>{const g=objectDrawing();g.path([[.05,.9],[.05,.1],[.95,.1],[.95,.9]]);g.rect(.15,.35,.7,.3);g.wheels(.08,.08,.84,.84);g.line(.05,.1,.25,0);g.line(.95,.1,.75,0);return g.entities;},
  device: o=>{const g=objectDrawing();g.rect(0,0,1,1);g.rect(.1,.12,.8,.5);g.rect(.15,.75,.35,.08);for(let x=.62;x<.9;x+=.1)g.ellipse(x,.8,.025);if(o.pump)for(let x=.15;x<.9;x+=.25)g.rect(x,.15,.17,.65);return g.entities;}
};
