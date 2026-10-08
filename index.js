/* Ashen Bridge Quick Console extension v3.1.0
 * Original implementation; ST-XiaoBingKuai reviewed as architectural reference.
 * Tavern Helper declaration baseline: 4.8.19 / 36d8889a99f1cf09d3d1f8aabd0eba33975dc64d.
 * Only Preset.prompts[].enabled is modified. No remote runtime imports.
 */
(async function () {
  'use strict';
  const KEY = '$ashenBridgeConsoleV3';
  const ALIASES = {enhance_definitions:'enhanceDefinitions',world_info_before:'worldInfoBefore',persona_description:'personaDescription',char_description:'charDescription',char_personality:'charPersonality',world_info_after:'worldInfoAfter',dialogue_examples:'dialogueExamples',chat_history:'chatHistory'};
  const clone = x => JSON.parse(JSON.stringify(x));
  const alias = id => ALIASES[id] || id;
  function model(preset) {
    const meta = preset.extensions?.baibaiToolkit?.presetPromptGroups;
    if (!meta || !Array.isArray(meta.groups) || !meta.prompts || typeof meta.prompts !== 'object') throw Error('当前预设缺少百百分组数据；请选择灰烬之桥预设。');
    if (!Array.isArray(preset.prompts) || preset.prompts.some(p => typeof p.id !== 'string' || typeof p.enabled !== 'boolean')) throw Error('预设接口格式不匹配，请检查酒馆助手版本。');
    const ids = preset.prompts.map(p=>p.id);
    if (new Set(ids).size !== ids.length) throw Error('预设存在重复条目 ID，已停止操作。');
    const memberships = new Map(Object.entries(meta.prompts).map(([id,v])=>[alias(id),v?.groupId]));
    const groups = meta.groups.map((g,i)=>({id:g.id,name:String(g.name||'未命名分组'),order:Number.isFinite(g.order)?g.order:i,collapsed:g.collapsed===true,items:[]})).sort((a,b)=>a.order-b.order);
    if (groups.some(g=>typeof g.id!=='string') || new Set(groups.map(g=>g.id)).size!==groups.length) throw Error('分组 ID 无效或重复。');
    const byGroup = new Map(groups.map(g=>[g.id,g]));
    const other = {id:'__ungrouped__',name:'未分组',items:[],collapsed:true};
    for (const p of preset.prompts) (byGroup.get(memberships.get(p.id))||other).items.push({id:p.id,name:String(p.name||p.id),enabled:p.enabled});
    if(other.items.length) groups.push(other);
    return {groups,items:groups.flatMap(g=>g.items),identity:JSON.stringify(ids.slice().sort())};
  }
  function patch(preset, states, expectedIdentity) {
    const m=model(preset);
    if(m.identity!==expectedIdentity) throw Error('预设条目已发生变化，请刷新后重新操作。');
    const available=new Set(m.items.map(p=>p.id));
    for(const [id,value] of Object.entries(states)) if(!available.has(id)||typeof value!=='boolean') throw Error('模式含失效条目，已取消整个操作：'+id);
    for(const p of preset.prompts) if(Object.hasOwn(states,p.id)) p.enabled=states[p.id];
    return preset;
  }
  function snapshot(m, groupIds) {
    const selected=new Set(groupIds);
    const states=Object.fromEntries(m.groups.filter(g=>selected.has(g.id)).flatMap(g=>g.items.map(p=>[p.id,p.enabled])));
    if(!Object.keys(states).length) throw Error('请选择至少一个有条目的分组。');
    return states;
  }
  function validateConfig(input) {
    if(!input||input.version!==3||typeof input.preset!=='string'||!Array.isArray(input.slots)||input.slots.length>100) throw Error('不是有效的 v3 模式配置（最多 100 个槽）。');
    const seen=new Set();
    const slots=input.slots.map(s=>{
      if(!s||typeof s.id!=='string'||s.id.length>100||seen.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>80||!Array.isArray(s.groups)||s.groups.some(g=>typeof g!=='string')||!s.states||Array.isArray(s.states)||typeof s.states!=='object'||Object.keys(s.states).length>2000||!Object.keys(s.states).length) throw Error('模式槽格式无效。');
      seen.add(s.id);
      const states=Object.fromEntries(Object.entries(s.states).map(([id,b])=>{
        if(['__proto__','constructor','prototype'].includes(id)||id.length>200||typeof b!=='boolean') throw Error('模式开关格式无效。');
        return [id,b];
      }));
      return {id:s.id,name:s.name.trim(),groups:[...new Set(s.groups)],states};
    });
    return {version:3,preset:input.preset,revision:Number.isSafeInteger(input.revision)?input.revision:0,slots};
  }
  // Runs in the top-level SillyTavern extension module, never a script iframe.
  const hostDoc=document;
  const helperCall=(name,args)=>{
    const fn=window.TavernHelper?.[name];
    if(typeof fn!=='function')throw Error('酒馆助手预设接口尚不可用：'+name+'。请启用／更新酒馆助手后刷新网页。');
    return fn(...args);
  };
  const getPreset=(...args)=>helperCall('getPreset',args);
  const updatePresetWith=(...args)=>helperCall('updatePresetWith',args);
  const getLoadedPresetName=(...args)=>helperCall('getLoadedPresetName',args);
  const getVariables=(...args)=>helperCall('getVariables',args);
  const updateVariablesWith=(...args)=>helperCall('updateVariablesWith',args);
  const api={
    get:typeof getPreset==='function'?getPreset:null,
    update:typeof updatePresetWith==='function'?updatePresetWith:null,
    name:typeof getLoadedPresetName==='function'?getLoadedPresetName:null,
    vars:typeof getVariables==='function'?getVariables:null,
    updateVars:typeof updateVariablesWith==='function'?updateVariablesWith:null
  };
  const host=hostDoc.defaultView;
  const ROOT='ashen-bridge-console-v3';
  host[ROOT]?.dispose?.();
  hostDoc.getElementById(ROOT)?.remove();
  const root=hostDoc.createElement('div');root.id=ROOT;
  // Host mobile styles must not hide or reposition the outer mount.
  for(const[k,v]of Object.entries({display:'block',position:'fixed',inset:'0',width:'auto',height:'auto',visibility:'visible',opacity:'1','pointer-events':'none','z-index':'2147483647',transform:'none'}))root.style.setProperty(k,v,'important');
  hostDoc.body.appendChild(root);
  const shadow=root.attachShadow({mode:'open'});
  const el=(tag,text,attrs={})=>{const n=hostDoc.createElement(tag);if(text!=null)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  const style=el('style',`
    :host{position:fixed;inset:0;pointer-events:none;z-index:2147483600;font-family:system-ui,"Microsoft YaHei",sans-serif;color:var(--SmartThemeBodyColor,#f4eeee)}
    *{box-sizing:border-box} [hidden]{display:none!important}
    button,input{font:inherit}button{color:inherit;background:var(--SmartThemeBlurTintColor,#292128);border:1px solid var(--SmartThemeBorderColor,#715462);border-radius:8px;min-height:44px;padding:8px 12px;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
    button:hover{filter:brightness(1.2)}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #e5a0ad;outline-offset:2px}
    .orb{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:48px;height:48px;padding:0;font-size:30px;pointer-events:auto;touch-action:none;border-radius:50%;box-shadow:0 4px 18px #0005}
    .panel{position:fixed;right:12px;bottom:calc(144px + env(safe-area-inset-bottom,0px));width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 170px);max-height:calc(100dvh - 170px);display:flex;flex-direction:column;pointer-events:auto;background:var(--SmartThemeBlurTintColor,#211b21);border:1px solid var(--SmartThemeBorderColor,#715462);border-radius:14px;box-shadow:0 12px 45px #0008;overflow:hidden}
    header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #8884;flex:none}header strong{flex:1;min-width:0;font-size:15px}
    .body{overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:0;padding:10px;touch-action:pan-y}
    .tools,.slot,.batch{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.slot{padding:6px 0;border-bottom:1px solid #8883;align-items:center}.slot .apply{flex:1;min-width:120px;text-align:left}
    .slot button{min-width:44px}.active{border-color:#f19ba9;background:#633340}.hint{font-size:12px;line-height:1.5;opacity:.85;overflow-wrap:anywhere;margin:8px 0}
    input[type=search],input[type=text]{width:100%;min-width:0;font-size:16px;padding:10px;color:inherit;background:#8881;border:1px solid #8886;border-radius:8px;min-height:44px}
    label{display:block;line-height:1.5}.pick{display:flex;align-items:center;gap:10px;min-height:44px;overflow-wrap:anywhere}input[type=checkbox]{width:22px;height:22px;accent-color:#ba5166;flex:none}
    details{border-top:1px solid #8884;margin-top:8px}summary{padding:12px 4px;font-weight:600;cursor:pointer;min-height:44px;overflow-wrap:anywhere}
    .entry{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;text-align:left;margin:5px 0}.entry span{min-width:0;overflow-wrap:anywhere}.entry b{font-size:12px;flex:none;color:#cfbcc1}.entry[aria-pressed=true]{border-color:#c76f81}.entry[aria-pressed=true] b{color:#ffb4c3}
    .status{padding:8px 12px;border-top:1px solid #8884;font-size:12px;line-height:1.5;flex:none;overflow-wrap:anywhere;max-height:90px;overflow:auto}.error{color:#ffb4b4}
    @media(max-width:768px){.panel{left:12px;right:12px;width:auto;bottom:calc(76px + env(safe-area-inset-bottom,0px));max-height:calc(100dvh - 100px - env(safe-area-inset-top,0px));max-height:min(700px,calc(100dvh - 100px - env(safe-area-inset-top,0px)))}.orb{bottom:calc(16px + env(safe-area-inset-bottom,0px))}}
    @media(max-height:420px){.panel{top:8px;bottom:64px;max-height:calc(100dvh - 72px)}}
  `);shadow.append(style);
  const orb=el('button','🩸',{class:'orb','aria-label':'打开灰烬之桥控制台','aria-expanded':false});shadow.append(orb);
  const panel=el('section',null,{class:'panel',role:'dialog','aria-label':'灰烬之桥预设快捷控制台'});panel.hidden=true;shadow.append(panel);
  const head=el('header');head.append(el('strong','🩸 灰烬之桥 · 插件 3.1'));
  const refresh=el('button','⟳',{'aria-label':'刷新预设与模式槽'}),close=el('button','✕',{'aria-label':'关闭控制台'});head.append(refresh,close);panel.append(head);
  const body=el('div',null,{class:'body'}),status=el('div','准备就绪',{class:'status','aria-live':'polite'});panel.append(body,status);
  let current=null,name='',config=null,busy=false,edit=null,query='',disposed=false,lastSignature='',polling=false;
  const folded=new Map();
  function message(s,error=false){status.textContent=s;status.classList.toggle('error',error);}
  function setBusy(v){busy=v;panel.setAttribute('aria-busy',String(v));shadow.querySelectorAll('button').forEach(b=>{if(b!==close&&b!==orb)b.disabled=v;});}
  async function action(fn){if(busy||disposed)return;setBusy(true);try{await fn();}catch(e){message(e.message||String(e),true);}finally{setBusy(false);}}
  function read(){
    if(!api.get||!api.update||!api.name)throw Error('缺少 getPreset / updatePresetWith / getLoadedPresetName；请使用支持预设 API 的酒馆助手。');
    const n=api.name(),p=api.get('in_use'),m=model(p);
    return {name:n,preset:p,model:m};
  }
  function ensureContext(ctx){const now=read();if(now.name!==ctx.name||now.model.identity!==ctx.model.identity)throw Error('当前预设已切换或条目改变，已取消操作。');return now;}
  async function readConfig(n){
    if(!api.vars||!api.updateVars)throw Error('酒馆助手缺少全局变量 API，模式存储不可用；普通开关仍可使用。');
    const db=await api.vars({type:'global'});
    const value=db[KEY]?.presets?.[n];
    return value?validateConfig(value):{version:3,preset:n,revision:0,slots:[]};
  }
  async function saveConfig(next,ctx){
    ensureContext(ctx);
    if(!config)throw Error('配置尚未读取成功，请刷新。');
    const expected=config.revision;
    const safe=validateConfig({...next,preset:ctx.name,revision:expected+1});
    await api.updateVars(vars=>{
      ensureContext(ctx);
      const old=vars[KEY]||{presets:{}};
      if((old.presets?.[ctx.name]?.revision||0)!==expected)throw Error('配置被其他窗口更新，请刷新后重试。');
      vars[KEY]={...old,presets:{...old.presets,[ctx.name]:safe}};return vars;
    },{type:'global'});
    config=await readConfig(ctx.name);message('模式配置已写入酒馆侧；另一设备刷新页面后读取。');
  }
  async function load(force=true){
    const ctx=read();
    if(name!==ctx.name){edit=null;query='';folded.clear();}
    name=ctx.name;current=ctx;
    if(force){try{config=await readConfig(name);message('已读取当前预设和酒馆侧模式配置。');}catch(e){config=null;message(e.message,true);}}
    lastSignature=signature(ctx);render();
  }
  const signature=ctx=>JSON.stringify([ctx.name,ctx.model.groups]);
  async function change(states,ctx=current){
    ensureContext(ctx);
    await api.update('in_use',p=>{ensureContext(ctx);return patch(p,states,ctx.model.identity);},{render:'immediate'});
    const after=ensureContext(ctx);
    for(const [id,b] of Object.entries(states))if(after.model.items.find(p=>p.id===id)?.enabled!==b)throw Error('写入后状态核验失败，请刷新检查。');
    current=after;lastSignature=signature(after);render();message('已更新 '+Object.keys(states).length+' 个条目的开关。');
  }
  function button(parent,text,fn,attrs={}){const b=el('button',text,attrs);b.disabled=busy;b.addEventListener('click',()=>action(fn));parent.append(b);return b;}
  function slotValid(s){const known=new Set(current.model.items.map(p=>p.id));return Object.keys(s.states).every(id=>known.has(id));}
  function render(){
    const scroll=body.scrollTop;body.replaceChildren();if(!current)return;
    if(edit){renderEditor();body.scrollTop=scroll;return;}
    body.append(el('div',name,{class:'hint'}));
    const tools=el('div',null,{class:'tools'});body.append(tools);
    button(tools,'＋ 新建模式',()=>{if(!config)throw Error('配置存储不可用。');edit={ctx:current,id:null};render();body.scrollTop=0;},{'data-action':'new'});
    button(tools,'导出模式',()=>{if(!config)throw Error('配置未读取。');download(JSON.stringify(config,null,2),'灰烬之桥-v3-模式配置.json');});
    const file=el('input',null,{type:'file',accept:'.json,application/json','aria-label':'导入 v3 模式配置'});file.hidden=true;body.append(file);
    button(tools,'导入模式',()=>file.click());
    file.addEventListener('change',()=>action(async()=>{
      const f=file.files?.[0];if(!f)return;if(f.size>1000000)throw Error('配置文件超过 1MB。');
      const ctx=current,imported=validateConfig(JSON.parse(await f.text()));ensureContext(ctx);
      if(imported.preset!==ctx.name)throw Error('配置属于其他名称的预设，未导入。');
      if(imported.slots.some(s=>!slotValid(s)))throw Error('导入配置含当前预设不存在的条目，未导入。');
      showConfirm('导入将替换当前预设的全部模式槽，不改变条目开关。',async()=>{await saveConfig(imported,ctx);render();});
    }));
    const modes=el('div');body.append(modes);
    if(!config?.slots.length)modes.append(el('p','先调好条目开关，再新建“日常”“NSFW”等模式。',{class:'hint'}));
    for(const [i,s]of(config?.slots||[]).entries()){
      const row=el('div',null,{class:'slot'});modes.append(row);
      const active=slotValid(s)&&Object.entries(s.states).every(([id,v])=>current.model.items.find(p=>p.id===id)?.enabled===v);
      button(row,s.name+(active?' · 当前':''),async()=>{if(!slotValid(s))throw Error('此模式有失效 ID，请编辑范围并重新保存。');await change(s.states);},{class:'apply'+(active?' active':''),'aria-pressed':active,'data-slot':s.id});
      button(row,'编辑',()=>{edit={ctx:current,id:s.id};render();body.scrollTop=0;});
      const move=async delta=>{const slots=clone(config.slots);[slots[i],slots[i+delta]]=[slots[i+delta],slots[i]];await saveConfig({...config,slots},current);render();};
      if(i>0)button(row,'↑',()=>move(-1),{'aria-label':'前移 '+s.name});
      if(i<config.slots.length-1)button(row,'↓',()=>move(1),{'aria-label':'后移 '+s.name});
      if(!slotValid(s))row.append(el('div','含失效条目，不能应用',{class:'hint error'}));
    }
    const search=el('input',null,{type:'search',placeholder:'搜索条目或分组','aria-label':'搜索条目或分组','data-action':'search'});search.value=query;body.append(search);
    const groupsArea=el('div');body.append(groupsArea);
    const expand=el('div',null,{class:'tools'});body.insertBefore(expand,groupsArea);
    button(expand,'全部展开',()=>{current.model.groups.forEach(g=>folded.set(g.id,false));drawGroups(groupsArea);});
    button(expand,'全部折叠',()=>{current.model.groups.forEach(g=>folded.set(g.id,true));drawGroups(groupsArea);});
    search.addEventListener('input',()=>{query=search.value;drawGroups(groupsArea);});
    drawGroups(groupsArea);body.scrollTop=scroll;
  }
  function drawGroups(area){
    area.replaceChildren();const q=query.trim().toLocaleLowerCase();let matches=0;
    for(const g of current.model.groups){
      const items=g.items.filter(p=>!q||g.name.toLocaleLowerCase().includes(q)||p.name.toLocaleLowerCase().includes(q));if(!items.length)continue;matches+=items.length;
      const d=el('details',null,{'data-group':g.id});d.open=q?true:!(folded.get(g.id)??g.collapsed);area.append(d);
      d.append(el('summary',g.name+' · '+g.items.filter(p=>p.enabled).length+'/'+g.items.length));
      d.addEventListener('toggle',()=>{if(!q)folded.set(g.id,!d.open);});
      const batch=el('div',null,{class:'batch'});d.append(batch);
      const set=async value=>{const ctx=current;const states=Object.fromEntries(items.map(p=>[p.id,value]));showConfirm((q?'搜索匹配':'分组')+' '+items.length+' 条，全部'+(value?'开启':'关闭')+'？',()=>change(states,ctx));};
      button(batch,q?'匹配项全开':'分组全开',()=>set(true));button(batch,q?'匹配项全关':'分组全关',()=>set(false));
      for(const p of items){const b=button(d,null,()=>change({[p.id]:!p.enabled}),{class:'entry','aria-pressed':p.enabled,'data-id':p.id});b.append(el('span',p.name),el('b',p.enabled?'ON':'OFF'));}
    }
    if(!matches)area.append(el('p','没有匹配条目。',{class:'hint'}));
  }
  function renderEditor(){
    const ctx=edit.ctx;ensureContext(ctx);
    const old=config.slots.find(s=>s.id===edit.id);
    body.append(el('h3',old?'编辑模式':'新建模式'));
    const label=el('label','模式名称'),input=el('input',null,{type:'text',maxlength:80,'aria-label':'模式名称'});input.value=old?.name||'';label.append(input);body.append(label);
    body.append(el('p','选择控制范围。保存时记录这些分组现在的 ON/OFF；应用时只恢复记录的条目。新加条目须重新保存才能纳入。',{class:'hint'}));
    const picks=[];
    for(const g of ctx.model.groups){if(!g.items.length)continue;const l=el('label',null,{class:'pick'}),c=el('input',null,{type:'checkbox',value:g.id});c.checked=old?.groups.includes(g.id)||false;picks.push(c);l.append(c,el('span',g.name+' ('+g.items.length+')'));body.append(l);}
    if(old)body.append(el('p','“仅改名称”保留原快照；“保存当前状态”会覆盖原快照。',{class:'hint'}));
    const actions=el('div',null,{class:'tools'});body.append(actions);
    const save=async capture=>{
      const now=ensureContext(ctx),n=input.value.trim();if(!n)throw Error('请填写模式名称。');
      const groups=picks.filter(c=>c.checked).map(c=>c.value);
      const slot=capture?{id:old?.id||(typeof host.crypto.randomUUID==='function'?host.crypto.randomUUID():'slot-'+Array.from(host.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-')),name:n,groups,states:snapshot(now.model,groups)}:{...old,name:n};
      const slots=clone(config.slots),i=slots.findIndex(s=>s.id===slot.id);if(i<0)slots.push(slot);else slots[i]=slot;
      await saveConfig({...config,slots},ctx);edit=null;render();
    };
    button(actions,'保存当前状态',()=>save(true));if(old)button(actions,'仅改名称',()=>save(false));
    button(actions,'取消',()=>{edit=null;render();});
    if(old)button(actions,'删除模式',()=>showConfirm('删除“'+old.name+'”？',async()=>{await saveConfig({...config,slots:config.slots.filter(s=>s.id!==old.id)},ctx);edit=null;render();}));
  }
  function showConfirm(text,yes){
    body.replaceChildren(el('p',text));const t=el('div',null,{class:'tools'});body.append(t);
    button(t,'确认',async()=>{await yes();render();});button(t,'取消',()=>render());
  }
  function download(text,filename){
    const url=host.URL.createObjectURL(new host.Blob([text],{type:'application/json;charset=utf-8'}));
    const a=el('a',null,{href:url,download:filename});shadow.append(a);a.click();a.remove();host.setTimeout(()=>host.URL.revokeObjectURL(url),1000);
  }
  function closePanel(){panel.hidden=true;orb.setAttribute('aria-expanded','false');edit=null;orb.focus();}
  async function openPanel(){panel.hidden=false;orb.setAttribute('aria-expanded','true');await action(()=>load());close.focus();}
  // A second, native settings entry remains accessible if the orb is obscured.
  const settingsId='ashen-bridge-console-settings';
  hostDoc.getElementById(settingsId)?.remove();
  let settingsNode=null,settingsAttempts=0;
  function mountSettings(){
    if(disposed)return true;
    const target=hostDoc.querySelector('#extensions_settings')||hostDoc.querySelector('#extensions_settings2');
    if(!target)return false;
    settingsNode=el('div',null,{id:settingsId});
    const title=el('strong','🩸 灰烬之桥控制台');
    const open=el('button','打开控制台',{type:'button',class:'menu_button'});
    const reset=el('button','恢复血滴入口',{type:'button',class:'menu_button'});
    const hint=el('p','插件直接运行在酒馆主页面；开关与模式功能需要酒馆助手预设 API。');
    open.addEventListener('click',openPanel);
    reset.addEventListener('click',()=>{orb.style.removeProperty('left');orb.style.removeProperty('top');orb.style.removeProperty('right');orb.style.removeProperty('bottom');try{host.localStorage.removeItem(positionKey);}catch(_){};openPanel();});
    settingsNode.append(title,open,reset,hint);target.append(settingsNode);return true;
  }
  const settingsTimer=host.setInterval(()=>{if(mountSettings()||++settingsAttempts>=30)host.clearInterval(settingsTimer);},1000);

  close.addEventListener('click',closePanel);refresh.addEventListener('click',()=>action(async()=>{edit=null;await load();}));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closePanel();}if(e.key==='Tab'){const nodes=[...panel.querySelectorAll('button:not(:disabled),input:not([hidden]):not(:disabled),summary')].filter(n=>n.getClientRects().length);const i=nodes.indexOf(shadow.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&i===nodes.length-1){e.preventDefault();nodes[0]?.focus();}}});
  // Drag threshold and a single pointer-up activation avoid synthetic touch/click duplicates.
  let drag=null,suppressClick=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const positionKey=ROOT+':position:'+(host.matchMedia('(pointer:coarse)').matches?'touch':'mouse');
  function position(x,y){const v=host.visualViewport,w=v?.width||host.innerWidth,h=v?.height||host.innerHeight;orb.style.left=clamp(x,8,w-56)+'px';orb.style.top=clamp(y,8,h-56)+'px';orb.style.right='auto';orb.style.bottom='auto';}
  try{const saved=JSON.parse(host.localStorage.getItem(positionKey));if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))position(saved.x*host.innerWidth,saved.y*host.innerHeight);}catch(_){}
  orb.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=orb.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};orb.setPointerCapture(e.pointerId);});
  orb.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>8)drag.moved=true;if(drag.moved)position(drag.left+dx,drag.top+dy);});
  orb.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;suppressClick=true;e.preventDefault();if(moved){try{const r=orb.getBoundingClientRect();host.localStorage.setItem(positionKey,JSON.stringify({x:r.left/host.innerWidth,y:r.top/host.innerHeight}));}catch(_){}}else{if(panel.hidden)openPanel();else closePanel();}});
  orb.addEventListener('pointercancel',()=>{drag=null;});
  orb.addEventListener('click',e=>{if(e.detail!==0&&suppressClick){suppressClick=false;return;}if(panel.hidden)openPanel();else closePanel();});
  function resized(){if(orb.style.left){const r=orb.getBoundingClientRect();position(r.left,r.top);}}
  host.addEventListener('resize',resized);host.visualViewport?.addEventListener('resize',resized);
  const timer=host.setInterval(async()=>{
    if(disposed||panel.hidden||busy||polling)return;polling=true;
    try{const ctx=read();const sig=signature(ctx);if(sig!==lastSignature){if(edit){if(ctx.name!==name||ctx.model.identity!==current.model.identity){edit=null;await load();message('预设已切换，未保存的编辑已取消。',true);}else{current=ctx;lastSignature=sig;}}else{await load(ctx.name!==name);}}}catch(e){message(e.message,true);}finally{polling=false;}
  },1500);
  function dispose(){if(disposed)return;disposed=true;host.clearInterval(timer);host.clearInterval(settingsTimer);settingsNode?.remove();host.removeEventListener('resize',resized);host.visualViewport?.removeEventListener('resize',resized);root.remove();if(host[ROOT]?.dispose===dispose)delete host[ROOT];}
  host[ROOT]={dispose};window.addEventListener('pagehide',dispose,{once:true});window.addEventListener('unload',dispose,{once:true});
})().catch(error=>{
  console.error('[灰烬之桥插件] 启动失败',error);
  window.toastr?.error('灰烬之桥插件启动失败：'+error.message);
});

export function clean(){window["ashen-bridge-console-v3"]?.dispose?.();}
export function disable(){clean();}
