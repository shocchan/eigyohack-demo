(function(root){'use strict';
const critical=['service','benefit','companyIntro','callReason','helpScene','minPrice','sellingPoints','industry','size','area','appointmentRole','replacement','readiness','meetingMinutes','hearing'];
const same=(a,b)=>JSON.stringify(a??'')===JSON.stringify(b??'');
function changes(a,b){return Object.keys({...a,...b}).filter(k=>!same(a[k],b[k]));}
function quote(unit,cap,data,revision=1){if(!Number.isInteger(unit)||unit<1000||unit>1000000)throw Error('単価は1,000〜1,000,000円の整数で入力してください。');if(!Number.isInteger(cap)||cap<1||cap>9)throw Error('上限は1〜9件で選択してください。');const ex=unit*cap;return {id:'DEMO-QUOTE-'+revision,revision,unit,cap,ex,tax:Math.floor(ex/10),total:ex+Math.floor(ex/10),data:JSON.parse(JSON.stringify(data))};}
function settlement(q,confirmed,paid){if(!Number.isInteger(confirmed)||confirmed<0||confirmed>q.cap)throw Error('確定件数が上限を超えています。');if(paid!==q.total)throw Error('前受金の記録を確認してください。');const ex=q.unit*confirmed;const earned=ex+Math.floor(ex/10);return {confirmed,earnedEx:ex,tax:Math.floor(ex/10),earned,refund:paid-earned,paid};}
function canReserve(q,confirmed,pending){return confirmed+pending<q.cap;}
root.OutcomeModel={critical,changes,quote,settlement,canReserve};if(typeof module!=='undefined')module.exports=root.OutcomeModel;
})(typeof window!=='undefined'?window:globalThis);
