(function(root){
 function plan(s){
  const total=s.totalCalls||100,price=s.price||29800;
  if(s.step===0){if(!s.submitted)return {action:'submit',label:'申込例を送ってみる',title:'申し込むと、まず受付の案内が届きます',text:'まだ支払いは発生しません。商材と対応枠を確認してから、支払いをご案内します。'};if(!s.reviewable)return {action:'revise',label:'申込条件を見直す',title:'標準の対象外のため、個別に確認します',text:'受け入れできるか分かるまでは支払いに進みません。条件を変更して体験できます。'};if(!s.accepted)return {action:'accept',label:'翌日の受入メールを受け取る',title:'営業ハックが商材と対応枠を確認中です',text:'デモの日付を進めると、受入可能の案内と支払い方法が届きます。'};return {action:'pay',label:'支払いを体験して次へ',title:'対応枠を確認できました。内容を見てお支払いへ',text:`営業応援パック：${price.toLocaleString('ja-JP')}円（税別）、架電${total}回込み。体験用で実決済は行いません。`};}
  if(s.step===1)return {action:'intake',label:'入力例で準備を依頼する',title:'要望をまとめて伝えると、準備が始まります',text:'禁止先・禁止ワード・最大3つの追加ヒアリングを入力。キックオフMTGの代わりになる情報です。'};
  if(s.step===2)return {action:'list',label:'除外内容を確認して作成依頼へ',title:'電話してはいけない先を、リストから除外',text:'除外結果を確認した後、営業ハックがトークを持ち帰って作成・監修します。'};
  if(s.step===3){if(!s.supervised)return {action:'reviewDraft',label:'営業ハックの監修完了を体験',title:'フォームから下書きと共有事項を用意しました',text:'運営が原稿の短さ・事実・禁止事項・標準条件を確認・修正します。運営の確認手順を開くと、下書きも見られます。監修前にお客様へ送付・架電しません。'};if(!s.sent)return {action:'script',label:'監修済み原稿のメールを受け取る',title:'営業ハックの監修が完了しました',text:'監修済みのトークと共有事項をメールでご案内する場面へ進みます。メール確認は送付後7日以内が目安です。'};if(!s.opened)return {action:'openScript',label:'届いたメールから原稿を開く',title:'監修済みのトークがメールで届きました',text:'ご入力の内容・禁止事項・ヒアリング項目が反映されているか確認します。'};return {action:'approve',label:'内容を確認・承認して準備へ',title:'確認が終わったら、開始の準備へ',text:'実運用では事実情報の修正はメールで相談できます。この体験では内容確認後の承認を再現します。'};}
  if(s.step===4)return {action:'start',label:'開始予定日の案内を受け取る',title:'担当者の準備と架電枠を調整しています',text:'開始日まで日付を進めると、担当者の準備が完了した案内と、架電開始の連絡が届きます。'};
  if(s.step===5){if(s.completed)return {action:'report',label:'納品予定日のレポートを受け取る',title:`${total}回の架電が完了。結果を整理しています`,text:'件数・相手の反応・次の施策をまとめ、納品予定日にレポートをお届けする場面です。'};if(s.calls===0)return {action:'daily',label:'初日の途中報告を受け取る',title:'テスト架電が始まりました',text:'日付を進めて、その日にどれだけ電話し、どんな反応があったかの報告を受け取ります。'};return {action:'complete',label:s.paused?'再開後の完了報告を見る':'数日後の完了報告を受け取る',title:s.paused?'中断理由と、次の連絡予定をご案内しています':'途中経過が分かったら、完了まで進めましょう',text:`残りの架電を行い、${total}回分の実施記録が揃った状態へ進めます。`};}
  if(s.step===6)return {action:'next',label:'次の営業提案を見る',title:'結果を見て、次に何をするかを考えます',text:'アポが取れた先・不在の先・見送りの先ごとに、次の行動を整理してお渡しします。'};
  if(s.decided)return {action:'restart',label:'もう一度はじめから体験',title:'申し込みから次の相談まで、体験できました',text:'実際の契約や追加請求は発生していません。続けるかどうかは、お客様が選ぶ設計です。'};
  return {action:'choose',label:s.route?'この希望で相談へ進む':'下で続け方を選んでください',disabled:!s.route,title:'継続・別サービス・見直し・終了から選びます',text:'自動更新はしません。別手法を含む提案や費用は、次の相談で確認します。'};
 }
 function dayOffset(base,date){const n=Math.round((new Date(date+'T00:00:00Z')-new Date(base+'T00:00:00Z'))/86400000);if(!Number.isFinite(n))throw new Error('仮想日付が不正です。');return Math.max(0,n);}
 function dateAt(base,day){if(!Number.isInteger(day)||day<0)throw new Error('経過日数が不正です。');const d=new Date(base+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+day);return d.toISOString().slice(0,10);}
 root.CustomerJourney={plan,dayOffset,dateAt};if(typeof module!=='undefined')module.exports=root.CustomerJourney;
})(typeof window!=='undefined'?window:globalThis);
