(function(root){
 'use strict';
 const finite=(v,min,max)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error('試算条件に範囲外の値があります。');return n;};
 function price(calls=100){calls=finite(calls,100,1000);if(!Number.isInteger(calls))throw new Error('架電回数は100〜1,000回の整数で選択してください。');const extraCalls=calls-100,extraFee=extraCalls*300,trial=29800+extraFee;return {calls,base:29800,extraCalls,extraFee,trial,tax:Math.round(trial*.1),totalIncTax:Math.round(trial*1.1)};}
 function calculate(input){
  const connect=finite(input.connect,0,100)/100,appointment=finite(input.appointment,0,100)/100,close=finite(input.close,0,100)/100;
  const revenue=finite(input.revenue,0,1e8),cycles=finite(input.cycles,1,120),margin=finite(input.margin,0,100)/100;
  const hearing=finite(input.hearing,0,3);
  if(!Number.isInteger(hearing))throw new Error('追加ヒアリングは最大3項目です。');
  const pricing=price(input.calls??100),calls=pricing.calls,rate=connect*appointment,appointments=Number((calls*rate).toFixed(10)),deals=Number((appointments*close).toFixed(10));
  const unit=appointments>0?Math.ceil(((30000*calls/100)/appointments+hearing*2000-1e-8)/100)*100:null;
  const dealGross=revenue*cycles*margin,expectedGross=deals*dealGross,trial=pricing.trial;
  return {pricing,calls,rate,appointments,deals,unit,trial,dealGross,expectedGross,net:expectedGross-trial,zeroProbability:Math.pow(1-rate,calls),allowedApo:dealGross*close,breakEvenDeals:dealGross>0?Math.ceil(trial/dealGross):null,breakEvenAppointments:dealGross>0&&close>0?trial/dealGross/close:null};
 }
 root.SalesSimulator={calculate,price};if(typeof module!=='undefined')module.exports=root.SalesSimulator;
})(typeof window!=='undefined'?window:globalThis);
