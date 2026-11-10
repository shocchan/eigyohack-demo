(function(root){
 function recommend(a){
  const valid={audience:['business','shops','consumer'],relationship:['cold','warm','existing'],explanation:['verbal','material','demo'],challenge:['awareness','meetings','followup']};
  for(const [k,values]of Object.entries(valid))if(!values.includes(a[k]))throw new Error('診断の回答が揃っていません。');
  const methods=[
   {id:'phone',name:'テレアポ',score:a.audience==='consumer'?0:4,reason:'担当者と直接話し、課題や関心の有無を確かめる入口に。'},
   {id:'form',name:'フォーム営業',score:a.audience==='consumer'?0:2,reason:'企業向けに要点をまとめた案内を届け、接点をつくる候補。'},
   {id:'mail',name:'メールでの案内・フォロー',score:1,reason:'送付先と案内方法を確認できる既存の接点に、資料や次の案内を届ける候補。'},
   {id:'demo',name:'説明会・個別デモ',score:1,reason:'見せたり体験してもらうことで、価値を理解してもらう候補。'},
   {id:'content',name:'発信・紹介からの接点づくり',score:1,reason:'関心を持った人が自分で情報を確認し、相談できる入口を整える候補。'}
  ];const by=id=>methods.find(m=>m.id===id);
  if(a.explanation==='verbal')by('phone').score+=2;
  if(a.explanation==='material'){by('form').score+=2;by('mail').score+=2;}
  if(a.explanation==='demo')by('demo').score+=4;
  if(a.relationship==='cold'){by('form').score+=1;by('content').score+=1;}
  else{by('mail').score+=3;by('phone').score+=1;}
  if(a.challenge==='meetings')by('phone').score+=2;
  if(a.challenge==='followup'){by('mail').score+=2;by('demo').score+=1;}
  if(a.audience==='shops')by('phone').reason='お店の担当者に直接話し、時間帯や課題感を確かめる入口に。';
  if(a.audience==='consumer'){by('content').score+=5;by('demo').score+=1;}
  return {input:{...a},methods:methods.filter(m=>m.score>0&&(a.audience!=='consumer'||!['phone','form'].includes(m.id))).sort((a,b)=>b.score-a.score).slice(0,3).map(({score,...m})=>m),phoneScope:a.audience!=='consumer',preset:a.relationship==='cold'?'cold':'warm'};
 }
 root.SalesDiagnosis={recommend};if(typeof module!=='undefined')module.exports=root.SalesDiagnosis;
})(typeof window!=='undefined'?window:globalThis);
