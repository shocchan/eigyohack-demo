'use strict';
const experience={enabled:true,base:jstDate(),day:0,time:'10:00',mails:[],selectedMail:null,known:new Set(),dataRef:null,revision:0,delayed:false};
function experienceDate(){return CustomerJourney.dateAt(experience.base,experience.day);}
function experienceStamp(){return `${dateLabel(experienceDate())} ${experience.time}`;}
function experienceSnapshot(){return {totalCalls:orderCalls(),price:orderPrice(),step:workflow.step,submitted:workflow.submitted,reviewable:workflow.reviewable,accepted:workflow.accepted,supervised:workflow.supervised,sent:workflow.sent,opened:workflow.opened,completed:workflow.completed,calls:scheduleState.activity?.calls||0,paused:!!scheduleState.activity?.paused,route:!$('chooseRoute').disabled?document.querySelector('[name=nextRoute]:checked')?.value:undefined,decided:!$('nextDecision').hidden};}
function addExperienceMail(key,title,body,type='info'){if(experience.known.has(key))return;experience.known.add(key);experience.mails.unshift({key,title,body,type,date:experienceStamp()});}
function experienceAdvance(day,time='10:00'){experience.day=Math.max(experience.day,day);experience.time=time;}
function experienceCheck(id){const el=$(id);if(!el.checked){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));}}
function syncExperienceMails(){
 if(workflow.data&&workflow.data!==experience.dataRef){experience.dataRef=workflow.data;experience.revision++;}
 if(workflow.submitted)addExperienceMail('receipt','お申し込みを受け付けました',workflow.reviewable?'商材と条件をお預かりしました。営業ハックが対応可否と架電枠を確認し、次のご案内をお送りします。\nこの段階ではお支払いはありません。':'標準テストの範囲では個別確認が必要な条件をお預かりしました。対応可否が分かるまで、お支払いには進みません。');
 if(workflow.accepted)addExperienceMail('accepted','受入可能・お支払いのご案内',`ご依頼の商材と対応枠を確認しました。\n営業応援パック：${yen(orderPrice())}（税別）／架電${orderCalls()}回込み\n開始予定：${dateLabel(scheduleState.start)}\n入金確認後に、詳細情報の入力と準備を開始します。\n予定日はトーク確認・担当者準備を経て確定します。`,'payment');
 if(workflow.paid)addExperienceMail('paid','お支払いを確認しました',`営業応援パックの支払いを確認した場面を再現しています。実決済はありません。\n次は、商材・禁止先・禁止ワード・追加ヒアリングを入力してください。提出目安は入金確認から7日、有効期限は30日目23:59（日本時間）です。${window.packPaymentDates?.()||'具体的な日付は専用フォームでご確認ください。'}お客様都合のキャンセル・情報未提出による失効は原則返金なし（当社都合等の例外あり）の案です。\n入力内容をもとに営業ハックがトークを作成・監修します。`);
 if(workflow.data)addExperienceMail('intake-'+experience.revision,'架電準備の情報を受け付けました',`商材と要望をお預かりしました。\n禁止先の精査後、トークを作成・監修します。\nトーク送付予定：${dateLabel(scheduleState.script)}\n今はお客様に追加の作業はありません。不足がある場合のみメールで確認します。`);
 if(workflow.sent)addExperienceMail('script-'+experience.revision,'監修済みトークのご確認をお願いします',`営業ハックでトークを作成・監修しました。\nご入力いただいた商材・禁止事項・選択条件をご確認ください。\n事実情報に誤りがある場合は修正をご相談いただけます。\n内容確認後に、担当者の準備と開始日の確定へ進みます。`,'script');
 if(workflow.approved)addExperienceMail('approved-'+experience.revision,'トークの確認ありがとうございます',`確認済みのトークと禁止先の情報を担当者へ引き継ぎます。\n開始予定：${dateLabel(scheduleState.start)}\n次は準備完了と架電開始をご案内します。`);
 if(workflow.started)addExperienceMail('started-'+experience.revision,'本日からテスト架電を開始します',`担当者の準備が整い、架電開始の連絡を受け取った場面です。\n不通・再架電を含む${orderCalls()}回を実施します。\n実施記録・途中の反応・次回連絡予定は、この画面で確認いただけます。`,'activity');
 if(scheduleState.activity?.calls===40&&!scheduleState.activity?.paused)addExperienceMail('daily-'+experience.revision,'途中報告：40回分の実施状況',`本日の途中報告のサンプルです。\n架電40回／担当者接続9件／アポ1件。\n不在が多い先は、時間帯を変えて再架電を検討しています。\n残りの実施と完了報告をお待ちください。`,'activity');
 if(scheduleState.activity?.paused)addExperienceMail('paused-'+experience.revision,'進行変更と次のご連絡について',`担当者の調整が必要となり、追加の架電を一時中断しています。\n現在の実施回数：${scheduleState.activity.calls}回\nレポート予定を${dateLabel(scheduleState.report)}に変更する例です。\n次の連絡期限までに再開状況をご案内します。`,'activity');
 if(workflow.completed)addExperienceMail('completed-'+experience.revision,`ご依頼の${orderCalls()}回が完了しました`,`${orderCalls()}回分の実施記録が揃いました。\n担当者接続${reportStats().connected}件／アポ${reportStats().appointments}件という架空の例です。\nレポート納品予定：${dateLabel(scheduleState.report)}\n結果と次の打ち手を整理してお送りします。`,'activity');
 if(workflow.reported)addExperienceMail('report-'+experience.revision,'結果レポートと次の施策をお届けします',`${orderCalls()}回分の結果レポートをお届けした場面です。\n件数だけでなく、相手の反応と次の行動案もまとめています。\nアポの先は商談準備へ。不在の先は時間帯を再検討。見送りの先は対象条件や伝え方を見直します。`,'report');
 if(workflow.step===7)addExperienceMail('proposal-'+experience.revision,'次の営業の進め方をご相談ください',`成果報酬型での継続相談、営業ハックの別サービス、対象や訴求の見直し、今回は終了、からご希望を伺います。\n自動更新はありません。正式な条件・費用・対応枠は、次の相談で確認します。`,'proposal');
}
function updateCustomerExperience(){
 const visible=document.body.classList.contains('portal-open');$('customerExperience').hidden=!visible;if(!visible)return;
 syncExperienceMails();if(workflow.step===3&&$('draftStage'))$('draftStage').textContent=workflow.sent?'下書き作成済 → 営業ハック監修済 → メール送付済 → お客様確認待ち':workflow.supervised?'下書き作成済 → 営業ハック監修済 → メール送付待ち':'フォーム反映・下書き作成済 → 営業ハック監修待ち → メール送付待ち';const state=experienceSnapshot(),p=CustomerJourney.plan(state);$('experienceClock').textContent=`${experience.day===0?'申込当日':experience.day+'日目'} · ${experienceStamp()}（仮想日付）`;$('experienceTitle').textContent=p.title;$('experienceText').textContent=p.text;$('experienceNext').textContent=p.label;$('experienceNext').disabled=!!p.disabled;$('experienceNext').dataset.action=p.action;$('experienceMailCount').textContent=experience.mails.length;$('experienceDelay').hidden=!(workflow.step===5&&scheduleState.activity?.calls>0&&!workflow.completed&&!experience.delayed);document.body.classList.toggle('customer-experience',experience.enabled);$('toggleExperienceDetails').setAttribute('aria-pressed',String(!experience.enabled));$('toggleExperienceDetails').textContent=experience.enabled?'運営の確認手順も見る':'お客様目線に戻す';window.updateRepeatDemo?.();
}
function enterCustomerExperience(){document.body.classList.toggle('customer-experience',experience.enabled);updateCustomerExperience();}
window.updateCustomerExperience=updateCustomerExperience;window.enterCustomerExperience=enterCustomerExperience;
function resetExperience(){experience.base=jstDate();experience.day=0;experience.time='10:00';experience.mails=[];experience.known.clear();experience.selectedMail=null;experience.dataRef=null;experience.revision=0;experience.delayed=false;initSchedule();resetFlow();updateCustomerExperience();}
$('startCustomerExperience').addEventListener('click',()=>{experience.enabled=true;openOnboard();});
$('resetDemo').addEventListener('click',()=>{initSchedule();experience.day=0;experience.time='10:00';experience.mails=[];experience.known.clear();experience.dataRef=null;experience.revision=0;experience.delayed=false;updateCustomerExperience();});
$('toggleExperienceDetails').addEventListener('click',()=>{experience.enabled=!experience.enabled;updateCustomerExperience();});
$('experienceNext').addEventListener('click',()=>{
 const p=CustomerJourney.plan(experienceSnapshot());if(p.disabled)return;
 switch(p.action){
  case 'submit':$('precheckForm').requestSubmit();break;
  case 'revise':$('precheckForm').scrollIntoView({behavior:'smooth',block:'center'});$('caseCondition').focus({preventScroll:true});break;
  case 'accept':experienceAdvance(1);['acceptProduct','acceptCapacity','acceptSchedule'].forEach(experienceCheck);$('acceptCase').click();break;
  case 'pay':$('demoPay').click();break;
  case 'intake':if(!workflow.prior)$('fillSample').click();$('intake').requestSubmit();break;
  case 'list':experienceCheck('confirmList');$('toScript').click();break;
  case 'reviewDraft':experienceCheck('supervisorCheck');$('supervisorDone').click();if(!workflow.supervised)showError('監修前に修正が必要です。'+$('wordStatus').textContent);break;
  case 'script':experienceAdvance(CustomerJourney.dayOffset(experience.base,scheduleState.script));$('sendScriptMail').click();if(!workflow.sent)showError('トークに確認・修正が必要です。'+$('wordStatus').textContent);break;
  case 'openScript':$('openReviewedScript').click();break;
  case 'approve':experienceCheck('customerApproval');$('approveScript').click();break;
  case 'start':experienceAdvance(CustomerJourney.dayOffset(experience.base,scheduleState.start));['operatorAssigned','operatorTrained','slotConfirmed'].forEach(experienceCheck);scheduleState.next=experienceDate();$('startCalls').click();break;
  case 'daily':experienceAdvance(experience.day,'15:00');scheduleState.next=experienceDate();$('simulateReport').click();scheduleState.activity.updated=experienceStamp()+'（デモ）';renderActivity();break;
  case 'complete':experienceAdvance(experience.day+Math.ceil(orderCalls()/100),'17:00');scheduleState.next=experienceDate();$('completeCalls').click();scheduleState.activity.updated=experienceStamp()+'（デモ）';if(experience.delayed)scheduleState.reason=`担当者の調整後に再開し、${orderCalls()}回の架電を完了しました。変更後のレポート予定日に納品します。（デモ）`;renderActivity();break;
  case 'report':experienceAdvance(CustomerJourney.dayOffset(experience.base,scheduleState.report),'12:00');scheduleState.next=experienceDate();$('toReport').click();break;
  case 'next':$('toContinuation').click();break;
  case 'choose':$('chooseRoute').click();break;
  case 'restart':resetExperience();break;
 }
 renderServiceStatus();updateCustomerExperience();$('customerExperience').scrollIntoView({behavior:'smooth',block:'start'});
});
$('experienceDelay').addEventListener('click',()=>{if(experience.delayed||workflow.completed)return;experience.delayed=true;const old=CustomerJourney.dayOffset(experience.base,scheduleState.report);scheduleState.report=CustomerJourney.dateAt(experience.base,old+1);scheduleState.next=CustomerJourney.dateAt(experience.base,experience.day+1);$('simulateDelay').click();scheduleState.activity.updated=experienceStamp()+'（デモ）';renderActivity();renderServiceStatus();updateCustomerExperience();});
function openExperienceInbox(){if(!$('experienceMailDialog').open)$('experienceMailDialog').showModal();renderExperienceInbox();}
function renderExperienceInbox(){if(!experience.mails.length){$('experienceMailList').innerHTML='<p>申し込みを進めると、届いたメールがここに並びます。</p>';$('experienceMailBody').innerHTML='<h3>まだメールはありません</h3><p>「申込例を送ってみる」から体験を始めてください。</p>';return;}const mail=experience.mails.find(x=>x.key===experience.selectedMail)||experience.mails[0];experience.selectedMail=mail.key;$('experienceMailList').innerHTML=experience.mails.map(m=>`<button class="inbox-mail ${m.key===mail.key?'selected':''}" data-mail="${m.key}"><time>${escapeHtml(m.date)}</time><b>${escapeHtml(m.title)}</b><span>営業ハック / 体験用メール</span></button>`).join('');$('experienceMailBody').innerHTML=`<span class="plan-label">営業ハックからのご案内</span><h3>${escapeHtml(mail.title)}</h3><p class="mail-date">${escapeHtml(mail.date)} · 宛先：${escapeHtml(workflow.data?.email||'demo@example.com')}</p><div class="mail-text">${escapeHtml(mail.body).replace(/\n/g,'<br>')}</div><button class="primary" id="experienceMailAction">この案内の画面を見る</button>`;document.querySelectorAll('[data-mail]').forEach(b=>b.addEventListener('click',()=>{experience.selectedMail=b.dataset.mail;renderExperienceInbox();}));$('experienceMailAction').addEventListener('click',()=>{$('experienceMailDialog').close();if(mail.type==='script'&&workflow.sent){goStep(3);$('openReviewedScript').click();}else if(mail.type==='activity'&&workflow.started)goStep(5);else if(mail.type==='report'&&workflow.reported)goStep(6);else if(mail.type==='proposal'&&workflow.reported)goStep(7);else goStep(workflow.step);updateCustomerExperience();});}
$('openExperienceInbox').addEventListener('click',openExperienceInbox);$('closeExperienceInbox').addEventListener('click',()=>$('experienceMailDialog').close());
$('portal').addEventListener('change',()=>queueMicrotask(updateCustomerExperience));$('portal').addEventListener('click',()=>queueMicrotask(updateCustomerExperience));
updateCustomerExperience();
