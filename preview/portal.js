'use strict';
const $=id=>document.getElementById(id);
const hearingLabels=['現状の課題感','導入時期・予算感','現在の利用サービス','決裁フロー・決裁者','従業員数・規模感'];
const stepTitles=['受入確認・支払い','詳細条件を入力','禁止先を除外','作成待ち・メール確認','架電開始の準備','架電・途中報告','結果レポート','継続・見直し提案'];
const stepDescriptions=['商材と対応枠を確認してから、初回テストの支払いをご案内します。','商材・アポ条件・禁止事項をまとめて入力。キックオフMTGの代わりになる情報です。','禁止先と重複を照合し、どの企業が除外されたか確認します。','営業ハックが持ち帰ってトークを作成・監修し、メールでご案内します。現在の工程と予定日はこちらで確認できます。','承認された条件を担当者へ引き継ぎ、開始に必要な準備を揃えます。','実施記録と次回連絡が見える状態を体験します。実際の電話発信はありません。','ご依頼分の記録から集計した結果と所見を確認します。','継続先・費用・枠を別途確認し、お客様が次の進め方を選びます。'];
const sampleCandidates=[
 {company:'株式会社サンプル食堂',phone:'03-0000-0101'},
 {company:'デモフーズ株式会社',phone:'03-0000-0102'},
 {company:'架空カフェ青葉',phone:'03-0000-0103'},
 {company:'サンプルキッチン',phone:'03-0000-0104'},
 {company:'架空ダイニングひなた',phone:'03-0000-0105'},
 {company:'テスト食堂みなと',phone:'03-0000-0106'},
 {company:'デモベーカリー',phone:'03-0000-0107'},
 {company:'デモフーズ（株）',phone:'０３−００００−０１０２'}
];
sampleCandidates.push(...Array.from({length:100},(_,i)=>({company:`架空店舗${String(i+1).padStart(3,'0')}`,phone:`03-0001-${String(i+1).padStart(4,'0')}`})));
const workflow={orderType:'initial',prior:null,identityVerified:false,step:0,accepted:false,submitted:false,reviewable:false,simulation:null,completed:false,reported:false,showAll:false,paid:false,data:null,results:[],supervised:false,sent:false,opened:false,approved:false,started:false};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normName=s=>String(s).normalize('NFKC').toLowerCase().replace(/株式会社|有限会社|合同会社|一般社団法人|一般財団法人|\(株\)|\(有\)|\(同\)|[\s　・.,，。]/g,'');
const normPhone=s=>String(s).normalize('NFKC').replace(/\D/g,'');
const validPhone=s=>/^0\d{9,10}$/.test(normPhone(s));
function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false,closed=false; text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c==='"'){if(cell.trim()||closed)throw new Error('CSVの引用符の位置を確認してください。');quoted=true;cell='';}
  else if(c===','||c==='\n'){row.push(cell.trim());cell='';closed=false;if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}
  else{if(closed&&!/\s/.test(c))throw new Error('CSVの引用符の後はカンマまたは改行にしてください。');cell+=c;}
 }
 if(quoted)throw new Error('CSVの引用符が閉じられていません。');
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
function parseBans(text){
 const rows=parseCsv(text);if(rows[0]&&rows[0][0]==='企業名'&&rows[0][1]==='電話番号')rows.shift();
 return rows.map((r,i)=>{if(r.length>2)throw new Error(`禁止先の${i+1}行目は「企業名,電話番号」の2列にしてください。`);const company=(r[0]||'').trim(),phone=(r[1]||'').trim();if(company&&!normName(company))throw new Error(`禁止先の${i+1}行目に具体的な企業名を入力してください。`);if(phone&&!validPhone(phone))throw new Error(`禁止先の${i+1}行目の電話番号を確認してください（国内10〜11桁）。`);return {company,phone};}).filter(r=>r.company||r.phone);
}
function filterCandidates(candidates,bans){
 const seenNames=new Set(),seenPhones=new Set();return candidates.map(r=>{
  const n=normName(r.company),p=normPhone(r.phone);const reasons=[];
  if(bans.some(b=>b.company&&normName(b.company)===n))reasons.push('禁止企業名に一致');
  if(bans.some(b=>b.phone&&normPhone(b.phone)===p))reasons.push('禁止電話番号に一致');
  if(seenNames.has(n)||seenPhones.has(p))reasons.push('候補内の重複');
  seenNames.add(n);seenPhones.add(p);return {...r,reasons,excluded:reasons.length>0};
 });
}
function orderCalls(){return workflow.simulation?.result.calls||100;}
function orderPrice(){return SalesSimulator.price(orderCalls(),workflow.orderType||'initial').trial;}
function updateOrderPackage(){document.querySelectorAll('[data-order-calls]').forEach(e=>e.textContent=orderCalls());document.querySelectorAll('[data-order-price]').forEach(e=>e.textContent=yen(orderPrice()));document.querySelectorAll('[data-order-price-number]').forEach(e=>e.textContent=new Intl.NumberFormat('ja-JP').format(orderPrice()));}
function orderCandidates(){return sampleCandidates.concat(Array.from({length:orderCalls()-100},(_,i)=>({company:`追加架空店舗${i+1}`,phone:`03-0002-${String(i+1).padStart(4,'0')}`})));}
function chosenHearing(){return [...document.querySelectorAll('#hearingOptions input:checked')].map(x=>x.value);}
function updateHearing(){const chosen=chosenHearing();$('hearingCount').textContent=chosen.length+' / 3';document.querySelectorAll('#hearingOptions input').forEach(x=>{x.disabled=!x.checked&&chosen.length>=3;});$('hearingHint').textContent=chosen.length===3?'上限の3つを選択中です。変更する場合は、選択済みの項目を外してください。':'追加ヒアリングは0〜3項目で選択できます。';}
$('hearingOptions').innerHTML=hearingLabels.map((s,i)=>`<label class="checkline"><input type="checkbox" name="hearing" value="${s}" id="hearing${i}">${s}</label>`).join('');
$('hearingOptions').addEventListener('change',updateHearing);updateHearing();
function showError(message){$('portalError').hidden=false;$('portalError').textContent=message;$('portalError').scrollIntoView({behavior:'smooth',block:'center'});}
function goStep(step){
 if(step>0&&!workflow.paid)return;
 if(step>1&&!workflow.data)return;
 if(step>2&&!$('confirmList').checked)return;
 if(step>3&&!workflow.approved)return;
 if(step>4&&!workflow.started)return;
 if(step>5&&!workflow.completed)return;
 if(step>6&&!workflow.reported)return;
 updateOrderPackage();workflow.step=step;window.updateRepeatDemo?.();$('portalError').hidden=true;document.querySelectorAll('.pane').forEach(p=>p.hidden=Number(p.dataset.step)!==step);
 $('stepList').innerHTML=stepTitles.map((s,i)=>`<li class="${i<step?'complete':i===step?'current':''}" ${i===step?'aria-current="step"':''}><span class="num">${i<step?'✓':i+1}</span>${s}</li>`).join('');
 $('stepKicker').textContent=`STEP ${String(step+1).padStart(2,'0')} / 08`;$('stepTitle').textContent=stepTitles[step];$('stepDesc').textContent=stepDescriptions[step];
 if(step===4)renderReady();if(step===5)renderFinal();if(step===6)renderReport();if(step===7)renderContinuation();renderServiceStatus();
 $('portal').scrollIntoView({block:'start'});$('stepTitle').focus({preventScroll:true});window.updateCustomerExperience?.();
}
function openOnboard(){
 document.body.classList.add('portal-open');$('portal').hidden=false;
 if(!workflow.paid&&workflow.diagnosis&&window.salesDiagnosis&&JSON.stringify(workflow.diagnosis.input)!==JSON.stringify(window.salesDiagnosis.input)){resetPrecheck();workflow.diagnosis=null;}
 if(!workflow.data){if($('introService').value.trim()){$('service').value=$('introService').value.trim();$('caseService').value=$('introService').value.trim();}if($('introBenefit').value.trim())$('benefit').value=$('introBenefit').value.trim();const selected=[...document.querySelectorAll('#simHearing input:checked')].map(x=>x.value);document.querySelectorAll('#hearingOptions input').forEach(x=>x.checked=selected.includes(x.value));updateHearing();}
 if(!workflow.submitted){workflow.simulation=window.latestSimulation?structuredClone(window.latestSimulation):null;renderOrderReference();$('caseDate').value=scheduleState.start;$('caseDate').min=jstDate();if(window.salesDiagnosis)$('caseAudience').value=window.salesDiagnosis.phoneScope?'business':'consumer';}

 window.enterCustomerExperience?.();goStep(workflow.step);
}
$('applyBtn').addEventListener('click',openOnboard);$('launchPortal').addEventListener('click',openOnboard);
$('backHome').addEventListener('click',e=>{e.preventDefault();document.body.classList.remove('portal-open');$('portal').hidden=true;window.scrollTo({top:0});});
$('demoPay').addEventListener('click',()=>{if(!workflow.accepted)return;workflow.paid=true;recordEvent('受入確認後の入金確認を再現しました。');$('service').value=$('caseService').value.trim();window.beginPaidIntake?.();goStep(1);});
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>goStep(Number(b.dataset.back))));
function resetFlow(){
 Object.assign(workflow,{orderType:'initial',prior:null,identityVerified:false,step:0,accepted:false,submitted:false,reviewable:false,simulation:null,completed:false,reported:false,showAll:false,paid:false,data:null,results:[],supervised:false,sent:false,opened:false,approved:false,started:false});$('intake').reset();$('banCsv').value='';$('banRows').disabled=false;$('banCsv').disabled=false;$('csvStatus').textContent='';$('confirmList').checked=false;$('toScript').disabled=true;resetApprovals();resetReady();updateHearing();scheduleState.events=[];scheduleState.activity=null;resetPrecheck();goStep(0);
}
$('resetDemo').addEventListener('click',resetFlow);$('restartFlow').addEventListener('click',()=>goStep(1));
$('fillSample').addEventListener('click',()=>{
 const values={location:'東京都サンプル区1-2-3（架空）',companyIntro:'飲食店向けの採用ページを制作する会社です。',callReason:'採用情報の発信でAI活用をして採用単価を数万円下げられた事例が増えてきたので、ご相談したくお電話いたしました。',helpScene:'うまく行った事例をまとめて、御社でもお役に立てないかご相談したく',minPrice:'初期制作5万円〜（架空の価格例・条件により見積もり）',sellingPoints:'求人情報を1ページに集約\nスマートフォンで見やすい構成\n更新しやすい運用を一緒に整理',approvedProof:'',sendRule:'希望された場合のみ送付',sendMethod:'お客様の担当者からメール',sendDocs:'サービス紹介資料（架空）／https://example.com/service',meetingMethod:'オンライン',meetingMinutes:'30分',bookingUrl:'https://example.com/calendar',appointmentNotes:'商談URLはお客様の担当者から送付。',confirmationPhone:'登録した折り返し電話番号に連絡',company:'株式会社〇〇',contact:'鈴木',email:'demo@example.com',callback:'03-0000-0888',service:'飲食店向け採用ページ制作',benefit:'求人情報をまとめた採用ページを作成し、店舗の採用活動を支援します。',material:'https://example.com/service',banRows:'企業名,電話番号\nサンプル食堂,\n,０３−００００−０１０３',forbidden:'格安\n必ず採用できる',wishes:'落ち着いた話し方で案内してほしい。'};
 Object.entries(values).forEach(([k,v])=>$(k).value=v);$('industry').value='飲食店';$('size').selectedIndex=0;$('area').value='首都圏';$('appointmentRole').selectedIndex=0;$('replacement').selectedIndex=0;$('readiness').selectedIndex=0;$('noBans').checked=false;$('banRows').disabled=false;$('banCsv').disabled=false;
 document.querySelectorAll('#hearingOptions input').forEach((x,i)=>x.checked=i<3);updateHearing();$('portalError').hidden=true;
});
$('noBans').addEventListener('change',()=>{const none=$('noBans').checked;$('banRows').disabled=none;$('banCsv').disabled=none;});
function download(name,text,mime){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('downloadCsv').addEventListener('click',()=>download('禁止先ひな形.csv','\uFEFF企業名,電話番号\r\nサンプル食堂,03-0000-0101\r\n,03-0000-0103\r\n','text/csv;charset=utf-8'));
$('banCsv').addEventListener('change',async e=>{
 const f=e.target.files[0];if(!f)return;
 try{if(f.size>1024*1024)throw new Error('CSVは1MB以内にしてください。');const text=await f.text();if(text.includes('\uFFFD'))throw new Error('文字コードはUTF-8で保存してください。');const bans=parseBans(text);if(!bans.length)throw new Error('禁止先がありません。');$('banRows').value=text;$('csvStatus').textContent=`${bans.length}件を読み込みました（外部送信なし）`;$('portalError').hidden=true;}
 catch(err){$('csvStatus').textContent='読み込みできませんでした';showError(err.message);}
});
function collect(){
 const data={};['company','contact','email','callback','service','benefit','material','industry','size','area','schedule','appointmentRole','replacement','readiness','wishes'].forEach(k=>data[k]=$(k).value.trim());
 PackOps.fields.forEach(k=>data[k]=$(k).value.trim());
 data.bans=$('noBans').checked?[]:parseBans($('banRows').value);data.forbidden=$('forbidden').value.split(/[\n、,]/).map(s=>s.trim()).filter(Boolean);data.hearing=chosenHearing();data.restrictions=[...document.querySelectorAll('#restrictionOptions input:checked')].map(x=>x.value);return data;
}
$('intake').addEventListener('submit',e=>{
 e.preventDefault();$('portalError').hidden=true;
 if(!$('intake').reportValidity())return;
 try{const data=collect();if(!validPhone(data.callback))throw new Error('折り返し電話番号を確認してください（国内10〜11桁）。');if(!$('noBans').checked&&!data.bans.length)throw new Error('禁止先を登録するか「アプローチ禁止先はありません」を選択してください。');if(data.sellingPoints.split(/\n/).filter(x=>x.trim()).length>3)throw new Error('おすすめポイントは最大3つ、1行に1つで入力してください。');if(data.hearing.length>3)throw new Error('追加ヒアリングは最大3つです。');
 workflow.data=data;workflow.results=filterCandidates(orderCandidates(),data.bans.concat(window.priorAppointmentBans?.()||[]));if(!workflow.results.some(r=>!r.excluded))throw new Error('候補がすべて除外されています。禁止先・対象条件を確認してください。');
 window.intakeWasSubmitted?.();workflow.started=false;resetApprovals();resetReady();$('confirmList').checked=false;$('toScript').disabled=true;scheduleState.activity=null;renderList();renderScript();recordEvent('商材・禁止事項・条件を受け付けました。');goStep(2);
 }catch(err){showError(err.message);}
});
function renderList(){const excluded=workflow.results.filter(r=>r.excluded).length,total=workflow.results.length;$('toggleAllList').textContent=workflow.showAll?'先頭12行だけ表示する':'残りの候補も表示する';$('listMetrics').innerHTML=`<div><span>候補（架空）</span><b>${total}<small>行</small></b></div><div><span>禁止先・重複の除外</span><b>${excluded}<small>行</small></b></div><div><span>架電対象（サンプル）</span><b>${total-excluded}<small>社</small></b></div>`;
 $('listRows').innerHTML=(workflow.showAll?workflow.results:workflow.results.slice(0,12)).map(r=>`<tr><td>${escapeHtml(r.company)}</td><td>${escapeHtml(r.phone)}</td><td><span class="${r.excluded?'status-out':'status-ok'}">${r.excluded?escapeHtml(r.reasons.join(' / ')):'架電対象'}</span></td></tr>`).join('');}
$('confirmList').addEventListener('change',()=>{$('toScript').disabled=!$('confirmList').checked;});$('toScript').addEventListener('click',()=>{if($('confirmList').checked){recordEvent('リスト精査を確認。営業ハックへ作成依頼を受付。');goStep(3);}});
function summaryHtml(pairs){return pairs.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');}
function conditionPairs(){const d=workflow.data;return [['ターゲット',`${d.area} / ${d.industry} / ${d.size}`],['相手の範囲',d.appointmentRole],['他社利用',d.replacement],['検討状況',d.readiness],['アポ成立',`サービス概要を伝え、商談への同意と日時を確認。${d.schedule}で調整。`],['追加ヒアリング',d.hearing.length?d.hearing.join('、'):'なし（基本情報のみ）']];}
function buildScript(d){return PackOps.draft(d);}
function sharedHtml(d){return '<h3>架電担当者向けの共有事項</h3><p class="micro">読み上げるトークではありません。フォームの回答を引き継いだ引継ぎ情報です。</p><dl class="summary-list shared-info">'+summaryHtml(PackOps.shared(d))+'</dl>';}
function renderScript(){const d=workflow.data;$('conditionSummary').innerHTML=summaryHtml(conditionPairs());$('operatorScript').value=buildScript(d);$('scriptText').value='';$('draftShared').innerHTML=sharedHtml(d);$('reviewedShared').innerHTML='';$('handoffNotes').innerHTML=`<dl class="summary-list">${summaryHtml([['禁止ワード',d.forbidden.join('、')||'指定なし'],['禁止事項',d.restrictions.join('\n')||'指定なし'],['その他の要望',d.wishes?d.wishes+'\n※運営確認対象。成果条件には追加しません。':'指定なし']])}</dl>`;$('scriptDueDisplay').textContent=dateLabel(scheduleState.script);$('waitingAddress').textContent='送付先：'+d.email;$('scriptOps').open=false;validateScript();}
function wordHits(){const text=$('operatorScript').value.normalize('NFKC').toLowerCase();return (workflow.data?.forbidden||[]).filter(w=>text.includes(w.normalize('NFKC').toLowerCase()));}
function validateScript(){const hits=wordHits(),text=$('operatorScript').value,empty=!text.trim(),marker='──────── 架電担当者向け / 読み上げない共有事項 ────────',expected=workflow.data?buildScript(workflow.data).split(marker)[1]:null,sharedValid=!!expected&&text.split(marker).length===2&&text.split(marker)[1]===expected;const valid=!empty&&!hits.length&&sharedValid;$('wordStatus').textContent=empty?'フォームから下書きを作成してください。':hits.length?'禁止ワードを検出：'+hits.join('、')+'。修正するまで監修・送付できません。':!sharedValid?'共有事項はフォームの内容と一致させてください。修正する場合はフォームに戻って再提出してください。':'禁止ワードの一致なし・共有事項はフォームと一致。事実・短いリズム・条件・質問数の意味は監修者が確認します。';$('wordStatus').style.color=valid?'':'#ad3227';$('supervisorDone').disabled=!valid||!$('supervisorCheck').checked;return valid;}
function resetReady(){['operatorAssigned','operatorTrained','slotConfirmed'].forEach(k=>$(k).checked=false);$('startCalls').disabled=true;}
function resetApprovals(){workflow.ledger=[];document.querySelectorAll('[name=nextRoute]').forEach(x=>x.checked=false);$('nextDecision').hidden=true;$('chooseRoute').disabled=true;$('toReport').disabled=true;workflow.completed=false;workflow.reported=false;workflow.supervised=false;workflow.sent=false;workflow.opened=false;workflow.approved=false;workflow.started=false;$('supervisorCheck').checked=false;$('customerApproval').checked=false;$('customerApproval').disabled=true;$('supervisorDone').disabled=true;$('supervisorStatus').textContent='作成・監修待ち';$('approveScript').disabled=true;$('sendScriptMail').disabled=true;$('scriptMail').hidden=true;$('reviewedScript').hidden=true;$('scriptWaiting').hidden=false;resetReady();}
$('loadManualSample').addEventListener('click',()=>{resetApprovals();$('operatorScript').value=buildScript(workflow.data);validateScript();$('draftShared').innerHTML=sharedHtml(workflow.data);recordEvent('フォームからトーク下書き・共有事項を再作成（デモ）。');renderServiceStatus();});
$('operatorScript').addEventListener('input',()=>{resetApprovals();validateScript();renderServiceStatus();});
$('supervisorCheck').addEventListener('change',()=>{if(!$('supervisorCheck').checked){resetApprovals();}validateScript();renderServiceStatus();});
$('supervisorDone').addEventListener('click',()=>{if(!$('supervisorCheck').checked||!validateScript())return;workflow.supervised=true;$('supervisorStatus').textContent='営業ハック監修完了（デモ）。メール送付待ちです。';$('sendScriptMail').disabled=false;recordEvent('営業ハックの監修が完了（デモ）。');renderServiceStatus();});
$('sendScriptMail').addEventListener('click',()=>{if(!workflow.supervised||!validateScript())return;workflow.sent=true;$('sendScriptMail').disabled=true;$('supervisorStatus').textContent='監修済みトークのメール送付済み（デモ）。';workflow.opened=false;workflow.approved=false;$('customerApproval').checked=false;$('customerApproval').disabled=true;$('approveScript').disabled=true;$('reviewedScript').hidden=true;$('scriptText').value=$('operatorScript').value.replace('【下書き / 営業ハックの監修・お客様確認前は使用しません】','【営業ハック監修済み / お客様の確認後に架電準備へ】');$('reviewedShared').innerHTML=sharedHtml(workflow.data);$('scriptMail').hidden=false;$('scriptWaiting').hidden=true;$('mailMetadata').innerHTML=summaryHtml([['宛先',workflow.data.email],['件名','【営業ハック】監修済みトークのご確認をお願いします'],['スクリプト送付',dateLabel(scheduleState.script)+'（予定・デモ）'],['架電開始予定',dateLabel(scheduleState.start)+' / お客様承認後に確定']]);recordEvent('監修済みトークのメール送付を再現しました。実送信なし。');renderServiceStatus();$('scriptOps').open=false;$('scriptMail').scrollIntoView({behavior:'smooth',block:'start'});});
$('openReviewedScript').addEventListener('click',()=>{if(!workflow.sent||!workflow.supervised)return;workflow.opened=true;$('reviewedScript').hidden=false;$('customerApproval').disabled=false;$('reviewedScript').scrollIntoView({behavior:'smooth',block:'start'});});
$('customerApproval').addEventListener('change',()=>{$('approveScript').disabled=!workflow.sent||!workflow.opened||!workflow.supervised||!$('customerApproval').checked||!validateScript();});
$('approveScript').addEventListener('click',()=>{if(!workflow.sent||!workflow.opened||!workflow.supervised||!$('customerApproval').checked||!validateScript())return;workflow.approved=true;recordEvent('お客様がメールのトーク内容を確認・承認（デモ）。');goStep(4);});
function readyConditions(){return [['申込・支払確認（デモ）',workflow.paid],['必要情報・禁止先の確認',!!workflow.data&&$('confirmList').checked],['トーク作成・監修・メール送付・お客様承認',workflow.supervised&&workflow.sent&&workflow.approved],['担当者の確保',$('operatorAssigned').checked],['担当者の習熟確認',$('operatorTrained').checked],['架電枠・開始日の確定',$('slotConfirmed').checked]];}
function renderReady(){const d=workflow.data;const checks=readyConditions();$('readyChecks').innerHTML=checks.map(([s,ok])=>`<li class="${ok?'':'wait'}">${escapeHtml(s)}${ok?' / 完了':' / 待機'}</li>`).join('');$('startCalls').disabled=!checks.every(([,ok])=>ok);$('operatorBrief').innerHTML=summaryHtml([['商材',d.service],...PackOps.shared(d),['除外結果',`${workflow.results.filter(r=>r.excluded).length}行を除外 / サンプル対象${workflow.results.filter(r=>!r.excluded).length}社`],['ヒアリング',`${d.hearing.length}項目 / 最大3項目`],['スクリプト','監修・承認済み v1'],['禁止事項',d.forbidden.concat(d.restrictions).join('、')||'指定なし']]);}
['operatorAssigned','operatorTrained','slotConfirmed'].forEach(k=>$(k).addEventListener('change',renderReady));
$('startCalls').addEventListener('click',()=>{if(!readyConditions().every(([,ok])=>ok))return;workflow.started=true;recordEvent('担当者の準備が完了し、架電開始を再現。');goStep(5);});
function renderFinal(){renderActivity();$('finalSummary').innerHTML=summaryHtml([['依頼元',workflow.data.company],['商材',workflow.data.service],...conditionPairs(),['禁止ワード',workflow.data.forbidden.join('、')||'指定なし'],['リスト',`サンプル対象${workflow.results.filter(r=>!r.excluded).length}社。${orderCalls()}回の上限には不通・再架電を含む。`],['承認状況','監修・顧客承認・担当者準備の完了を再現']]);}
$('downloadBrief').addEventListener('click',()=>{const brief={demo:true,notice:'架空候補による操作デモ。実際の監修・架電・支払は未実施。',plan:{orderType:workflow.orderType||'initial',previousReportId:workflow.prior?.id||null,priceExTax:orderPrice(),callAttempts:orderCalls(),includes:['リスト代','準備','禁止先精査']},intake:workflow.data,list:workflow.results,script:$('scriptText').value,simulation:workflow.simulation,plannedDates:{script:scheduleState.script,start:scheduleState.start,report:scheduleState.report},activity:scheduleState.activity,events:scheduleState.events,status:'架電開始を再現'};download('架電案件説明書_デモ.json',JSON.stringify(brief,null,2),'application/json;charset=utf-8');});
// Dates are illustrative calendar-day placeholders; the operator confirms the actual schedule.
const scheduleState={script:'',start:'',report:'',next:'',confirmed:false,reason:'',events:[],activity:null};
function jstDate(offset=0){const now=new Date(Date.now()+9*60*60*1000);now.setUTCDate(now.getUTCDate()+offset);return now.toISOString().slice(0,10);}
function dateLabel(date){if(!date)return '確認中';return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short'}).format(new Date(date+'T00:00:00+09:00'));}
function timeLabel(){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
function initSchedule(){Object.assign(scheduleState,{script:jstDate(3),start:jstDate(10),report:jstDate(14),next:jstDate(1),confirmed:false,reason:'',events:[],activity:null});}
initSchedule();
function recordEvent(text){scheduleState.events.unshift({at:timeLabel(),text});scheduleState.events=scheduleState.events.slice(0,12);queueMicrotask(()=>window.updateCustomerExperience?.());}
function currentStatus(){
 if(window.packIntakeExpired?.())return '有効期限経過 / この依頼の受付終了';
 if(workflow.reported)return 'レポート納品済み / 次の進め方をご相談';
 if(workflow.completed)return `${orderCalls()}回の架電が完了 / レポートを準備`;
 if(workflow.started)return scheduleState.activity?.paused?'架電を一時中断・再開準備中':'架電中 / 活動報告を確認できます';
 if(workflow.approved)return '担当者・架電枠の準備中';
 if(workflow.sent)return 'メール送付済み / お客様の確認待ち';
 if(workflow.supervised)return '監修完了 / メール送付の準備中';
 if(workflow.step>=3)return '営業ハックで作成・監修中';
 if(workflow.data)return '受付済み / リスト精査の確認中';
 return '架電条件の入力待ち';
}
function renderServiceStatus(){
 const board=$('serviceStatus');board.hidden=!workflow.paid;if(board.hidden)return;
 const customerAction=window.packIntakeExpired?.()?'必要情報未提出のまま有効期限を経過しました。この依頼の架電は開始しません。例外条件のご相談は営業ハックへご連絡ください。':workflow.sent&&!workflow.approved?'お送りしたメールからトークをご確認ください。':workflow.step===1?'商材・条件・禁止事項を入力してください。':'お客様の追加操作はありません。進捗・変更があればメールでご案内します。';
 board.innerHTML=`<div class="panel-heading"><div><span class="role-label">ご依頼の進行状況 / デモ</span><h3>${escapeHtml(currentStatus())}</h3></div><span class="tag">${scheduleState.confirmed?'営業ハック確認済み（デモ）':'仮予定 / 受付確認後に確定'}</span></div><div class="date-grid"><div><span>監修済みトークのメール送付</span><b>${dateLabel(scheduleState.script)}</b></div><div><span>架電開始予定</span><b>${dateLabel(scheduleState.start)}</b><small>トーク承認・担当者準備後</small></div><div><span>結果レポート納品予定</span><b>${dateLabel(scheduleState.report)}</b></div></div><div class="next-contact"><b>${window.packIntakeExpired?.()?'この依頼の利用開始受付は終了しています':'次のご連絡：'+dateLabel(scheduleState.next)+' 18:00まで（日本時間）'}</b><p>${escapeHtml(customerAction)}</p></div>${scheduleState.reason?`<div class="schedule-change"><b>予定・進行に関するご連絡</b><p>${escapeHtml(scheduleState.reason)}</p></div>`:''}<p class="micro">日付は待ち時間を確認するためのデモ用仮設定です。実際の納期を約束するものではありません。予定変更時は理由・新しい予定・次の連絡日をメールとこの画面でご案内する設計です。</p><details class="event-log"><summary>これまでの対応履歴</summary><ul>${scheduleState.events.map(e=>`<li><time>${escapeHtml(e.at)}</time><span>${escapeHtml(e.text)}</span></li>`).join('')||'<li>条件入力をお待ちしています。</li>'}</ul></details><details class="schedule-ops"><summary>運営の日程確定・変更連絡を体験（デモ）</summary><div class="fields"><label>トーク送付予定<input type="date" id="dueScript" value="${scheduleState.script}"></label><label>架電開始予定<input type="date" id="dueStart" value="${scheduleState.start}"></label><label>レポート納品予定<input type="date" id="dueReport" value="${scheduleState.report}"></label><label>次回連絡予定<input type="date" id="dueNext" value="${scheduleState.next}"></label><label class="wide">予定・変更理由（お客様に表示）<textarea id="dueReason" aria-label="予定・変更理由（お客様に表示）" placeholder="例：担当者の枠を調整中です。明日18時までに確定日をご連絡します。">${escapeHtml(scheduleState.reason)}</textarea></label></div><p class="micro" id="scheduleError" role="alert"></p><button class="secondary" id="saveSchedule">日程・連絡内容を更新する（デモ）</button></details>`;
 $('saveSchedule').addEventListener('click',()=>{
  const values=['dueScript','dueStart','dueReport','dueNext'].map(k=>$(k).value),reason=$('dueReason').value.trim();
  if(values.some(x=>!x)){ $('scheduleError').textContent='予定日をすべて入力してください。';return;}
  if(values[1]<values[0]||values[2]<values[1]){$('scheduleError').textContent='トーク送付 → 架電開始 → レポート納品の順に設定してください。';return;}
  if(values[3]<jstDate()){$('scheduleError').textContent='次の連絡日は本日以降に設定してください。';return;}
  if(!reason){$('scheduleError').textContent='確定した内容、または変更の理由を入力してください。';return;}
  Object.assign(scheduleState,{script:values[0],start:values[1],report:values[2],next:values[3],confirmed:true,reason});recordEvent('営業ハックが予定日・次回連絡を更新（デモ）。');renderServiceStatus();if(workflow.data){$('scriptDueDisplay').textContent=dateLabel(scheduleState.script);if(workflow.sent)$('mailMetadata').innerHTML=summaryHtml([['宛先',workflow.data.email],['件名','【営業ハック】監修済みトークのご確認をお願いします'],['スクリプト送付',dateLabel(scheduleState.script)+'（予定・デモ）'],['架電開始予定',dateLabel(scheduleState.start)+' / お客様承認後に確定']]);}if(workflow.started)renderActivity();
 });
}
function renderActivity(){
 const a=scheduleState.activity;const rows=a?a.rows:[];const calls=a?.calls||0;
 $('callActivity').innerHTML=`<div class="panel-heading"><h3>架電の活動報告</h3><span class="tag">${a?'日次報告のサンプル':'初回報告待ち'}</span></div><p>最終更新：${a?escapeHtml(a.updated):'架電開始の連絡を受付（デモ）'}</p><div class="metrics"><div><span>累計架電 / 不通・再架電含む</span><b>${calls}<small> / ${orderCalls()}回</small></b></div><div><span>担当者接続</span><b>${a?.connected||0}<small>件</small></b></div><div><span>獲得アポ</span><b>${a?.appointments||0}<small>件</small></b></div></div><div class="call-progress"><span style="width:${Math.min(100,calls/orderCalls()*100)}%"></span></div><p>${a?escapeHtml(a.message):'開始直後のため、まだ活動実績の報告はありません。数字は実績の記録後に反映します。'}</p><div class="next-contact"><b>次の報告予定：${dateLabel(scheduleState.next)} 18:00まで</b><p>稼働日の終了後に、実績・反応・次の対応をまとめてメールとこの画面に反映する運用です。架電0回や予定変更も理由をお知らせします。</p></div>${rows.length?`<div class="tablewrap"><table class="screen-table"><thead><tr><th>架電履歴の例（架空）</th><th>結果</th><th>次の対応</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td><td>${escapeHtml(r[2])}</td></tr>`).join('')}</tbody></table></div><p class="micro">上の履歴は報告形式のサンプル抜粋です。実架電の証跡ではありません。</p>`:''}<p class="micro">このデモの件数・時刻・反応は架空です。実際の架電システムとは接続していません。</p>`;
 $('miniProgress').innerHTML=`${calls}<small> / ${orderCalls()}回</small>`;
}
$('simulateReport').addEventListener('click',()=>{workflow.completed=false;workflow.reported=false;$('toReport').disabled=true;scheduleState.activity={calls:40,connected:9,appointments:1,updated:timeLabel()+'（デモ）',message:'40回分の活動報告を受領した状態を再現しました。受付での不在が多いため、次回は時間帯を変えて再架電する例です。',rows:[['サンプルキッチン','担当者不在','時間帯を変更して再架電'],['デモベーカリー','商談に同意','日時・連絡先を確認'],['架空ダイニングひなた','現時点で検討なし','終了・理由を記録']]};recordEvent('日次活動報告を受領：40回・担当接続9件・アポ1件（すべて架空）。');renderActivity();renderServiceStatus();});
$('simulateDelay').addEventListener('click',()=>{workflow.completed=false;workflow.reported=false;$('toReport').disabled=true;const previous=scheduleState.activity; scheduleState.activity={calls:previous?.calls||0,connected:previous?.connected||0,appointments:previous?.appointments||0,updated:timeLabel()+'（デモ）',paused:true,message:'本日は担当者都合で追加架電を実施していません。代替担当の調整状況と新しい再開予定を、次の連絡期限までにご案内します。（架空の中断例）',rows:previous?.rows||[]};scheduleState.reason='担当者の調整により架電を一時中断しています。次の連絡期限までに、再開日とレポート納品予定への影響をご案内します。（デモ）';recordEvent('中断理由と次の連絡予定を通知（デモ）。');renderActivity();renderServiceStatus();});
function renderOrderReference(){updateOrderPackage();const q=workflow.simulation;if(!q){$('orderReference').textContent='試算に入力エラーがあります。商品ページで条件を確認してください。';return;}const price=SalesSimulator.price(orderCalls(),workflow.orderType||'initial');if(workflow.orderType==='repeat'){$('orderReference').textContent=`2回目以降の追加依頼（仮料金）：${orderCalls()}回×300円＝${yen(price.trial)}（税別）／税込${yen(price.totalIncTax)}。前回の条件を再利用し、変更点・禁止先を確認します。初回料金は適用しません。`;return;}$('orderReference').textContent=`営業応援パック：基本29,800円＋追加${price.extraCalls}回×300円＝${yen(price.trial)}（税別）／税込${yen(price.totalIncTax)}。リスト・精査・監修・架電${orderCalls()}回・報告・次の行動案を含みます。アポ単価の参考換算は${q.result.unit===null?'算出不可':yen(q.result.unit)}。正式な継続見積もりではありません。`;}
function resetPrecheck(){workflow.accepted=false;workflow.submitted=false;workflow.reviewable=false;$('precheckForm').reset();$('precheckStatus').hidden=true;$('paymentOffer').hidden=true;$('acceptanceOps').open=false;['acceptProduct','acceptCapacity','acceptSchedule'].forEach(k=>$(k).checked=false);$('acceptCase').disabled=true;$('demoPay').disabled=true;workflow.simulation=window.latestSimulation?structuredClone(window.latestSimulation):null;renderOrderReference();$('caseService').value=$('introService').value;$('caseDate').value=scheduleState.start;$('caseDate').min=jstDate();}
$('precheckForm').addEventListener('submit',e=>{
 e.preventDefault();if(!$('precheckForm').reportValidity())return;if(!window.latestSimulation){showError('試算条件を確認してからお進みください。');return;}
 if(workflow.orderType!=='repeat')workflow.simulation=window.latestSimulation?structuredClone(window.latestSimulation):null;workflow.diagnosis=window.salesDiagnosis?structuredClone(window.salesDiagnosis):null;workflow.submitted=true;workflow.paid=false;workflow.data=null;resetApprovals();workflow.accepted=false;workflow.reviewable=['solo','1-10'].includes($('caseEmployees').value)&&$('caseEligibilityConsent').checked&&$('caseAudience').value==='business'&&$('caseCondition').value==='standard';$('precheckStatus').hidden=false;$('paymentOffer').hidden=true;$('demoPay').disabled=true;['acceptProduct','acceptCapacity','acceptSchedule'].forEach(k=>$(k).checked=false);$('acceptCase').disabled=true;$('acceptanceOps').hidden=!workflow.reviewable;
 $('precheckTitle').textContent=workflow.reviewable?'受け入れ確認中です':'この条件は個別のご相談が必要です';$('precheckMessage').textContent=workflow.reviewable?'商材・条件・監修と架電の対応枠を営業ハックが確認します。確認完了後に、お支払いと予定日をご案内します。この時点で料金は発生しません。':'従業員11名以上・個人向け商材は本パックの対象外です。決裁者・予算の確約も標準条件には含みません。営業ハックが対応可否を確認するまで支払いに進めません。標準条件に変更して再度お試しいただけます。';
 recordEvent(workflow.reviewable?'簡易申込を受け付け、対応枠の確認を開始（デモ）。':'標準範囲外のため個別確認へ。決済は未案内（デモ）。');$('precheckStatus').scrollIntoView({behavior:'smooth',block:'start'});
});
['acceptProduct','acceptCapacity','acceptSchedule'].forEach(k=>$(k).addEventListener('change',()=>{const complete=workflow.reviewable&&['acceptProduct','acceptCapacity','acceptSchedule'].every(x=>$(x).checked);$('acceptCase').disabled=!complete;if(!complete){workflow.accepted=false;$('paymentOffer').hidden=true;$('demoPay').disabled=true;}}));
$('acceptCase').addEventListener('click',()=>{if(!workflow.reviewable||!['acceptProduct','acceptCapacity','acceptSchedule'].every(x=>$(x).checked))return;workflow.accepted=true;const desired=$('caseDate').value;scheduleState.start=desired>jstDate(10)?desired:jstDate(10);const d=new Date(scheduleState.start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+Math.ceil(orderCalls()/100)+3);scheduleState.report=d.toISOString().slice(0,10);$('paymentOffer').hidden=false;$('demoPay').disabled=false;$('precheckTitle').textContent='受入可能の案内を再現しました';$('precheckMessage').textContent='商材・標準条件・対応枠を確認しました。以下の内容をご確認のうえ、支払い後に詳細入力へ進みます。';$('acceptedSchedule').textContent=`開始予定：${dateLabel(scheduleState.start)} / レポート予定：${dateLabel(scheduleState.report)}（デモ用仮日程。トーク承認と担当者準備後に確定）`;recordEvent('商材・条件・対応枠を確認し、支払い案内を再現。');$('paymentOffer').scrollIntoView({behavior:'smooth',block:'start'});});
$('toggleAllList').addEventListener('click',()=>{workflow.showAll=!workflow.showAll;renderList();});
function createDemoLedger(){const pool=workflow.results.filter(x=>!x.excluded);return Array.from({length:orderCalls()},(_,i)=>{const k=i%100,block=Math.floor(i/100),target=pool[(block*97+(k<97?k:28+k-97))%pool.length],hour=10+Math.floor(k*3/60),minute=(k*3)%60,date=new Date(scheduleState.start+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+block);const connected=[3,7,12,17,22,27,32,35,38,...Array.from({length:25},(_,j)=>40+j),88].includes(k),appointment=[12,55,88].includes(k);const status=appointment?'アポ獲得':connected?(k%3===0?'課題・検討なし':k%3===1?'既存利用・見送り':'担当者不在で再架電'):k%2===0?'不通':'受付で終了';return {attempt:i+1,date:date.toISOString().slice(0,10),time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,company:target.company,phone:target.phone,result:status,connected,appointment,next:status==='担当者不在で再架電'?'時間帯を変更して再架電':status==='アポ獲得'?'商談内容と日時を引き継ぎ':'記録して終了'};});}
$('completeCalls').addEventListener('click',()=>{if(!workflow.started)return;workflow.ledger=createDemoLedger();workflow.completed=true;workflow.reported=false;scheduleState.activity={calls:workflow.ledger.length,connected:workflow.ledger.filter(x=>x.connected).length,appointments:workflow.ledger.filter(x=>x.appointment).length,updated:timeLabel()+'（デモ）',message:`${orderCalls()}回分の実施記録が揃った状態を再現しました。レポートで集計・所見・次の打ち手を確認できます。`,rows:workflow.ledger.slice(0,5).map(x=>[x.company,x.result,x.next])};$('toReport').disabled=false;recordEvent(`${orderCalls()}回の架電完了とレポート準備を再現しました。`);renderActivity();renderServiceStatus();});
$('toReport').addEventListener('click',()=>{if(!workflow.completed)return;workflow.reported=true;recordEvent(`${orderCalls()}回分のレポート納品を再現しました。`);goStep(6);});
function reportStats(){const rows=workflow.ledger||[];return {calls:rows.length,connected:rows.filter(x=>x.connected).length,appointments:rows.filter(x=>x.appointment).length};}
function renderReport(){renderNextActions();const a=reportStats(),counts={};for(const x of workflow.ledger)counts[x.result]=(counts[x.result]||0)+1;
 $('reportMetrics').innerHTML=`<div><span>実施回数（架空）</span><b>${a.calls}<small>回</small></b></div><div><span>担当者接続</span><b>${a.connected}<small>件</small></b></div><div><span>アポ</span><b>${a.appointments}<small>件</small></b></div>`;
 const before=workflow.simulation?.result;$('reportCompare').textContent=before?`申込時の仮試算：アポ${dec(before.appointments)}件 → 今回の架空の観測例：${a.appointments}件。仮定と実績は別です。実施回数${a.calls}回の中には不通と再架電を含みます。`:'ご依頼分の記録を集計した架空の納品例です。';
 $('reportInsights').innerHTML=summaryHtml([['接続率',dec(a.connected/a.calls*100)+'%'],['全体のアポ率',dec(a.appointments/a.calls*100)+'%'],['アポ当たりのご依頼費用',a.appointments?yen(orderPrice()/a.appointments):'算出不可（0件）'],['確認できたこと','アポが発生した対象と、接続・断り理由の傾向。'],['まだ分からないこと','顧客側の受注率・受注粗利・継続時に同じ率が出るか。']]);
 $('reportBreakdown').innerHTML=Object.entries(counts).map(([k,n])=>`<div class="breakdown-row"><span>${escapeHtml(k)}</span><div><i style="width:${n/a.calls*100}%"></i></div><b>${n}回</b></div>`).join('');
 $('reportRecommendation').textContent=a.appointments>0?'この架空例ではアポが発生しています。商談の反応と採算、提供側の対応枠を確認したうえで、小さな上限から継続を相談する案です。受付での終了・不通もあるため、時間帯と対象の見直しを併せて検討します。':'アポが得られていないため、そのまま継続を勧めず、対象・時間帯・訴求を見直す案です。';
}
$('downloadCallLog').addEventListener('click',()=>{if(!workflow.completed)return;const quote=x=>'"'+String(x).replace(/"/g,'""')+'"';const rows=[['回数','日付','時刻','企業名（架空）','電話番号','結果','次の対応'],...workflow.ledger.map(x=>[x.attempt,x.date,x.time,x.company,x.phone,x.result,x.next])];download(`架空_${orderCalls()}回_実施履歴.csv`,'\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');});
$('toContinuation').addEventListener('click',()=>{if(workflow.reported)goStep(7);});
function renderContinuation(){const a=reportStats();$('continuationReason').textContent=`今回の架空例は${a.calls}回・アポ${a.appointments}件です。顧客側の商談結果と採算を確認し、継続・連携先紹介・条件見直し・終了から相談先を選べます。初回テストはテレアポ。メールやフォーム等は、ここから検討する別の提案候補です。`;renderContinuationEstimate();}
function renderContinuationEstimate(){const n=Number($('continueCount').value),a=reportStats();if(!Number.isInteger(n)||n<1||n>9){$('continuationEstimate').textContent='1〜9件の整数で入力してください。';$('chooseRoute').disabled=true;return;}const input=workflow.simulation?.input||readSimulation(),r=SalesSimulator.calculate({...input,connect:a.connected/a.calls*100,appointment:a.connected?a.appointments/a.connected*100:0,hearing:workflow.data.hearing.length});$('continuationEstimate').textContent=r.unit===null?'観測アポが0件のため、継続の単価試算はできません。':`観測率${dec(r.rate*100)}%を使う仮計算では、アポ${n}件に約${Math.ceil(n/r.rate)}回の架電。参考単価${yen(r.unit)}／アポ、成果報酬を相談する場合の参考額${yen(r.unit*n)}。成果報酬の対応可否・単価・アポ条件は、別途正式見積もりで確認します。`;updateRouteButton();}
$('continueCount').addEventListener('input',renderContinuationEstimate);
function updateRouteButton(){const count=Number($('continueCount').value);$('chooseRoute').disabled=!document.querySelector('[name=nextRoute]:checked')||!Number.isInteger(count)||count<1||count>9;}
document.querySelectorAll('[name=nextRoute]').forEach(x=>x.addEventListener('change',()=>{$('nextDecision').hidden=true;updateRouteButton();}));
$('chooseRoute').addEventListener('click',()=>{const route=document.querySelector('[name=nextRoute]:checked');if(!route||$('chooseRoute').disabled)return;const label={hack:'営業ハックでの継続相談',partner:'連携先紹介の相談',revise:'対象・訴求の見直し相談',stop:'今回は継続しない'}[route.value];$('nextDecision').hidden=false;$('nextDecision').innerHTML=`<h3>${label}を選択しました（デモ）</h3><p>${route.value==='stop'?'自動更新・追加請求はありません。レポートは今回の振り返りにお使いいただけます。':'この希望をもとに担当者が条件と対応枠を確認する流れです。契約・決済・外部への情報共有は行っていません。'}</p>`;recordEvent('次の希望を選択：'+label+'（デモ）。');renderServiceStatus();$('nextDecision').scrollIntoView({behavior:'smooth',block:'start'});});

function renderNextActions(){const methods=workflow.diagnosis?.methods||[];const names=methods.filter(x=>x.id!=='phone').map(x=>x.name).join('・');$('reportNextActions').innerHTML=`<h4>この見込み先に、次は何をする？</h4><dl class="summary-list">${summaryHtml([['アポが取れた先','会話で確認した課題と商談情報を引き継ぎ、商談の準備へ。'],['担当者不在だった先','時間帯と連絡予定を見直し、再架電を検討。'],['既存利用・見送りの先','リプレイス提案を受け入れるか、対象条件を再確認。'],['不通・受付終了の先','番号・営業時間・受付での伝え方を確認し、別手法も検討。'],['別手法の検討候補',names||'メール・フォーム・資料での案内など。送付先や条件を確認して個別に検討。']])}</dl><p class="micro">次の行動案を整理するもので、資料送付や別手法の実施を含む契約ではありません。</p>`;}

$('downloadSalesList').addEventListener('click',()=>{if(!workflow.completed)return;const byPhone=new Map();for(const row of workflow.ledger){const key=row.phone||row.company;const old=byPhone.get(key);byPhone.set(key,{...row,attemptCount:(old?.attemptCount||0)+1});}const rows=[['企業名（架空）','電話番号（架空）','今回の架電回数','最終架電日','最終架電時刻','最終の進捗・反応','次の対応案'],...Array.from(byPhone.values(),x=>[x.company,x.phone,x.attemptCount,x.date,x.time,x.result,x.next])];const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';download('架空_営業先リスト_進捗と次の対応付き.csv','\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv;charset=utf-8');});
