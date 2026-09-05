(() => {
  const $ = id => document.getElementById(id);
  async function enhance() {
    const sheet = $('reportSheet'); if (!sheet) return;
    let report = null; try { report = JSON.parse(sheet.dataset.report || '{}'); } catch {}
    const findings = Array.isArray(report?.findings) ? report.findings : [];
    try {
      const r = await fetch('/api/risk', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ findings, observations: report?.observations || {} }) });
      if (!r.ok) return;
      const risk = await r.json();
      let panel = $('reportRiskV2');
      if (!panel) { panel=document.createElement('section'); panel.id='reportRiskV2'; panel.className='report-section report-risk-v2'; const anchor=$('reportFindings'); anchor?.parentNode.insertBefore(panel, anchor); }
      panel.replaceChildren();
      const head=document.createElement('div'); head.className='report-risk-v2-head';
      const title=document.createElement('div'); const h=document.createElement('h3'); h.textContent='Risk Assessment'; const p=document.createElement('p'); p.textContent='Calculated from current finding severity, confidence, lifecycle, and collected observations.'; title.append(h,p);
      const score=document.createElement('strong'); score.textContent=`${risk.score}/100 · ${risk.rating}`; head.append(title,score); panel.appendChild(head);
      const counts={open:0,'in-progress':0,resolved:0}; findings.forEach(f=>{ if(counts[f.status]!==undefined) counts[f.status]++; });
      const grid=document.createElement('div'); grid.className='report-risk-grid';
      [['ACTIVE',findings.filter(f=>f.status!=='resolved').length],['CRITICAL',findings.filter(f=>f.severity==='critical'&&f.status!=='resolved').length],['HIGH',findings.filter(f=>f.severity==='high'&&f.status!=='resolved').length],['RESOLVED',counts.resolved]].forEach(([label,value])=>{const card=document.createElement('div'); const small=document.createElement('small');small.textContent=label;const b=document.createElement('b');b.textContent=value;card.append(small,b);grid.appendChild(card)});
      panel.appendChild(grid);
      const recs=Array.isArray(risk.recommendations)?risk.recommendations:[];
      if(recs.length){const h3=document.createElement('h3');h3.textContent='Prioritized remediation';panel.appendChild(h3);const ol=document.createElement('ol');ol.className='report-remediation';recs.slice(0,6).forEach(x=>{const li=document.createElement('li');li.textContent=String(x);ol.appendChild(li)});panel.appendChild(ol)}
      report.riskScore=risk.score; report.riskRating=risk.rating; report.riskBreakdown=risk.breakdown||{}; report.riskRecommendations=recs; sheet.dataset.report=JSON.stringify(report);
    } catch {}
  }
  function init(){const b=$('generateReportButton');if(b)b.addEventListener('click',()=>setTimeout(enhance,700));document.addEventListener('web404:findings-updated',()=>setTimeout(enhance,300));if($('reportSheet')?.dataset.report)setTimeout(enhance,300)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
