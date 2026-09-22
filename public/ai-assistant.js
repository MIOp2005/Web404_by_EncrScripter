(()=>{
  'use strict';

  const button=document.getElementById('aiButton');
  const input=document.getElementById('chatInput');
  const log=document.getElementById('chatLog');
  if(!button||!input||!log)return;

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const addBubble=(type,text)=>{
    const node=document.createElement('div');
    node.className=`bubble ${type}`;
    if(type==='bot')node.innerHTML=`<b>Web404 AI</b><br>${escapeHtml(text).replace(/\n/g,'<br>')}`;
    else node.textContent=text;
    log.appendChild(node);
    log.scrollTop=log.scrollHeight;
  };

  const resultText=id=>{
    const el=document.getElementById(id);
    return el?.innerText?.trim()||'';
  };

  const inputValue=id=>{
    const el=document.getElementById(id);
    return el?.value?.trim()||'';
  };

  const collectContext=async()=>{
    let findings=[];
    try{
      const response=await fetch('/api/findings');
      if(response.ok){
        const data=await response.json();
        findings=Array.isArray(data.findings)?data.findings:[];
      }
    }catch{}

    return {
      findings,
      modules:{
        ip:resultText('ipResult'),
        domain:resultText('dnsResult'),
        url:resultText('urlIntelResult'),
        username:resultText('userResult'),
        metadata:resultText('metadataResult')
      },
      inputs:{
        ip:inputValue('ipInput'),
        domain:inputValue('domainInput'),
        url:inputValue('urlIntelInput'),
        username:inputValue('userInput')
      }
    };
  };

  let previousInteractionId='';

  const send=async()=>{
    const message=input.value.trim();
    if(!message||button.disabled)return;

    addBubble('user',message);
    input.value='';
    button.disabled=true;
    const original=button.textContent;
    button.textContent='Thinking…';

    try{
      const context=await collectContext();
      const response=await fetch('/api/ai-assistant',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({message,context,previousInteractionId})
      });

      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`AI request failed (${response.status})`);

      previousInteractionId=data.interactionId||'';
      addBubble('bot',data.text||'Gemini returned no text response.');
    }catch(error){
      addBubble('bot',error.message||'AI request failed.');
    }finally{
      button.disabled=false;
      button.textContent=original;
      input.focus();
    }
  };

  const freshButton=button.cloneNode(true);
  button.replaceWith(freshButton);
  freshButton.addEventListener('click',event=>{event.preventDefault();send()});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey){
      event.preventDefault();
      freshButton.click();
    }
  });
})();