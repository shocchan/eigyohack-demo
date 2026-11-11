(function(root){
'use strict';
function dateAt(base,n){const d=new Date(base+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(base)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==base)throw Error('日付が不正です。');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function deadline(base,day,due=7){if(!Number.isInteger(day)||day<0||!Number.isInteger(due)||due<7||due>30)throw Error('日数が不正です。');return {due:dateAt(base,due),expiry:dateAt(base,30),elapsed:day,remaining:Math.max(0,due-day),validRemaining:Math.max(0,30-day),state:day>30?'expired':day>due?'hold':'waiting',remind:[1,3,6,21,28,30].includes(day)};}
const fields=['location','companyIntro','callReason','helpScene','minPrice','sellingPoints','approvedProof','sendRule','sendMethod','sendDocs','meetingMethod','bookingUrl','meetingMinutes','appointmentNotes','confirmationPhone'];
function shared(d){return [['会社所在地',d.location||'未登録'],['折り返し電話番号',d.callback],['会社のおすすめポイント',d.sellingPoints||'未登録'],['価格の目安',d.minPrice||'個別確認・未承認価格は案内しない'],['使用を許可された実績',d.approvedProof||'登録なし・実績を付け足さない'],['資料送付',d.sendRule||'希望された場合のみ'],['送付方法',d.sendMethod||'メール'],['送付資料',d.sendDocs||d.material||'未登録・送付前に確認'],['商談方法',d.meetingMethod||'オンライン'],['日程調整可能日時',d.schedule],['日程調整ツール',d.bookingUrl||'なし・候補日時を確認'],['商談時間',d.meetingMinutes||'30分'],['アポイントの補足',d.appointmentNotes||'指定なし（標準条件内）'],['ヒアリング（最大3項目）',(d.hearing||[]).join('、')||'追加質問なし'],['確認電話',d.confirmationPhone?.startsWith('登録した')?d.confirmationPhone+'：'+d.callback:(d.confirmationPhone||d.callback)]];}
function draft(d){if((d.hearing||[]).length>3)throw Error('追加ヒアリングは最大3つです。');const qs={'現状の課題感':'現在、関連する業務でお困りのことはありますか。','導入時期・予算感':'検討される場合、時期やご予算の目安はありますか。','現在の利用サービス':'現在ご利用のサービスや対応方法はありますか。','決裁フロー・決裁者':'検討の際のご相談先や手順を教えていただけますか。','従業員数・規模感':'従業員数や事業の規模を教えていただけますか。'};
const sampleTalk=d.callReason==='採用情報の発信でAI活用をして採用単価を数万円下げられた事例が増えてきたので、ご相談したくお電話いたしました。'&&d.helpScene==='うまく行った事例をまとめて、御社でもお役に立てないかご相談したく';
return `【下書き / 営業ハックの監修・お客様確認前は使用しません】
【受付挨拶・担当者接続】
${sampleTalk?'突然のお電話、失礼いたします。株式会社〇〇の鈴木です。':`突然のお電話、失礼いたします。${d.company}の${d.service}のご案内を担当しております、営業ハックの架電担当です。`}
${sampleTalk?'〇〇部のご担当者様はいらっしゃいますでしょうか。':`関連業務の${String(d.appointmentRole||'').startsWith('関連業務の責任者')?'責任者':'ご担当者'}様はいらっしゃいますでしょうか。`}

【担当者挨拶】
${sampleTalk?'突然のお電話、失礼いたします。株式会社〇〇の鈴木です。':`突然のお電話、失礼いたします。${d.company}のサービスをご案内しております、営業ハックの架電担当です。`}

【何者か / 1行】
${sampleTalk?'弊社は、':''}${d.companyIntro||d.service+'を提供している会社です。'}
【連絡した理由 / 1行】
${d.callReason||d.service+'の件で、お役に立てる場面がないかご相談したく、お電話しました。'}
【熱量＋日程打診 / 短く】
${sampleTalk?'ぜひ、'+d.helpScene+'、':`ぜひ、${d.helpScene||d.benefit}という場面で、お力になれればと思っております。`}
サービスの内容と費用感も含めて、${d.meetingMinutes||'30分'}ほど、ご紹介のお時間をいただけませんでしょうか。
${d.schedule}の中で、候補日時を2つ確認してご相談します。
※候補は実際の空き枠から提示。予約ツールの空き情報を確認するまでは確約しません。

【アポ条件 / 日程確定前に確認】
相手の範囲：${d.appointmentRole}
${d.replacement==='利用中の企業は対象外'?'同様のサービスをご利用中かを確認。利用中はアポ対象外です。':'他社サービス利用中でも対象。乗り換えや契約の確約は求めません。'}
${d.readiness==='課題を認識している相手が対象'?'関連業務の課題を確認。課題認識がない場合はアポ対象外です。':'情報収集の段階も対象。サービス概要と商談への同意を確認します。'}

【追加ヒアリング / ${(d.hearing||[]).length}項目・最大3項目】
${(d.hearing||[]).map((h,i)=>(i+1)+'. '+qs[h]).join('\n')||'追加質問なし。'}
※回答を強要せず、回答内容を新たなアポ成立条件にはしません。

【日程・連絡先の確認】
商談の目的と日時、担当者名・部署・連絡先を確認します。
商談方法：${d.meetingMethod||'オンライン'} / 所要時間：${d.meetingMinutes||'30分'}

【分からない質問への対応】
ご質問ありがとうございます。その点は確認のうえ、担当から正確にご案内いたします。
折り返し・メール・商談での説明のうち、ご希望を確認します。分からない内容は推測で答えません。

【価格を聞かれた場合】
${d.minPrice||'条件によって異なるため、確認のうえ担当からご案内します。'}
※未承認の値引き・無料提供・成果の断定はしません。

【お断りの場合】
承知しました。お時間をいただき、ありがとうございました。再連絡不要のご希望は記録します。

──────── 架電担当者向け / 読み上げない共有事項 ────────
${shared(d).map(([k,v])=>'【'+k+'】\n'+v).join('\n\n')}`;
}
root.PackOps={deadline,dateAt,fields,shared,draft};if(typeof module!=='undefined')module.exports=root.PackOps;
})(typeof window!=='undefined'?window:globalThis);
