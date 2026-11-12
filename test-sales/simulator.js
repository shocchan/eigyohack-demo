(function(root){
 'use strict';
 const finite=(v,min,max)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error('試算条件に範囲外の値があります。');return n;};
 function price(calls=100,mode='initial'){
  if(!['initial','repeat'].includes(mode))throw new Error('料金種別が不正です。');
  calls=finite(calls,100,1000);if(!Number.isInteger(calls))throw new Error('架電回数は100〜1,000回の整数で選択してください。');
  const base=29800,extraCalls=calls-100,tiers=[];
  let remaining=extraCalls;
  for(const [capacity,unit,range] of [[100,250,'101〜200回目'],[100,230,'201〜300回目'],[200,210,'301〜500回目'],[500,200,'501〜1,000回目']]){
   const count=Math.min(remaining,capacity);if(count>0)tiers.push({count,unit,fee:count*unit,range});remaining-=count;
  }
  const extraFee=tiers.reduce((n,t)=>n+t.fee,0),trial=base+extraFee,saving=extraCalls*300-extraFee;
  return {mode,calls,base,extraCalls,extraFee,tiers,saving,average:trial/calls,trial,tax:Math.round(trial*.1),totalIncTax:Math.round(trial*1.1)};
 }

 function calculate(input){
  const connect=finite(input.connect,0,100)/100,appointment=finite(input.appointment,0,100)/100,close=finite(input.close,0,100)/100;
  const revenue=finite(input.revenue,0,1e8),cycles=finite(input.cycles,1,120),margin=finite(input.margin,0,100)/100;
  const hearing=finite(input.hearing,0,3);
  if(!Number.isInteger(hearing))throw new Error('追加ヒアリングは最大3項目です。');
  const pricing=price(input.calls??100,input.mode||'initial'),calls=pricing.calls,rate=connect*appointment,appointments=Number((calls*rate).toFixed(10)),deals=Number((appointments*close).toFixed(10));
  const unit=appointments>0?Math.ceil((price(calls,'repeat').trial/appointments-1e-8)/100)*100:null;
  const dealGross=revenue*cycles*margin,expectedGross=deals*dealGross,trial=pricing.trial;
  return {pricing,calls,rate,appointments,deals,unit,trial,dealGross,expectedGross,net:expectedGross-trial,zeroProbability:Math.pow(1-rate,calls),allowedApo:dealGross*close,breakEvenDeals:dealGross>0?Math.ceil(trial/dealGross):null,breakEvenAppointments:dealGross>0&&close>0?trial/dealGross/close:null};
 }
 root.SalesSimulator={calculate,price};if(typeof module!=='undefined')module.exports=root.SalesSimulator;
})(typeof window!=='undefined'?window:globalThis);
