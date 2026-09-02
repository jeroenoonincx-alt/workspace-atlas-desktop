(function(){
  'use strict';
  var invoke=window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke;
  if(typeof invoke!=='function') return;
  function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function assert(ok,msg){if(!ok)throw new Error(msg)}
  function text(sel){var e=document.querySelector(sel);return e?e.textContent:''}
  function click(sel){var e=document.querySelector(sel);assert(e,'Ontbreekt: '+sel);e.click();return e}
  function input(id,value){var e=document.getElementById(id);assert(e,'Ontbreekt: #'+id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));return e}
  async function run(){
    var active=await invoke('smoke_mode');
    if(!active)return;
    var checks=[];
    function ok(name,condition){assert(condition,name+' mislukt');checks.push(name)}
    try{
      await wait(900);
      ok('klok',!!text('#time').trim()&&text('#time').trim()!=='--:--');
      ok('modal-start-verborgen',document.getElementById('modal-back').hidden===true);
      ok('navigatie',document.querySelectorAll('.navbtn').length===6);
      ok('werk-tegels',document.querySelectorAll('#apps .app').length>=3);
      ok('tauri-brug',typeof window.atlasLaunchTarget==='function'&&typeof window.atlasChooseExe==='function');

      click('#add-app');
      await wait(80);
      ok('tegel-modal-opent',document.getElementById('modal-back').hidden===false);
      var name=document.querySelector('#modal-fields [name="name"]');
      var url=document.querySelector('#modal-fields [name="url"]');
      var exe=document.querySelector('#modal-fields [name="exePath"]');
      assert(name&&url&&exe,'Tegelvelden ontbreken');
      name.value='Atlas rooktest';url.value='https://example.com/';
      ok('exe-kiesknop',Array.from(exe.parentElement.querySelectorAll('button')).some(function(b){return b.textContent.indexOf('Kies .exe')>=0}));
      document.getElementById('modal-form').requestSubmit();
      await wait(80);
      ok('tegel-toevoegen',text('#apps').indexOf('Atlas rooktest')>=0);

      var spaces=Array.from(document.querySelectorAll('.spacebtn'));
      var prive=spaces.find(function(b){return b.textContent.indexOf('Priv')>=0});
      var werk=spaces.find(function(b){return b.textContent.indexOf('Werk')>=0});
      assert(prive&&werk,'Werk/Privé omgevingen ontbreken');
      prive.click();await wait(80);
      ok('prive-gescheiden',text('#apps').indexOf('Atlas rooktest')<0);
      werk=Array.from(document.querySelectorAll('.spacebtn')).find(function(b){return b.textContent.indexOf('Werk')>=0});
      werk.click();await wait(80);
      ok('werk-bewaart-tegel',text('#apps').indexOf('Atlas rooktest')>=0);

      click('.navbtn[data-view="tasks"]');await wait(50);
      input('task-input','Atlas rooktest taak');document.getElementById('task-form').requestSubmit();await wait(50);
      ok('taak-toevoegen',text('#tasks').indexOf('Atlas rooktest taak')>=0);
      input('note','Atlas rooktest notitie');await wait(30);
      ok('notitie',document.getElementById('note').value==='Atlas rooktest notitie');

      click('.navbtn[data-view="inbox"]');await wait(50);
      input('inbox-title','Atlas rooktest URL');input('inbox-url','https://example.org/');document.getElementById('inbox-form').requestSubmit();await wait(50);
      ok('url-inbox',text('#inbox').indexOf('Atlas rooktest URL')>=0);

      click('.navbtn[data-view="collections"]');await wait(50);
      ok('activiteiten',document.querySelectorAll('#collection-list .collection-item').length>=1);
      var cb=document.querySelector('#activity-checklist .checkitem input[type="checkbox"]');
      if(cb){var before=cb.checked;cb.click();await wait(30);var cb2=document.querySelector('#activity-checklist .checkitem input[type="checkbox"]');ok('checklist',!!cb2&&cb2.checked!==before)}
      else{checks.push('checklist-geen-standaardstappen')}

      ok('lokale-opslag',localStorage.length>0);
      var rejected=false;
      try{await window.atlasLaunchTarget('','','')}catch(e){rejected=String(e).indexOf('Geen geldige startoptie')>=0}
      ok('native-ipc',rejected);
      await invoke('smoke_report',{payload:JSON.stringify({ok:true,checks:checks,version:'0.8.2'})});
    }catch(e){
      try{await invoke('smoke_report',{payload:JSON.stringify({ok:false,checks:checks,error:String(e&&e.message||e),version:'0.8.2'})})}catch(_){}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}());
