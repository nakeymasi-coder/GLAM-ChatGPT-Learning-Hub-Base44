(function (root) {
  'use strict';
  var APP_ID = '6a9aedd33cd938f0f47b9ff7';
  var LABELS = {
    glamHubCompleted:'Lesson progress', glamFinalAssessment:'Assessment result',
    glamCertificateName:'Certificate name', glamPlaybook:'Saved prompts',
    glamPlaybookNotes:'Playbook notes', glamConciergeProject:'Unfinished project',
    glamSavedProjects:'Saved-project cache', glamActiveWorkflow:'Active workflow',
    glamResearchSession:'Research notes', glamResearchLastPrompt:'Last research prompt',
    glamAICoachUsage:'Coach usage on this browser', glamHubTutorialSeen:'Tutorial preference',
    glamAnnounceDismissed:'Announcement preference'
  };
  var PORTABLE = Object.keys(LABELS).filter(function (key) {
    return ['glamSavedProjects','glamAICoachUsage','glamHubTutorialSeen','glamAnnounceDismissed'].indexOf(key) < 0;
  });
  var MAX_BYTES = 2000000;
  function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function safeData(data, allowed) {
    if (!plain(data)) throw new Error('The backup does not contain valid saved data.');
    var result = Object.create(null);
    Object.keys(data).forEach(function (key) {
      if (allowed.indexOf(key) < 0 || typeof data[key] !== 'string') throw new Error('The backup contains an unsupported save.');
      if (data[key].length > MAX_BYTES) throw new Error('This backup is too large.');
      result[key] = data[key];
    });
    return result;
  }
  function validateValue(key, raw) {
    if (['glamCertificateName','glamPlaybookNotes'].indexOf(key) >= 0) return;
    var value;
    try { value = JSON.parse(raw); } catch (_) { throw new Error('Invalid saved data for ' + LABELS[key] + '.'); }
    if (key === 'glamHubCompleted' && (!Array.isArray(value) || value.some(function (id) { return typeof id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(id); }))) throw new Error('Invalid lesson progress.');
    if (key === 'glamPlaybook' && (!Array.isArray(value) || value.some(function (item) { return !plain(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.content !== 'string'; }))) throw new Error('Invalid saved prompts.');
    if (['glamFinalAssessment','glamConciergeProject','glamActiveWorkflow','glamResearchSession','glamResearchLastPrompt'].indexOf(key) >= 0 && !plain(value)) throw new Error('Invalid saved data for ' + LABELS[key] + '.');
    if (key === 'glamFinalAssessment' && (typeof value.score !== 'number' || value.score < 0 || value.score > 100 || typeof value.correct !== 'number' || value.correct < 0 || value.correct > 10)) throw new Error('Invalid assessment result.');
  }
  function createStore(storage, options) {
    options = options || {};
    var userId = null, token = null, invalid = false;
    var tokenReader = options.tokenReader || function () { return null; };
    var onInvalid = options.onInvalid || function () {};
    function ensure() {
      if (!userId || invalid) throw new Error('Your account must be verified before Hub saves can open.');
      if (tokenReader() !== token) {
        invalid = true; onInvalid();
        throw new Error('Your account changed. Reload the Hub before saving.');
      }
    }
    function key() { ensure(); return 'glamHub:v2:' + APP_ID + ':' + encodeURIComponent(userId); }
    function documentData() {
      var raw = storage.getItem(key());
      if (raw === null) return Object.create(null);
      var doc;
      try { doc = JSON.parse(raw); } catch (_) { throw new Error('Your account saves could not be read. They have been preserved.'); }
      if (!doc || doc.version !== 2 || doc.ownerId !== userId || doc.appId !== APP_ID) throw new Error('Your account saves could not be verified. They have been preserved.');
      return safeData(doc.data, Object.keys(LABELS));
    }
    function write(data) {
      var text = JSON.stringify({version:2,appId:APP_ID,ownerId:userId,data:data});
      if (text.length > MAX_BYTES) throw new Error('These Hub saves are too large for this browser. Export a backup before making changes.');
      storage.setItem(key(), text);
    }
    function allowed(name) { if (!Object.prototype.hasOwnProperty.call(LABELS,name)) throw new Error('Unsupported Hub storage key.'); }
    function readBackup(raw) {
      ensure();
      if (typeof raw !== 'string' || raw.length > MAX_BYTES) throw new Error('Choose a Hub backup smaller than 2 MB.');
      var backup;
      try { backup = JSON.parse(raw); } catch (_) { throw new Error('This is not a readable Hub backup.'); }
      if (backup?.format !== 'glam-hub-account-backup' || backup.version !== 1 || backup.appId !== APP_ID) throw new Error('This file is not an account-identified Learning Hub backup.');
      if (backup.ownerId !== userId) throw new Error('This backup names a different account. Sign in to its account to import it.');
      var data = safeData(backup.data,PORTABLE);
      Object.keys(data).forEach(function (name) { validateValue(name,data[name]); });
      return {data:data,sourceOrigin:typeof backup.sourceOrigin==='string'?backup.sourceOrigin:'Unknown origin'};
    }
    return {
      activate:function (id, sessionToken) {
        if (typeof id !== 'string' || !id || typeof sessionToken !== 'string' || !sessionToken) throw new Error('Sign in before opening the Hub.');
        if (userId && userId !== id) { invalid = true; throw new Error('Reload the Hub to change accounts.'); }
        userId=id;token=sessionToken;invalid=false;ensure();documentData();
      },
      assertCurrent:ensure,
      invalidate:function () { invalid=true; },
      getItem:function (name) { allowed(name); var data=documentData();return Object.prototype.hasOwnProperty.call(data,name)?data[name]:null; },
      setItem:function (name,value) { allowed(name);var data=documentData();data[name]=String(value);write(data); },
      removeItem:function (name) { allowed(name);var data=documentData();delete data[name];write(data); },
      hasLegacy:function () { ensure();return Object.keys(LABELS).some(function (name) { return storage.getItem(name)!==null; }); },
      exportBackup:function (origin) {
        var data=documentData(),portable=Object.create(null);
        PORTABLE.forEach(function (name) { if (Object.prototype.hasOwnProperty.call(data,name)) portable[name]=data[name]; });
        return JSON.stringify({format:'glam-hub-account-backup',version:1,appId:APP_ID,ownerId:userId,sourceOrigin:origin,exportedAt:new Date().toISOString(),data:portable},null,2);
      },
      previewImport:function (raw) {
        var backup=readBackup(raw),current=documentData();
        return {sourceOrigin:backup.sourceOrigin,items:Object.keys(backup.data).map(function (name) {
          var exists=Object.prototype.hasOwnProperty.call(current,name);
          return {key:name,label:LABELS[name],status:!exists?'copy':current[name]===backup.data[name]?'same':'keep-current'};
        })};
      },
      importBackup:function (raw, confirmed) {
        ensure();if (confirmed!==true) throw new Error('Confirm that this backup is yours before importing.');
        var backup=readBackup(raw),current=documentData(),copied=[],skipped=[];
        Object.keys(backup.data).forEach(function (name) {
          if (Object.prototype.hasOwnProperty.call(current,name)) skipped.push(name);
          else { current[name]=backup.data[name];copied.push(name); }
        });
        if (copied.length) write(current);
        return {copied:copied,skipped:skipped};
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports={createStore:createStore,labels:LABELS,portable:PORTABLE,appId:APP_ID};return; }
  function readToken() { return root.localStorage.getItem('base44_access_token') || root.localStorage.getItem('token'); }
  var frozen = false;
  function freeze() {
    if (frozen) return;
    frozen = true;
    root.document.documentElement.style.visibility='hidden';
    root.location.reload();
  }
  var store=createStore(root.localStorage,{tokenReader:readToken,onInvalid:freeze});
  store.boot=async function () {
    if (root.document.readyState==='loading') await new Promise(function (resolve) { root.document.addEventListener('DOMContentLoaded',resolve,{once:true}); });
    store.assertCurrent();
    var scripts=Array.from(root.document.querySelectorAll('script[data-hub-deferred]'));
    for (var original of scripts) {
      store.assertCurrent();
      var script=root.document.createElement('script');
      if (original.src) {
        script.src=original.src;script.async=false;
        await new Promise(function (resolve,reject) {script.onload=resolve;script.onerror=function () {reject(new Error('A Hub component could not load. Please reload.'));};root.document.body.appendChild(script);});
      } else {
        var scriptError=null;
        var capture=function (event) {scriptError=event.error || new Error('A Hub component could not start.');};
        root.addEventListener('error',capture);
        try {script.textContent=original.textContent;root.document.body.appendChild(script);} finally {root.removeEventListener('error',capture);}
        if (scriptError) throw scriptError;
      }
    }
    store.assertCurrent();
  };
  store.showStartupError=function (error) {
    var area=root.document.createElement('main');
    area.style.cssText='max-width:600px;margin:15vh auto;padding:24px;font-family:system-ui';
    var title=root.document.createElement('h1');title.textContent='Your saved work is safe';
    var detail=root.document.createElement('p');detail.textContent=error?.message || 'The Hub could not open. Please reload and try again.';
    var note=root.document.createElement('p');note.textContent='No older browser saves have been imported or erased.';
    var retry=root.document.createElement('button');retry.textContent='Reload the Hub';retry.onclick=function () {root.location.reload();};
    area.append(title,detail,note,retry);root.document.body.replaceChildren(area);root.document.documentElement.style.visibility='visible';
  };
  store.mountBackupControls=function (user) {
    var container=root.document.getElementById('hubAccountBackups');
    if (!container) return;
    container.innerHTML='<summary>Browser saves and backups</summary><div class="help" style="padding-top:12px"><p id="hubAccountSaveNote"></p><p>Your lesson progress, prompt notes and unfinished work are now saved separately for your account on this browser. Server-saved projects and chat history continue to use your account.</p><p id="hubLegacyNote" hidden>Older browser saves are preserved, but their owner cannot be verified. They have not been shown or assigned to this account. Contact support if you need help recovering your own older work.</p><p>A different website address has separate browser storage. To move account-identified saves, export on the original address, then import here while signed in to the same account.</p><button type="button" class="btn" id="hubExportBackup">Export my browser saves</button><label style="display:block;margin-top:12px">Import my account backup <input id="hubImportBackupFile" type="file" accept="application/json,.json"></label><p id="hubImportStatus" role="status"></p><ul id="hubImportPreview"></ul><label id="hubImportConsent" hidden style="display:block"><input type="checkbox" id="hubImportConfirm"> This is my own backup, and I want to copy its missing saves into this account. Keep all current saves.</label><div style="margin-top:10px"><button type="button" class="btn primary" id="hubImportApply" disabled>Import missing saves</button> <button type="button" class="btn" id="hubImportCancel" hidden>Cancel import</button></div><p>Imports never overwrite existing categories. Keep the original file if you need to combine different versions by hand. A matching account label is not proof that a file belongs to you; import only your own backup.</p></div>';
    root.document.getElementById('hubAccountSaveNote').textContent='Signed in as '+(user.email||user.full_name||'your verified account');
    root.document.getElementById('hubLegacyNote').hidden=!store.hasLegacy();
    var pending=null,reading=0;
    var status=root.document.getElementById('hubImportStatus'),preview=root.document.getElementById('hubImportPreview'),consent=root.document.getElementById('hubImportConsent'),confirm=root.document.getElementById('hubImportConfirm'),apply=root.document.getElementById('hubImportApply'),fileInput=root.document.getElementById('hubImportBackupFile'),cancel=root.document.getElementById('hubImportCancel');
    function reset() {pending=null;reading++;preview.replaceChildren();consent.hidden=true;confirm.checked=false;apply.disabled=true;cancel.hidden=true;fileInput.value='';}
    root.document.getElementById('hubExportBackup').onclick=function () {
      try {var blob=new Blob([store.exportBackup(root.location.origin)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=root.document.createElement('a');a.href=url;a.download='learning-hub-account-backup.json';a.click();setTimeout(function () {URL.revokeObjectURL(url);},1000);status.textContent='Account backup exported. Keep it private; it may contain your prompts and notes.';} catch (error) {status.textContent=error.message;}
    };
    fileInput.onchange=async function () {
      var file=fileInput.files?.[0];reset();if (!file) return;
      var operation=reading;
      try {
        if (file.size>MAX_BYTES) throw new Error('Choose a Hub backup smaller than 2 MB.');
        var raw=await file.text();if (operation!==reading) return;
        var plan=store.previewImport(raw);pending=raw;cancel.hidden=false;
        plan.items.forEach(function (item) {var li=root.document.createElement('li');li.textContent=item.label+': '+(item.status==='copy'?'copy into this account':item.status==='same'?'already matches; leave unchanged':'different version; keep current');preview.appendChild(li);});
        var count=plan.items.filter(function (item) {return item.status==='copy';}).length;
        status.textContent=count?'Ready to copy '+count+' missing save categories. Review and confirm below.':'No missing categories to import. Current saves will stay unchanged.';
        consent.hidden=!count;
      } catch (error) {pending=null;status.textContent=error.message;}
    };
    confirm.onchange=function () {apply.disabled=!pending||!confirm.checked;};
    cancel.onclick=function () {reset();status.textContent='Import canceled. Nothing changed.';};
    apply.onclick=function () {
      try {
        apply.disabled=true;var result=store.importBackup(pending,confirm.checked);reset();
        status.textContent='Copied '+result.copied.length+' missing save categories; kept '+result.skipped.length+' existing categories. Reload the Hub to use the imported saves.';
        var reload=root.document.createElement('button');reload.type='button';reload.className='btn';reload.textContent='Reload imported saves';reload.onclick=function () {root.location.reload();};preview.appendChild(reload);
      } catch (error) {status.textContent=error.message;apply.disabled=!pending||!confirm.checked;}
    };
  };
  root.addEventListener('storage',function (event) {if (event.key===null||event.key==='base44_access_token'||event.key==='token') {try {store.assertCurrent();}catch (_) {freeze();}}});
  ['focus','pageshow'].forEach(function (event) {root.addEventListener(event,function () {if (!store.isStarted)return;try {store.assertCurrent();}catch (_) {freeze();}});});
  root.HubStorage=store;
})(typeof globalThis!=='undefined'?globalThis:this);
