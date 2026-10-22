(function () {
  'use strict';
  const STORAGE_KEY = 'homerelay-ai-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const isoAfter = (days) => {
    const d = new Date(); d.setDate(d.getDate()+days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateDisplay = (iso, includeDay = true) => {
    if (!iso) return 'No date set';
    const [y,m,d] = iso.split('-').map(Number);
    const date = new Date(y,m-1,d);
    if (iso === todayISO()) return includeDay ? 'Today' : 'Today';
    if (iso === isoAfter(1)) return includeDay ? 'Tomorrow' : 'Tomorrow';
    return date.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
  };
  const timeDisplay = (time) => {
    if (!time) return 'Any time';
    const [h,m] = time.split(':').map(Number);
    const date = new Date(); date.setHours(h,m,0,0);
    return date.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});
  };
  const dueDisplay = (task) => {
    const d = dateDisplay(task.dueDate);
    return `${d}${task.dueTime ? ', ' + timeDisplay(task.dueTime) : ''}`;
  };
  const fmtNum = n => String(n).padStart(2,'0');
  const id = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const baseState = () => ({
    preferences: { householdName: 'The Nayaka Home', defaultOwner: 'You', quietStart: '21:30', quietEnd: '07:00', lighting: 'Warm and soft' },
    tasks: [
      {id:id(), title:'Get fresh flowers for the entryway', owner:'Ravi', category:'Shopping', dueDate:todayISO(), dueTime:'17:30', status:'Planned', source:'Added manually', note:'A small welcome for the weekend.'},
      {id:id(), title:'Prepare the guest room', owner:'You', category:'Home', dueDate:todayISO(), dueTime:'18:15', status:'Awaiting confirmation', source:'Household plan', note:'Fresh sheets, water, and a quick tidy.'},
      {id:id(), title:'Pick up milk and bread', owner:'Ravi', category:'Shopping', dueDate:todayISO(), dueTime:'18:00', status:'In progress', source:'Shopping plan', note:'Check the fridge before leaving.'},
      {id:id(), title:'Take out the recycling', owner:'Family', category:'Home', dueDate:todayISO(), dueTime:'19:00', status:'Planned', source:'Added manually', note:''},
      {id:id(), title:'Confirm weekend visit timing', owner:'You', category:'Reminder', dueDate:isoAfter(1), dueTime:'10:00', status:'Awaiting confirmation', source:'Added manually', note:'Check the group chat and confirm.'},
      {id:id(), title:'Wipe down the kitchen counters', owner:'You', category:'Home', dueDate:todayISO(), dueTime:'16:45', status:'Completed', source:'Household plan', note:'Confirmed completed in demo.'},
      {id:id(), title:'Sort the hallway shoes', owner:'Family', category:'Home', dueDate:todayISO(), dueTime:'15:30', status:'Completed', source:'Added manually', note:'Confirmed completed in demo.'},
      {id:id(), title:'Refill the hand soap', owner:'You', category:'Home', dueDate:todayISO(), dueTime:'14:45', status:'Completed', source:'Added manually', note:'Confirmed completed in demo.'}
    ],
    shopping: [
      {id:id(), name:'Milk', purchased:false, addedBy:'Household list'},
      {id:id(), name:'Wholegrain bread', purchased:false, addedBy:'Household list'},
      {id:id(), name:'Seasonal fruit', purchased:false, addedBy:'Household list'},
      {id:id(), name:'Fresh flowers', purchased:false, addedBy:'Household list'},
      {id:id(), name:'Dish soap', purchased:true, addedBy:'Household list'}
    ],
    routineLog: []
  });
  let state = loadState();
  let currentPlan = null;
  let activeView = 'overview';
  let lightingChoice = state.preferences.lighting || 'Warm and soft';
  const icons = { Home:'⌂', Shopping:'▤', Reminder:'◷', Routine:'✳' };
  const routineData = [
    {id:'guest', name:'Guest arrival', icon:'⌂', tag:'MOST USED', description:'A gentle reset before someone walks through the door.', steps:['Quick-tidy the living room','Prepare guest room essentials','Check snacks and refreshments','Set a welcome reminder']},
    {id:'quiet', name:'Quiet evening', icon:'☾', tag:'WIND DOWN', description:'Make the switch from busy day to relaxed evening.', steps:['Dim evening lights (simulated)','Set quiet hours reminder','Add tomorrow’s first priority','Show a calm-down checklist']},
    {id:'out', name:'Heading out', icon:'↗', tag:'EVERYDAY', description:'A small checklist to help everyone leave ready.', steps:['Check keys and wallet','Review the day’s errands','Add any missing shopping items','Confirm doors checklist (simulated)']}
  ];
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.shopping) && parsed.preferences) return parsed;
      }
    } catch (error) { console.warn('HomeRelay could not load saved data; restoring demo data.', error); }
    const initial = baseState();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch (e) { /* private browsing may block storage */ }
    return initial;
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast('Storage unavailable', 'Your browser may block local storage. Changes may not survive a refresh.', 'warning'); }
  }
  function resetState() { state = baseState(); currentPlan = null; lightingChoice = state.preferences.lighting; saveState(); renderAll(); fillPreferences(); showToast('Demo data restored', 'The original sample tasks and shopping list are back.'); }
  function showToast(title, message, type='success') {
    const container = $('#toastContainer');
    const toast = document.createElement('div'); toast.className = 'toast';
    const mark = type === 'warning' ? '!' : '✓';
    toast.innerHTML = `<span class="toast-mark">${mark}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
    container.appendChild(toast);
    window.setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(5px)'; window.setTimeout(()=>toast.remove(),220); }, 3900);
  }
  function setView(view) {
    const valid = ['overview','ledger','shopping','routines','preferences'];
    if (!valid.includes(view)) return;
    activeView = view;
    $$('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    const labels = {overview:'Overview',ledger:'Promise Ledger',shopping:'Shopping list',routines:'Routines',preferences:'Preferences'};
    $('#breadcrumbPage').textContent = labels[view];
    $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.remove('visible');
    window.scrollTo({top:0,behavior:'smooth'});
    if (view === 'ledger') renderLedger();
    if (view === 'shopping') renderShopping();
    if (view === 'routines') renderRoutineLog();
  }
  function applyNavActions() {
    $$('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
    $('#openSidebar').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#sidebarScrim').classList.add('visible'); });
    $('#closeSidebar').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.remove('visible'); });
    $('#sidebarScrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.remove('visible'); });
    $('#dismissNotice').addEventListener('click', () => $('.simulation-note').classList.add('hidden'));
    $('#focusSearch').addEventListener('click', () => { setView('ledger'); $('#ledgerSearch').focus(); });
  }
  function statusClass(status) { return status.toLowerCase().replaceAll(' ','-'); }
  function ownerClass(owner) { return owner.toLowerCase().replaceAll(' ','-'); }
  function ownerInitial(owner) { return owner === 'Unassigned' ? '?' : owner === 'Family' ? 'F' : owner.charAt(0).toUpperCase(); }
  function getSortedTasks(tasks) {
    return tasks.slice().sort((a,b) => {
      const order = {'Awaiting confirmation':0,'In progress':1,'Planned':2,'Completed':3};
      if (order[a.status] !== order[b.status]) return order[a.status]-order[b.status];
      const dateA = `${a.dueDate || '9999-99-99'} ${a.dueTime || '99:99'}`;
      const dateB = `${b.dueDate || '9999-99-99'} ${b.dueTime || '99:99'}`;
      return dateA.localeCompare(dateB);
    });
  }
  function updateMetrics() {
    const tasks = state.tasks;
    const open = tasks.filter(t=>t.status!=='Completed').length;
    const awaiting = tasks.filter(t=>t.status==='Awaiting confirmation').length;
    const done = tasks.filter(t=>t.status==='Completed' && t.dueDate===todayISO()).length;
    $('#metricOpen').textContent=fmtNum(open); $('#metricAwaiting').textContent=fmtNum(awaiting); $('#metricCompleted').textContent=fmtNum(done);
    $('#metricOpenCaption').textContent = open===1 ? 'One commitment to follow through' : 'Across your household';
    $('#navOpenCount').textContent = String(open);
    $('#ledgerTotal').textContent=fmtNum(tasks.length); $('#ledgerPending').textContent=fmtNum(tasks.filter(t=>t.status!=='Completed').length); $('#ledgerDone').textContent=fmtNum(tasks.filter(t=>t.status==='Completed').length);
    const total = tasks.length || 0; const completed=tasks.filter(t=>t.status==='Completed').length; const percent=total?Math.round(completed/total*100):0;
    $('#pulsePercentage').textContent=`${percent}%`; $('#pulseBar').style.width=`${percent}%`; $('#pulseDone').textContent=completed;
  }
  function renderOverviewTasks() {
    const host=$('#overviewTaskList'); const tasks=getSortedTasks(state.tasks).filter(t=>t.status!=='Completed').slice(0,4);
    if (!tasks.length) { host.innerHTML='<div class="empty-state"><span>✳</span><h3>Nothing waiting on you</h3><p>Make a new commitment whenever you need to.</p></div>'; return; }
    host.innerHTML=tasks.map(task=>`<div class="compact-task"><button class="task-check" data-complete="${task.id}" aria-label="Confirm completion for ${escapeHtml(task.title)}" title="Confirm completion">✓</button><div class="compact-task-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.owner)} · ${escapeHtml(task.category)}</small></div><div class="compact-task-right"><span class="due-label">${escapeHtml(dueDisplay(task))}</span><span class="status-badge status-${statusClass(task.status)}">${escapeHtml(task.status)}</span></div></div>`).join('');
  }
  function renderTimeline() {
    const tasks=getSortedTasks(state.tasks).filter(t=>t.status!=='Completed').slice(0,4);
    const host=$('#timelineList');
    if(!tasks.length){host.innerHTML='<div class="empty-state"><p>Your day is clear. Enjoy the breathing room.</p></div>';return;}
    host.innerHTML=tasks.map((task,index)=>`<div class="timeline-item"><div class="timeline-time">${escapeHtml(task.dueDate===todayISO()?'Today':dateDisplay(task.dueDate))}<br>${escapeHtml(task.dueTime?timeDisplay(task.dueTime):'Anytime')}</div><div class="timeline-track"><span class="timeline-point ${index===1?'peach':index===2?'lilac':''}"></span></div><div class="timeline-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.owner)} · ${escapeHtml(task.status)}</small></div></div>`).join('');
  }
  function renderLedger() {
    const search=($('#ledgerSearch').value||'').toLowerCase().trim();
    const status=$('#statusFilter').value; const category=$('#categoryFilter').value;
    const tasks=getSortedTasks(state.tasks).filter(t=>(status==='all'||t.status===status)&&(category==='all'||t.category===category)&&(!search||`${t.title} ${t.owner} ${t.category} ${t.status} ${t.source||''}`.toLowerCase().includes(search)));
    const body=$('#ledgerTableBody'); $('#ledgerEmpty').classList.toggle('hidden',tasks.length>0); $('.ledger-table-wrap').classList.toggle('hidden',tasks.length===0);
    body.innerHTML=tasks.map(task=>`<tr><td><div class="ledger-task"><div class="ledger-task-icon ${task.category.toLowerCase()}">${icons[task.category]||'☷'}</div><div class="ledger-task-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.category)} · ${escapeHtml(task.source||'Added manually')}</small></div></div></td><td><div class="owner-cell"><span class="owner-avatar ${ownerClass(task.owner)}">${ownerInitial(task.owner)}</span>${escapeHtml(task.owner)}</div></td><td><div class="due-cell"><strong>${escapeHtml(dateDisplay(task.dueDate))}</strong><small>${escapeHtml(task.dueTime?timeDisplay(task.dueTime):'Any time')}</small></div></td><td><span class="status-badge status-${statusClass(task.status)}">${escapeHtml(task.status)}</span></td><td><div class="row-actions">${task.status!=='Completed'?`<button class="tiny-icon-btn complete" data-complete="${task.id}" title="Confirm completion" aria-label="Confirm completion for ${escapeHtml(task.title)}">✓</button>`:''}<button class="tiny-icon-btn" data-edit-task="${task.id}" title="Edit commitment" aria-label="Edit ${escapeHtml(task.title)}">✎</button><button class="tiny-icon-btn" data-delete-task="${task.id}" title="Delete commitment" aria-label="Delete ${escapeHtml(task.title)}">×</button></div></td></tr>`).join('');
    $('#ledgerShowing').textContent=`Showing ${tasks.length} of ${state.tasks.length} commitment${state.tasks.length===1?'':'s'}`;
    updateMetrics();
  }
  function renderShopping() {
    const host=$('#shoppingList'); const list=state.shopping.slice(); const purchased=list.filter(i=>i.purchased).length; const all=list.length;
    $('#shoppingCount').textContent=all?`${all-purchased} item${all-purchased===1?'':'s'} left to pick up.`:'Your list is clear. Add something you need.';
    $('#shoppingEmpty').classList.toggle('hidden',all>0); host.classList.toggle('hidden',all===0);
    host.innerHTML=list.map(item=>`<div class="shopping-item ${item.purchased?'purchased':''}"><button class="shopping-check ${item.purchased?'checked':''}" data-toggle-shopping="${item.id}" aria-label="${item.purchased?'Mark '+escapeHtml(item.name)+' not purchased':'Mark '+escapeHtml(item.name)+' purchased'}">✓</button><div class="shopping-item-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.addedBy||'Household list')}</small></div><button class="shopping-item-delete" data-delete-shopping="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join('');
    $('#shoppingProgressText').textContent=`${purchased} of ${all} picked up`; $('#shoppingProgressBar').style.width=`${all?Math.round(purchased/all*100):0}%`;
  }
  function renderRoutines() {
    const host=$('#routineGrid');
    host.innerHTML=routineData.map(r=>`<article class="routine-card"><div class="routine-card-top"><div class="routine-card-icon">${r.icon}</div><span class="routine-status">${r.tag}</span></div><h3>${r.name}</h3><p>${r.description}</p><div class="routine-steps">${r.steps.slice(0,3).map((s,i)=>`<div class="routine-step"><span>${i+1}</span>${escapeHtml(s)}</div>`).join('')}<div class="routine-step"><span>+</span>${r.steps.length>3?`${r.steps.length-3} more steps`:'Clear finish state'}</div></div><button class="btn btn-secondary" data-run-routine="${r.id}">▶ Run simulation</button></article>`).join('');
  }
  function renderRoutineLog() {
    const host=$('#routineLog'); const entries=state.routineLog||[];
    if(!entries.length){host.innerHTML='<div class="empty-log">Run a routine to see its steps here.</div>';return;}
    host.innerHTML=entries.slice().reverse().map(entry=>`<div class="log-entry"><div class="log-entry-icon">✓</div><div class="log-entry-copy"><strong>${escapeHtml(entry.name)} · Simulation complete</strong><p>${escapeHtml(entry.steps.join(' · '))}<br/>No physical devices were controlled.</p></div><time>${escapeHtml(entry.time)}</time></div>`).join('');
  }
  function renderAll() {
    $('#sidebarHomeName').textContent=state.preferences.householdName || 'My Home';
    const now=new Date(); $('#overviewDate').textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
    $('#timelineDay').textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase();
    updateMetrics(); renderOverviewTasks(); renderTimeline(); renderLedger(); renderShopping(); renderRoutines(); renderRoutineLog();
    if (activeView==='preferences') fillPreferences();
  }
  function parseRequest(text) {
    const lower=text.toLowerCase(); const tasks=[]; const shopping=[]; const today=todayISO();
    const hasGuest=/guest|friend|visitor|people coming|arrive/.test(lower);
    const hasSnack=/snack|grocer|shopping|buy |pick up|get /.test(lower);
    const mentionRavi=/ravi/.test(lower);
    const defaultOwner=state.preferences.defaultOwner||'You';
    const guestTime=(lower.match(/(?:at|by|before)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)||[]);
    let arriveTime='19:00';
    if(guestTime[1]){let h=Number(guestTime[1]);const suffix=(guestTime[3]||'').toLowerCase();if(suffix==='pm'&&h<12)h+=12;if(suffix==='am'&&h===12)h=0;arriveTime=`${String(h).padStart(2,'0')}:${guestTime[2]||'00'}`;}
    const setDue=(time)=>({dueDate:today,dueTime:time});
    if(hasGuest){
      if(/snack|refreshment|food|grocery/.test(lower)||/ask .* to get/.test(lower)||hasSnack){tasks.push({title:'Pick up snacks and refreshments',owner:mentionRavi?'Ravi':defaultOwner,category:'Shopping',...setDue('18:00'),note:'Shopping item requested as part of the guest-arrival plan.',items:['Snacks','Drinks']});shopping.push('Snacks','Drinks');}
      const guestRoomTime=(lower.match(/guest room.{0,35}?(?:at|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)||lower.match(/(?:at|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?.{0,35}?guest room/i)||[]);
      let roomTime='18:15'; if(guestRoomTime[1]){let h=Number(guestRoomTime[1]);const ap=(guestRoomTime[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;roomTime=`${String(h).padStart(2,'0')}:${guestRoomTime[2]||'00'}`;}
      tasks.push({title:'Prepare the guest room',owner:defaultOwner,category:'Home',...setDue(roomTime),note:'Fresh sheets, water, and a quick tidy before arrival.'});
      tasks.push({title:'Reset the living room',owner:defaultOwner,category:'Home',...setDue(beforeTime(arriveTime,15)),note:'Clear surfaces and make the seating area welcoming.'});
      tasks.push({title:'Guest arrival reminder',owner:defaultOwner,category:'Reminder',...setDue(beforeTime(arriveTime,30)),note:'A reminder is tracked in this app; no external notification will be sent.'});
    } else if (/grocer|shopping|buy |pick up|get /.test(lower)) {
      const known=['milk','bread','fruit','snacks','eggs','coffee','tea','rice','pasta','soap','dish soap','flowers','vegetables'];
      const found=known.filter(item=>lower.includes(item));
      const items=found.length?found:['Shopping items']; shopping.push(...items.map(s=>cap(s)));
      tasks.push({title:`Pick up ${items.slice(0,3).join(', ')}${items.length>3?' and more':''}`,owner:mentionRavi?'Ravi':defaultOwner,category:'Shopping',...setDue('18:00'),note:'Shopping request converted into a tracked commitment.',items:items.map(cap)});
      if(/remind|reminder/.test(lower))tasks.push({title:'Shopping trip reminder',owner:defaultOwner,category:'Reminder',...setDue('17:30'),note:'Reminder stored in the HomeRelay demo only.'});
    } else if (/quiet evening|wind down|relax|lights?/.test(lower)) {
      tasks.push({title:'Tidy the living room',owner:defaultOwner,category:'Home',...setDue('19:00'),note:'A quick reset for a calmer evening.'});
      tasks.push({title:'Set up a quiet-evening routine',owner:defaultOwner,category:'Routine',...setDue('19:30'),note:'Routine will be simulated; no lights are controlled.'});
      tasks.push({title:'Evening reminder',owner:defaultOwner,category:'Reminder',...setDue('20:00'),note:'Tracked inside HomeRelay only.'});
    } else {
      const clean=lower.match(/(?:clean|tidy|prepare|finish|do|complete|remember to)\s+(.{4,70})/);
      if(clean) tasks.push({title:cap(clean[1].replace(/[.!?].*$/,'').trim()),owner:defaultOwner,category:/remind|remember/.test(lower)?'Reminder':'Home',...setDue('18:00'),note:'Proposed from your request. Review details before approving.'});
    }
    if(!tasks.length) return null;
    return {id:id(),request:text,createdAt:new Date().toISOString(),tasks:tasks.map((t,i)=>({...t,id:`proposal-${i}-${id()}`,status:'Planned',source:'HomeRelay plan'})),shopping:Array.from(new Set(shopping)),summary:hasGuest?'A guest-arrival plan with household prep, shopping, and a reminder.':'A lightweight plan based on your request.'};
  }
  function beforeTime(time, minutes) {const [h,m]=time.split(':').map(Number);const d=new Date();d.setHours(h,m-minutes,0,0);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  function cap(s){return String(s).replace(/\b\w/g,c=>c.toUpperCase());}
  function renderPlan(plan) {
    const host=$('#planArea'); host.classList.remove('hidden');
    host.innerHTML=`<div class="plan-heading"><div><h3>Here's a plan to review</h3><p>${escapeHtml(plan.summary)} Nothing is added until you approve it.</p></div><span class="plan-label">${plan.tasks.length} ACTIONS</span></div><div class="plan-action-list">${plan.tasks.map((t,i)=>`<div class="plan-action"><span class="plan-action-check">${i+1}</span><div class="plan-action-copy"><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml(t.note)}</p><div class="plan-meta"><span>♙ ${escapeHtml(t.owner)}</span><span>◷ ${escapeHtml(dateDisplay(t.dueDate))}, ${escapeHtml(timeDisplay(t.dueTime))}</span><span>${escapeHtml(t.category)}</span></div></div></div>`).join('')}</div>${plan.shopping.length?`<p class="plan-disclaimer" style="margin-top:10px">Shopping items to add: ${plan.shopping.map(escapeHtml).join(', ')}</p>`:''}<div class="plan-actions-footer"><span class="plan-disclaimer">Review first. Actions are simulated and remain in this app.</span><div style="display:flex;gap:7px"><button class="btn btn-secondary btn-sm" id="discardPlan">Discard</button><button class="btn btn-primary btn-sm" id="approvePlan">✓ Approve plan</button></div></div>`;
    $('#approvePlan').addEventListener('click',approvePlan); $('#discardPlan').addEventListener('click',()=>{currentPlan=null;host.classList.add('hidden');host.innerHTML='';showToast('Plan discarded','No tasks were added to the ledger.');});
  }
  function approvePlan() {
    if(!currentPlan) return;
    const plan=currentPlan;
    plan.tasks.forEach(task=>state.tasks.unshift({...task,id:id(),source:'Approved HomeRelay plan',status:'Planned'}));
    plan.shopping.forEach(name=>{if(!state.shopping.some(item=>item.name.toLowerCase()===name.toLowerCase()&&!item.purchased))state.shopping.unshift({id:id(),name,purchased:false,addedBy:'Approved HomeRelay plan'});});
    saveState();currentPlan=null;$('#planArea').classList.add('hidden');$('#planArea').innerHTML='';$('#requestInput').value='';renderAll();showToast('Plan approved',`${plan.tasks.length} commitments added. ${plan.shopping.length?plan.shopping.length+' shopping items added.':'No shopping items needed.'}`);setView('ledger');
  }
  function submitRequest(e) {
    e.preventDefault();const text=$('#requestInput').value.trim();if(!text){showToast('Add a request first','Describe what needs to happen, or choose one of the examples.','warning');$('#requestInput').focus();return;}
    const plan=parseRequest(text); if(!plan){const host=$('#planArea');host.classList.remove('hidden');host.innerHTML='<div class="plan-heading"><div><h3>Let’s make that more specific</h3><p>Try mentioning a task, an owner, a shopping item, or a time. You can also add a commitment manually.</p></div></div><button class="btn btn-secondary btn-sm" id="manualTaskFromPlan">＋ Create task manually</button>';$('#manualTaskFromPlan').addEventListener('click',()=>openTaskModal());showToast('One more detail needed','This local demo planner could not identify clear actions.');return;}
    currentPlan=plan;renderPlan(plan);
  }
  function openTaskModal(task=null) {
    const backdrop=$('#taskModalBackdrop'); backdrop.classList.remove('hidden');
    $('#taskForm').reset(); $('#taskId').value=task?task.id:''; $('#taskModalTitle').textContent=task?'Edit commitment':'Add a commitment'; $('#saveTaskBtn').textContent=task?'Save changes':'Save commitment';
    $('#taskTitle').value=task?task.title:''; $('#taskOwner').value=task?task.owner:(state.preferences.defaultOwner||'You'); $('#taskCategory').value=task?task.category:'Home'; $('#taskDueDate').value=task?task.dueDate:todayISO(); $('#taskDueTime').value=task?task.dueTime:'18:00'; $('#taskStatus').value=task?task.status:'Planned';
    window.setTimeout(()=>$('#taskTitle').focus(),30);
  }
  function closeTaskModal() {$('#taskModalBackdrop').classList.add('hidden');}
  function saveTask(e) {
    e.preventDefault();const taskId=$('#taskId').value;const data={title:$('#taskTitle').value.trim(),owner:$('#taskOwner').value,category:$('#taskCategory').value,dueDate:$('#taskDueDate').value,dueTime:$('#taskDueTime').value,status:$('#taskStatus').value,note:'',source:'Added manually'};
    if(!data.title){showToast('A title is required','Give the commitment a clear name.','warning');return;}
    if(data.status==='Completed' && (!taskId || state.tasks.find(t=>t.id===taskId)?.status!=='Completed')) {if(!window.confirm('Confirm that this commitment is actually complete?')) return;}
    if(taskId){state.tasks=state.tasks.map(t=>t.id===taskId?{...t,...data}:t);showToast('Commitment updated','Your changes have been saved.');}else{state.tasks.unshift({...data,id:id()});showToast('Commitment added','It is now in the Promise Ledger.');}
    saveState();closeTaskModal();renderAll();if(activeView==='ledger')renderLedger();
  }
  function confirmComplete(taskId) {
    const task=state.tasks.find(t=>t.id===taskId);if(!task||task.status==='Completed')return;
    const ok=window.confirm(`Confirm “${task.title}” is actually complete? HomeRelay will record it as completed only after you confirm.`);
    if(!ok)return;task.status='Completed';task.completedAt=new Date().toISOString();saveState();renderAll();showToast('Completion confirmed','The Promise Ledger now records this commitment as completed.');
  }
  function editTask(taskId) {const task=state.tasks.find(t=>t.id===taskId);if(task)openTaskModal(task);}
  function deleteTask(taskId) {const task=state.tasks.find(t=>t.id===taskId);if(!task)return;if(!window.confirm(`Delete “${task.title}” from the Promise Ledger?`))return;state.tasks=state.tasks.filter(t=>t.id!==taskId);saveState();renderAll();showToast('Commitment deleted','The task was removed from your ledger.');}
  function addShoppingItem(e) {e.preventDefault();const input=$('#shoppingInput');const name=input.value.trim();if(!name)return;if(state.shopping.some(i=>i.name.toLowerCase()===name.toLowerCase()&&!i.purchased)){showToast('Already on the list',`${name} is already waiting to be picked up.`,'warning');return;}state.shopping.unshift({id:id(),name:cap(name),purchased:false,addedBy:'Added manually'});input.value='';saveState();renderShopping();showToast('Added to shopping list',`${cap(name)} is ready for the next trip.`);}
  function toggleShopping(itemId) {const item=state.shopping.find(i=>i.id===itemId);if(!item)return;item.purchased=!item.purchased;saveState();renderShopping();showToast(item.purchased?'Picked up':'Back on the list',item.purchased?`${item.name} marked as purchased.`:`${item.name} marked as not purchased.`);}
  function deleteShopping(itemId) {const item=state.shopping.find(i=>i.id===itemId);if(!item)return;state.shopping=state.shopping.filter(i=>i.id!==itemId);saveState();renderShopping();showToast('Item removed',`${item.name} removed from the shopping list.`);}
  function runRoutine(routineId) {const r=routineData.find(item=>item.id===routineId);if(!r)return;const now=new Date();const entry={id:id(),name:r.name,steps:r.steps.slice(),time:now.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}),createdAt:now.toISOString()};state.routineLog.push(entry);saveState();renderRoutineLog();showToast(`${r.name} simulation finished`,`${r.steps.length} simulated steps logged. No devices were controlled.`);}
  function fillPreferences() {const p=state.preferences;$('#householdName').value=p.householdName||'';$('#defaultOwner').value=p.defaultOwner||'You';$('#quietStart').value=p.quietStart||'21:30';$('#quietEnd').value=p.quietEnd||'07:00';lightingChoice=p.lighting||'Warm and soft';$$('[data-lighting]').forEach(b=>b.classList.toggle('active',b.dataset.lighting===lightingChoice));$('#prefSaveHint').textContent='Your preferences are stored in this browser.';}
  function savePreferences(e) {e.preventDefault();state.preferences={...state.preferences,householdName:$('#householdName').value.trim()||'My Home',defaultOwner:$('#defaultOwner').value,quietStart:$('#quietStart').value,quietEnd:$('#quietEnd').value,lighting:lightingChoice};saveState();renderAll();showToast('Preferences saved','HomeRelay has updated your workspace defaults.');$('#prefSaveHint').textContent='Saved just now.';}
  function bindEvents() {
    applyNavActions();
    $('#requestForm').addEventListener('submit',submitRequest);
    $$('.prompt-chip').forEach(btn=>btn.addEventListener('click',()=>{$('#requestInput').value=btn.dataset.prompt;$('#requestInput').focus();}));
    $('#newTaskTop').addEventListener('click',()=>openTaskModal());$('#newTaskLedger').addEventListener('click',()=>openTaskModal());
    $('#closeTaskModal').addEventListener('click',closeTaskModal);$('#cancelTaskModal').addEventListener('click',closeTaskModal);$('#taskModalBackdrop').addEventListener('click',e=>{if(e.target===$('#taskModalBackdrop'))closeTaskModal();});$('#taskForm').addEventListener('submit',saveTask);
    $('#ledgerSearch').addEventListener('input',renderLedger);$('#statusFilter').addEventListener('change',renderLedger);$('#categoryFilter').addEventListener('change',renderLedger);$('#clearFilters').addEventListener('click',()=>{$('#ledgerSearch').value='';$('#statusFilter').value='all';$('#categoryFilter').value='all';renderLedger();});
    $('#shoppingForm').addEventListener('submit',addShoppingItem);$('#clearPurchased').addEventListener('click',()=>{const n=state.shopping.filter(i=>i.purchased).length;if(!n){showToast('Nothing to clear','No purchased items are on the list.','warning');return;}if(!window.confirm(`Remove ${n} purchased item${n===1?'':'s'} from the list?`))return;state.shopping=state.shopping.filter(i=>!i.purchased);saveState();renderShopping();showToast('Purchased items cleared',`${n} item${n===1?'':'s'} removed.`);});
    $('#clearRoutineLog').addEventListener('click',()=>{if(!state.routineLog.length){showToast('Log is already clear','Run a routine to start a new log.','warning');return;}if(!window.confirm('Clear the routine simulation log?'))return;state.routineLog=[];saveState();renderRoutineLog();showToast('Simulation log cleared','Your routines are unchanged.');});
    $('#preferencesForm').addEventListener('submit',savePreferences);$$('[data-lighting]').forEach(btn=>btn.addEventListener('click',()=>{lightingChoice=btn.dataset.lighting;$$('[data-lighting]').forEach(b=>b.classList.toggle('active',b===btn));}));
    $('#resetDemo').addEventListener('click',()=>{if(window.confirm('Reset HomeRelay AI to its original demo data? Your current tasks, shopping changes, routine log, and preferences will be replaced.'))resetState();});
    document.addEventListener('click',e=>{
      const complete=e.target.closest('[data-complete]');if(complete){confirmComplete(complete.dataset.complete);return;}
      const edit=e.target.closest('[data-edit-task]');if(edit){editTask(edit.dataset.editTask);return;}
      const del=e.target.closest('[data-delete-task]');if(del){deleteTask(del.dataset.deleteTask);return;}
      const shop=e.target.closest('[data-toggle-shopping]');if(shop){toggleShopping(shop.dataset.toggleShopping);return;}
      const shopDel=e.target.closest('[data-delete-shopping]');if(shopDel){deleteShopping(shopDel.dataset.deleteShopping);return;}
      const routine=e.target.closest('[data-run-routine]');if(routine){runRoutine(routine.dataset.runRoutine);return;}
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#taskModalBackdrop').classList.contains('hidden'))closeTaskModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setView('ledger');$('#ledgerSearch').focus();}});
  }
  function init() {
    bindEvents();fillPreferences();renderAll();
    const params=new URLSearchParams(location.search);if(params.get('example')==='guest'){$('#requestInput').value=$('.prompt-chip').dataset.prompt;}
  }
  init();
})();
